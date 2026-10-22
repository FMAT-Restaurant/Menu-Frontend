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
  sealJsonPayload,
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
    tabId: "singleton",
    formKind: "entry-form",
    resourceKey: "entry-create",
  };
}

export type Stage = "idle" | "upload" | "persist";
const emptyDraft: EntryUpdateDraft = {
  brandName: "",
  description: "",
  categoryIds: [],
  status: "INACTIVE",
};

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
  entryId: string | undefined,
  onSaved: () => Promise<void>,
  storage: PendingOperationStorageAdapter = createIndexedDbPendingOperationStorage(),
) {
  const [draft, setDraft] = useState<EntryUpdateDraft>(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
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
  const userEdited = useRef(false);
  const validationRun = useRef(0);
  const validationPending = useRef(false);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  const uploadIdempotencyKeyRef = useRef<string | null>(null);
  const reviewController = useRef<AbortController | null>(null);
  const lastRawErrorRef = useRef<unknown>(null);
  const controllerRef = useRef<OperationAttemptController<
    EntryCreateDraft,
    MenuEntryDetail
  > | null>(null);

  const onLoaded = useCallback((entry: MenuEntryDetail) => {
    if (!loaded.current) {
      setDraft(draftFrom(entry));
      loaded.current = true;
    }
  }, []);
  const resources = useEntryResources(repository, entryId, onLoaded);

  function getOrInitController(
    overrideFile?: File | null,
  ): OperationAttemptController<EntryCreateDraft, MenuEntryDetail> {
    const activeFile = overrideFile !== undefined ? overrideFile : file;
    if (!controllerRef.current) {
      controllerRef.current = createOperationAttemptController<
        EntryCreateDraft,
        MenuEntryDetail
      >({
        scope: buildEntryCreateScope(),
        storage,
        initialDraft: {
          brandName: draft.brandName.trim(),
          description: draft.description.trim(),
          categoryIds: [...draft.categoryIds],
        },
        stage1ImageUpload: activeFile
          ? {
              endpointPath: "/media/images",
              file: activeFile,
              fileName: activeFile.name,
              executeUpload: async (stageAttempt) => {
                const uploadKey = stageAttempt.idempotencyKey;
                const fileToUpload =
                  stageAttempt.payload.kind === "multipart-file"
                    ? new File(
                        [stageAttempt.payload.fileBlob],
                        stageAttempt.payload.fileName,
                        { type: stageAttempt.payload.mimeType },
                      )
                    : activeFile;
                try {
                  const id = await repository.uploadEntryImage(fileToUpload, uploadKey);
                  if (mounted.current) {
                    setStage("persist");
                  }
                  return { id };
                } catch (err) {
                  lastRawErrorRef.current = err;
                  throw err;
                }
              },
            }
          : undefined,
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
    }
    return controllerRef.current;
  }

  useEffect(() => {
    mounted.current = true;

    if (!entryId) {
      const controller = getOrInitController();
      void controller
        .restoreFromStorage()
        .then((restored) => {
          if (!mounted.current || !restored) return;
          const currentStage = restored.stages[restored.currentStageIndex];
          if (!currentStage || currentStage.status === "succeeded") return;

          if (!userEdited.current) {
            setDraft({
              brandName: restored.editableDraft.brandName,
              description: restored.editableDraft.description,
              categoryIds: [...restored.editableDraft.categoryIds],
              status: "INACTIVE",
            });
          }

          if (restored.stages[0]?.payload.kind === "multipart-file") {
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
        })
        .catch(() => {});
    }

    return () => {
      mounted.current = false;
      validationRun.current += 1;
      reviewController.current?.abort();
      controllerRef.current?.detachForReload();
    };
  }, [entryId]);

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
      if (controllerRef.current) {
        void controllerRef.current.abandonFlow().catch(() => {});
        controllerRef.current = null;
      }
      getOrInitController(selected);
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
          "No se recibió una versión fuerte de la entrada. Revisa los datos actuales antes de guardar.",
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

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      saving.current ||
      saveSucceeded.current ||
      uncertain !== "idle" ||
      (entryId && failure?.kind === "conflict")
    )
      return;
    const invalid = checkBeforeSave();
    if (invalid) {
      setFailure(invalid);
      setFailureEpoch((value) => value + 1);
      return;
    }
    saving.current = true;
    setFailure(null);

    // Editing flow (existing entry update)
    if (entryId) {
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
        try {
          await onSaved();
        } catch {
          // Failure of onSaved callback must not invalidate the successful write
        }
      return;
    }

    // Creation flow (idempotent, multi-stage controller)
    let createdSuccessfully = false;
    try {
      lastRawErrorRef.current = null;
      const controller = getOrInitController();
      const currentAttempt = controller.getCurrentAttempt();

      if (currentAttempt?.status === "pre_commit_rejected") {
        await controller.startNewAttemptFromEditableDraft();
      }

      setStage(
        controller.getCurrentAttempt()?.operationKind === "entry.create"
          ? "persist"
          : "upload",
      );

      const isRetry =
        controller.getRecord() !== null &&
        (controller.getCurrentAttempt()?.status === "uncertain" ||
          controller.getCurrentAttempt()?.status === "conflict_in_progress");

      const result = isRetry
        ? await controller.retryPending()
        : await controller.submit();

      if (!mounted.current) return;

      if (result.status === "succeeded") {
        createdSuccessfully = true;
      } else {
        const activeStage = controller.getCurrentAttempt();
        const attempted =
          activeStage?.operationKind === "image.upload" ? "upload" : "persist";
        if (
          result.outcome?.kind === "uncertain_outcome" ||
          result.outcome?.kind === "uncertain_write_response" ||
          activeStage?.status === "uncertain"
        ) {
          setUncertain(attempted);
        }
        const errorToReport =
          lastRawErrorRef.current ??
          result.outcome?.message ??
          activeStage?.lastErrorMessage ??
          "Error al guardar la entrada.";
        saveFailure(errorToReport, attempted);
      }
    } catch (error: unknown) {
      if (!mounted.current) return;
      if (
        error instanceof PreSendStorageError ||
        error instanceof OperationRetryBlockedError
      ) {
        setFailure(entryFailure(error.message));
        setFailureEpoch((v) => v + 1);
        return;
      }
      saveFailure(error, "upload");
    } finally {
      saving.current = false;
      if (mounted.current) setStage("idle");
    }

    if (createdSuccessfully && mounted.current) {
      saveSucceeded.current = true;
      invalidateCatalogEntries(repository);
      try {
        await onSaved();
      } catch {
        // Failure of onSaved callback must not invalidate the successful write or enable another creation
      }
    }
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
