import { type LocalSaveReceipt, saveReceiptMessage } from "../../shared/localSaveReceipt";
import { sameDraft } from "../../shared/editGuard";
import { useCallback, useEffect, useRef, useState, type SubmitEvent } from "react";
import type {
  EntryCreateDraft,
  EntryCreateRequest,
  EntryStatus,
  EntryUpdateDraft,
  MenuEntryDetail,
  MenuRepository,
} from "../../application/catalog";
import { invalidateCatalogEntries } from "../../application/catalogCache";
import { isStrongEntryVersion } from "../../application/entryVersion";
import {
  OperationRetryBlockedError,
  PreSendStorageError,
  createOperationAttemptController,
  getOrCreateTabId,
  sealJsonPayload,
  type OperationExecutionResult,
  type OperationAttemptController,
  type OperationFlowScope,
  type PendingOperationStorageAdapter,
} from "../../application/operationAttempt";
import { analyzeIdempotentAttemptError } from "../../api/idempotencyResponse";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import {
  clearFieldFailure,
  entryFailure,
  localFieldFailure,
  type EntryFailure,
  type EntryField,
} from "./entryError";
import { validateEntryImage } from "./entryImage";
import { useEntryResources } from "./useEntryResources";

export function buildEntryCreateScope(): OperationFlowScope {
  return {
    tabId: getOrCreateTabId(),
    formKind: "entry-form",
    resourceKey: "entry-create",
  };
}

interface EntryCreationDraft extends EntryCreateDraft { imageFile?: File | null }

export type Stage = "idle" | "upload" | "persist";
const emptyDraft: EntryUpdateDraft = {
  brandName: "",
  description: "",
  categoryIds: [],
  status: "INACTIVE",
};

function compareCategoryIds(left: string, right: string): number {
  const localizedOrder = left.localeCompare(right);
  if (localizedOrder !== 0) return localizedOrder;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function draftFrom(entry: MenuEntryDetail): EntryUpdateDraft {
  return {
    brandName: entry.brandName,
    description: entry.description,
    categoryIds: [...entry.categoryIds],
    status: entry.status,
  };
}

function validateDraft(
  draft: EntryUpdateDraft,
  editing: boolean,
  file: File | null,
  imageError: string,
  imagePending: boolean,
): EntryFailure | null {
  if (!draft.brandName.trim())
    return localFieldFailure("brandName", "Indica el nombre comercial de la entrada.");
  if (!draft.description.trim())
    return localFieldFailure("description", "Indica una descripción para la entrada.");
  if (!editing && !file)
    return localFieldFailure(
      "image",
      "Selecciona una imagen de referencia para la nueva entrada.",
    );
  if (imageError) return localFieldFailure("image", imageError);
  if (imagePending)
    return localFieldFailure("image", "Espera a que termine la validación de la imagen.");
  return null;
}

export type EntryFormRepository = Pick<
  MenuRepository,
  "listCategories" | "getEntry" | "uploadEntryImage" | "createEntry" | "updateEntry"
>;

export function useEntryForm(
  repository: EntryFormRepository,
  routeEntryId: string | undefined,
  onSaved: (receipt: LocalSaveReceipt) => Promise<void>,
  providedStorage?: PendingOperationStorageAdapter,
) {
  const [fallbackStorage] = useState(createIndexedDbPendingOperationStorage);
  const storage = providedStorage ?? fallbackStorage;
  const [confirmedEntryId, setConfirmedEntryId] = useState<string>();
  const entryId = routeEntryId ?? confirmedEntryId;
  const [infoNotice, setInfoNotice] = useState("");
  const [draft, setDraft] = useState<EntryUpdateDraft>(emptyDraft);
  const baseDraft = useRef<EntryUpdateDraft>(emptyDraft);
  const baseFile = useRef<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<File | null>(null);
  fileRef.current = file;
  const [imageError, setImageError] = useState("");
  const [imageValidating, setImageValidating] = useState(false);
  const [failure, setFailure] = useState<EntryFailure | null>(null);
  const [failureEpoch, setFailureEpoch] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [uncertain, setUncertain] = useState<Stage>("idle");
  const [review, setReview] = useState<MenuEntryDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const loaded = useRef(false);
  const mounted = useRef(true);
  const saving = useRef(false);
  const saveSucceeded = useRef(false);
  const confirmedReceipt = useRef<LocalSaveReceipt | null>(null);
  const [navigationFailed, setNavigationFailed] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(Boolean(routeEntryId));
  const [recoveryRetry, setRecoveryRetry] = useState(0);
  const userEdited = useRef(false);
  const validationRun = useRef(0);
  const validationPending = useRef(false);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  const uploadIdempotencyKeyRef = useRef<string | null>(null);
  const reviewController = useRef<AbortController | null>(null);
  const lastRawErrorRef = useRef<unknown>(null);
  const controllerRef = useRef<OperationAttemptController<
    EntryCreationDraft,
    MenuEntryDetail
  > | null>(null);

  const onLoaded = useCallback((entry: MenuEntryDetail) => {
    if (!loaded.current) {
      baseDraft.current = draftFrom(entry);
      setDraft(draftFrom(entry));
      loaded.current = true;
    }
  }, []);
  const resources = useEntryResources(repository, routeEntryId, onLoaded);

  function getOrInitController(
    overrideFile?: File | null,
  ): OperationAttemptController<EntryCreationDraft, MenuEntryDetail> {
    if (overrideFile !== undefined) fileRef.current = overrideFile;
    controllerRef.current ??= createOperationAttemptController<
        EntryCreationDraft,
        MenuEntryDetail
      >({
        scope: buildEntryCreateScope(),
        storage,
        retainConfirmedResult: true,
        initialDraft: {
          brandName: draft.brandName.trim(),
          description: draft.description.trim(),
          categoryIds: [...draft.categoryIds],
          imageFile: fileRef.current,
        },
        getImageFile: () => fileRef.current,
        executeImageUpload: async (attempt) => {
          if (attempt.payload.kind !== "multipart-file") throw new Error("Se requiere una imagen sellada.");
          const p = attempt.payload;
          try {
            const id = await repository.uploadEntryImage(new File([p.fileBlob], p.fileName, { type: p.mimeType }), attempt.idempotencyKey);
            if (mounted.current) setStage("persist");
            return { id };
          } catch (err) { lastRawErrorRef.current = err; throw err; }
        },
        buildFinalStageInput: ({
          draft: currentDraft,
          confirmedImageId,
          submittedDraftVersion,
          now,
        }) => ({
          operationKind: "entry.create",
          method: "POST",
          endpointPath: "/menu/entries",
          payload: sealJsonPayload({
            brandName: currentDraft.brandName.trim(),
            description: currentDraft.description.trim(),
            categoryIds: currentDraft.categoryIds,
            imageId: confirmedImageId!,
          }),
          submittedDraftVersion,
          now,
        }),
        executeFinalStage: async ({ attempt }) => {
          if (attempt.payload.kind !== "json") {
            throw new Error("El intento de entrada requiere un payload JSON sellado.");
          }
          const sealedDraft = attempt.payload.payloadSnapshot as EntryCreateRequest;
          try {
            return await repository.createEntry(sealedDraft, attempt.idempotencyKey);
          } catch (err) {
            lastRawErrorRef.current = err;
            throw err;
          }
        },
        classifyError: (err, attempt) =>
          analyzeIdempotentAttemptError(err, attempt.operationKind),
      });
    return controllerRef.current;
  }

  useEffect(() => {
    mounted.current = true;

    if (!routeEntryId) {
      setRecoveryReady(false);
      const controller = getOrInitController();
      void controller
        .restoreFromStorage()
        .then((restored) => {
          if (!mounted.current || controllerRef.current !== controller) return;
          setRecoveryReady(true);
          if (!restored) return;
          const currentStage = restored.stages[restored.currentStageIndex];
          if (!currentStage) return;

          if (!userEdited.current) {
            setDraft({
              brandName: restored.editableDraft.brandName,
              description: restored.editableDraft.description,
              categoryIds: [...restored.editableDraft.categoryIds],
              status: "INACTIVE",
            });
          }

          if (restored.editableDraft.imageFile) {
            const f = restored.editableDraft.imageFile;
            const restoredFile = f;
            setFile(restoredFile);
            fileRef.current = restoredFile;
            if (restored.confirmedImageId && f === restored.submittedDraft?.imageFile) {
              uploaded.current = { file: restoredFile, id: restored.confirmedImageId };
            }
          } else if (restored.stages[0]?.payload.kind === "multipart-file") {
            const p = restored.stages[0].payload;
            const restoredFile = new File([p.fileBlob], p.fileName, {
              type: p.mimeType,
            });
            setFile(restoredFile);
            if (restored.confirmedImageId) {
              uploaded.current = { file: restoredFile, id: restored.confirmedImageId };
            }
          }

          if (
            currentStage.status === "uncertain" ||
            currentStage.status === "conflict_in_progress"
          ) {
            setUncertain(restored.currentStageIndex === 0 ? "upload" : "persist");
          }

          if (currentStage.lastErrorMessage) {
            setFailure(entryFailure(currentStage.lastErrorMessage));
          }
          if (currentStage.status === "succeeded" && restored.confirmedResult) {
            const confirmed = restored.confirmedResult as MenuEntryDetail;
            baseDraft.current = draftFrom(confirmed);
            baseFile.current = restored.submittedDraft?.imageFile ?? null;
            loaded.current = true;
            setConfirmedEntryId(confirmed.id);
            resources.setEntry(confirmed);
            if (restored.currentDraftVersion === restored.submittedDraftVersion) {
              saveSucceeded.current = true;
              confirmedReceipt.current = { receiptId: currentStage.idempotencyKey, entity: "entry", entityId: confirmed.id, label: confirmed.brandName, action: "created" };
              setInfoNotice(saveReceiptMessage(confirmedReceipt.current));
              setNavigationFailed(true);
              return;
            }
            setInfoNotice("La entrada ya fue creada. Conservamos el borrador posterior; revisa la versión actual antes de guardar los cambios.");
            if (!isStrongEntryVersion(confirmed.etag)) setFailure(entryFailure(new Error("Revisa la versión de la entrada confirmada antes de guardar.")));
          }
        })
        .catch(() => { if (mounted.current && controllerRef.current === controller) setFailure(entryFailure(new Error("No pudimos comprobar el envío anterior. Reintenta la recuperación antes de guardar."))); });
    }

    return () => {
      mounted.current = false;
      validationRun.current += 1;
      reviewController.current?.abort();
      controllerRef.current?.detachForReload();
      // A subsequent effect setup needs a live controller, including StrictMode.
      controllerRef.current = null;
    };
  }, [routeEntryId, recoveryRetry]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!saveSucceeded.current && confirmedEntryId && controller?.getRecord()) {
      void controller.updateEditableDraft({ ...draft, imageFile: file });
    }
  }, [confirmedEntryId, draft, file]);

  function clearField(field: EntryField) {
    setFailure((current) => clearFieldFailure(current, field));
  }

  function changeText(field: "brandName" | "description", value: string) {
    userEdited.current = true;
    setDraft((current) => {
      const updated = { ...current, [field]: value };
      if (!entryId) {
        const controller = getOrInitController();
        void controller
          .updateEditableDraft({
            brandName: updated.brandName,
            description: updated.description,
            categoryIds: updated.categoryIds,
            imageFile: fileRef.current,
          })
          .catch(() => {});
      }
      return updated;
    });
    clearField(field);
  }

  function changeCategories(categoryIds: string[]) {
    userEdited.current = true;
    const unique = [...new Set(categoryIds)];
    setDraft((current) => {
      const updated = { ...current, categoryIds: unique };
      if (!entryId) {
        const controller = getOrInitController();
        void controller
          .updateEditableDraft({
            brandName: updated.brandName,
            description: updated.description,
            categoryIds: updated.categoryIds,
            imageFile: fileRef.current,
          })
          .catch(() => {});
      }
      return updated;
    });
    clearField("categoryIds");
  }

  function changeStatus(status: EntryStatus) {
    userEdited.current = true;
    setDraft((current) => ({ ...current, status }));
    clearField("status");
  }

  async function selectImage(selected: File) {
    if (saving.current) return;
    const run = ++validationRun.current;
    uploaded.current = null;
    uploadIdempotencyKeyRef.current = null;
    setFile(selected);
    setImageError("");
    clearField("image");

    if (!entryId) {
      const controller = getOrInitController(selected);
      const current = controller.getRecord()?.editableDraft;
      void controller.updateEditableDraft({ ...(current ?? draft), imageFile: selected });
    }

    validationPending.current = true;
    setImageValidating(true);
    try {
      await validateEntryImage(selected);
      if (mounted.current && validationRun.current === run) clearField("image");
    } catch (error: unknown) {
      if (mounted.current && validationRun.current === run)
        setImageError(entryFailure(error).message);
    } finally {
      if (mounted.current && validationRun.current === run) {
        validationPending.current = false;
        setImageValidating(false);
      }
    }
  }

  async function imageIdForSave(): Promise<string | undefined> {
    if (!file) return undefined;
    if (uploaded.current?.file === file) return uploaded.current.id;
    setStage("upload");
    const key = uploadIdempotencyKeyRef.current ?? crypto.randomUUID();
    uploadIdempotencyKeyRef.current = key;
    const id = await repository.uploadEntryImage(file, key);
    uploaded.current = { file, id };
    return id;
  }

  function checkBeforeSave(): EntryFailure | null {
    const invalid = validateDraft(
      draft,
      Boolean(entryId),
      file,
      imageError,
      validationPending.current,
    );
    if (invalid) return invalid;
    if (!resources.categoriesReady)
      return localFieldFailure(
        "categoryIds",
        "Espera a que carguen las categorías o decide continuar sin añadirlas.",
      );
    if (entryId && !isStrongEntryVersion(resources.entry?.etag))
      return entryFailure(
        new Error(
          "No pudimos comprobar la versión de la entrada. Consulta sus datos actuales antes de guardar.",
        ),
      );
    return null;
  }

  async function persist(imageId: string | undefined) {
    if (!entryId) return;
    const identity = {
      brandName: draft.brandName.trim(),
      description: draft.description.trim(),
      categoryIds: [...draft.categoryIds],
    };
    const statusChanged = resources.entry?.status !== draft.status;
    const update: EntryUpdateDraft = {
      ...identity,
      ...(statusChanged ? { status: draft.status } : {}),
      ...(imageId ? { imageId } : {}),
    };
    await repository.updateEntry(entryId, update, resources.entry?.etag ?? "");
  }

  function saveFailure(error: unknown, attempted: Stage) {
    const current = entryFailure(error);
    setFailure(current);
    setFailureEpoch((value) => value + 1);
    if (current.uncertain) setUncertain(attempted);
    if (current.fields.image) {
      uploaded.current = null;
      if (controllerRef.current) {
        void controllerRef.current.abandonFlow().catch(() => {});
        controllerRef.current = null;
      }
    }
  }

  async function finishNavigation(receipt: LocalSaveReceipt) {
    saveSucceeded.current = true;
    confirmedReceipt.current = receipt;
    setNavigationFailed(false);
    setInfoNotice(saveReceiptMessage(receipt));
    const controller = controllerRef.current;
    const record = controller?.getRecord();
    if (controller && record) {
      // Flush already queued edits before detaching. Later effects cannot persist this terminal form.
      await controller.updateEditableDraft(record.editableDraft);
      controller.detachForReload();
    }
    try {
      await onSaved(receipt);
      if (record) {
        if (storage.deleteRecordIfAttemptMatches) {
          await storage.deleteRecordIfAttemptMatches(record.storageKey, record.stages[record.currentStageIndex].attemptId).catch(() => false);
        } else if (mounted.current) setInfoNotice(`${saveReceiptMessage(receipt)} La limpieza segura del envío no está disponible; conservamos su confirmación.`);
      }
    } catch {
      if (mounted.current) setNavigationFailed(true);
    }
  }

  async function saveExistingEntry(id: string) {
    let attempted: Stage = "upload";
    try {
      const imageId = await imageIdForSave();
      if (!mounted.current) return;
      attempted = "persist";
      setStage("persist");
      await persist(imageId);
    } catch (error: unknown) {
      if (mounted.current) saveFailure(error, attempted);
      return;
    } finally {
      saving.current = false;
      if (mounted.current) setStage("idle");
    }
    if (!mounted.current) return;
    saveSucceeded.current = true;
    invalidateCatalogEntries(repository);
    await finishNavigation({ receiptId: crypto.randomUUID(), entity: "entry", entityId: id, label: draft.brandName.trim(), action: "updated" });
  }

  function applySuccessfulEntryCreation(result: OperationExecutionResult<EntryCreationDraft, MenuEntryDetail>): LocalSaveReceipt | null {
    if (result.hasDraftChangesSinceSubmission && result.result) {
      loaded.current = true;
      setConfirmedEntryId(result.result.id);
      resources.setEntry(result.result);
      setUncertain("idle");
      setFailure(null);
      setInfoNotice("El envío anterior se guardó. Los cambios posteriores se conservan; revisa la versión actual y guárdalos explícitamente.");
      if (!isStrongEntryVersion(result.result.etag)) setFailure(entryFailure(new Error("Revisa la versión de la entrada confirmada antes de guardar.")));
      if (file === result.record.submittedDraft?.imageFile) { setFile(null); uploaded.current = null; }
      invalidateCatalogEntries(repository);
      return null;
    }
    if (!result.result) return null;
    return {
      receiptId: result.record.stages[result.record.currentStageIndex].idempotencyKey,
      entity: "entry",
      entityId: result.result.id,
      label: result.result.brandName,
      action: "created",
    };
  }

  function applyFailedEntryCreation(
    result: OperationExecutionResult<EntryCreationDraft, MenuEntryDetail>,
    controller: OperationAttemptController<EntryCreationDraft, MenuEntryDetail>,
  ) {
    const activeStage = controller.getCurrentAttempt();
    const attempted: Stage = activeStage?.operationKind === "image.upload" ? "upload" : "persist";
    const uncertainResult = result.outcome?.kind === "uncertain_outcome" ||
      result.outcome?.kind === "uncertain_write_response" || activeStage?.status === "uncertain";
    if (uncertainResult) setUncertain(attempted);
    const errorToReport = lastRawErrorRef.current ?? result.outcome?.message ??
      activeStage?.lastErrorMessage ?? "Error al guardar la entrada.";
    saveFailure(errorToReport, attempted);
  }

  async function submitNewEntry(): Promise<LocalSaveReceipt | null> {
    lastRawErrorRef.current = null;
    const controller = getOrInitController();
    const currentAttempt = controller.getCurrentAttempt();
    if (currentAttempt?.status === "pre_commit_rejected") {
      await controller.startNewAttemptFromEditableDraft({
        preserveConfirmedImage: fileRef.current === controller.getRecord()?.submittedDraft?.imageFile,
      });
    }
    setStage(controller.getCurrentAttempt()?.operationKind === "entry.create" ? "persist" : "upload");
    const current = controller.getCurrentAttempt();
    const isRetry = controller.getRecord() !== null &&
      (current?.status === "uncertain" || current?.status === "conflict_in_progress");
    const result = isRetry ? await controller.retryPending() : await controller.submit();
    if (!mounted.current) return null;
    if (result.status === "succeeded") return applySuccessfulEntryCreation(result);
    applyFailedEntryCreation(result, controller);
    return null;
  }

  async function saveNewEntry() {
    let createdReceipt: LocalSaveReceipt | null = null;
    try {
      createdReceipt = await submitNewEntry();
    } catch (error: unknown) {
      if (!mounted.current) return;
      if (error instanceof PreSendStorageError || error instanceof OperationRetryBlockedError) {
        setFailure(entryFailure(error.message));
        setFailureEpoch((value) => value + 1);
        return;
      }
      saveFailure(error, "upload");
    } finally {
      saving.current = false;
      if (mounted.current) setStage("idle");
    }
    if (createdReceipt && mounted.current) {
      invalidateCatalogEntries(repository);
      await finishNavigation(createdReceipt);
    }
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      saving.current ||
      saveSucceeded.current ||
      uncertain !== "idle" ||
      (entryId && failure?.kind === "conflict")
    )
      return;
    const attempt = controllerRef.current?.getCurrentAttempt();
    const recovering = !entryId && (attempt?.status === "uncertain" || attempt?.status === "conflict_in_progress");
    const invalid = recovering ? null : checkBeforeSave();
    if (invalid) {
      setFailure(invalid);
      setFailureEpoch((value) => value + 1);
      return;
    }
    if (!recoveryReady) return;
    saving.current = true;
    setFailure(null);
    if (entryId) {
      await saveExistingEntry(entryId);
      return;
    }
    await saveNewEntry();
  }

  async function reviewCurrent() {
    if (!entryId || reviewLoading) return;
    const controller = new AbortController();
    reviewController.current = controller;
    setReviewLoading(true);
    setReviewError("");
    try {
      const current = await repository.getEntry(entryId, controller.signal);
      if (!controller.signal.aborted) setReview(current);
    } catch (error: unknown) {
      if (!controller.signal.aborted) setReviewError(entryFailure(error).message);
    } finally {
      if (!controller.signal.aborted) setReviewLoading(false);
    }
  }

  function acceptReview(keepDraft: boolean) {
    if (reviewLoading || !review || !isStrongEntryVersion(review.etag)) return;
    resources.setEntry(review);
    if (!keepDraft) {
      baseDraft.current = draftFrom(review);
      setDraft(draftFrom(review));
      setFile(null);
      uploaded.current = null;
      validationRun.current += 1;
      validationPending.current = false;
      setImageError("");
      setImageValidating(false);
    } else if (review.status === "ARCHIVED" && draft.status === "ACTIVE") {
      changeStatus("INACTIVE");
    }
    setFailure(null);
    setReview(null);
    setUncertain("idle");
  }

  return {
    ...resources,
    get dirty() { return !saveSucceeded.current && (!sameDraft({ ...draft, categoryIds: [...draft.categoryIds].sort(compareCategoryIds) }, { ...baseDraft.current, categoryIds: [...baseDraft.current.categoryIds].sort(compareCategoryIds) }) || file !== baseFile.current); },
    get exitBlocked() { return !saveSucceeded.current && (saving.current || stage !== "idle" || uncertain !== "idle" || Boolean(controllerRef.current?.getCurrentAttempt()?.possibleWriteApplied && controllerRef.current.getCurrentAttempt()?.status !== "succeeded")); },
    editing: Boolean(entryId),
    infoNotice,
    navigationFailed,
    recoveryReady,
    retryRecovery: () => setRecoveryRetry(value => value + 1),
    finishNavigation: () => { if (confirmedReceipt.current) return finishNavigation(confirmedReceipt.current); },
    draft,
    file,
    imageError,
    imageValidating,
    failure,
    failureEpoch,
    stage,
    uncertain,
    review,
    reviewLoading,
    reviewError,
    selectImage,
    changeText,
    changeCategories,
    changeStatus,
    save,
    saveSucceeded: saveSucceeded.current,
    abandon: () => {
      saveSucceeded.current = false;
      if (controllerRef.current) {
        void controllerRef.current.abandonFlow().catch(() => {});
      }
    },
    reviewCurrent,
    acceptReview,
    allowExplicitRetry: () => {
      setUncertain("idle");
      setFailure(null);
    },
    editingReady: !entryId || Boolean(resources.entry),
    versionReady: !entryId || isStrongEntryVersion(resources.entry?.etag),
  };
}
