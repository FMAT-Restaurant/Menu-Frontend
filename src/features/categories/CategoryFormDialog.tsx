import { sameDraft, useEditGuard } from "../../shared/editGuard";
import { Icon } from "../../shared/Icon";
import { useTaskDialog } from "../../shared/useTaskDialog";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import {
  analyzeIdempotentAttemptError,
  analyzeNonIdempotentWriteError,
} from "../../api/idempotencyResponse";
import type {
  CategoryDraft,
  MenuCategory,
  MenuRepository,
  VersionedResource,
} from "../../application/catalog";
import { isStrongEtag } from "../../application/entryVersion";
import {
  canManualRetryAttempt,
  createOperationAttemptController,
  getOrCreateTabId,
  OperationRetryBlockedError,
  PreSendStorageError,
  sealJsonPayload,
  type OperationAttemptController,
  type OperationFlowScope,
  type PendingOperationChainRecord,
  type PendingOperationStorageAdapter,
  type SealedOperationAttempt,
} from "../../application/operationAttempt";

export type CategoryDialogRepository = Pick<
  MenuRepository,
  "getCategory" | "createCategory" | "updateCategory"
>;

export function buildCategoryCreateScope(tabId = getOrCreateTabId()): OperationFlowScope {
  return {
    tabId,
    formKind: "category-form",
    resourceKey: "new",
  };
}

interface CategoryFormDialogProps {
  category?: MenuCategory;
  repository: CategoryDialogRepository;
  storage: PendingOperationStorageAdapter;
  initialPendingRecord?: PendingOperationChainRecord<CategoryDraft> | null;
  onClose(): void;
  onCreated(category: MenuCategory): void;
  onCreatedWithPendingEdits(category: MenuCategory): void;
  onUpdated(category: MenuCategory): void;
}

export function CategoryFormDialog({
  category,
  repository,
  storage,
  initialPendingRecord = null,
  onClose,
  onCreated,
  onCreatedWithPendingEdits,
  onUpdated,
}: Readonly<CategoryFormDialogProps>) {
  const [activeCategory, setActiveCategory] = useState<MenuCategory | undefined>(category);
  const [name, setName] = useState(
    () => category?.name ?? initialPendingRecord?.editableDraft.name ?? "",
  );
  const [description, setDescription] = useState(
    () => category?.description ?? initialPendingRecord?.editableDraft.description ?? "",
  );
  const baseDraft = useRef({ name: category?.name ?? "", description: category?.description ?? "" });
  const exitSucceeded = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");

  // Creation attempt recovery state
  const [pendingAttempt, setPendingAttempt] = useState<SealedOperationAttempt | null>(
    () =>
      !category && initialPendingRecord
        ? (initialPendingRecord.stages[initialPendingRecord.currentStageIndex] ?? null)
        : null,
  );
  const [retryCountdownMs, setRetryCountdownMs] = useState<number>(() => {
    if (!category && initialPendingRecord) {
      const stage = initialPendingRecord.stages[initialPendingRecord.currentStageIndex];
      if (stage?.retryAfterUntil) {
        return Math.max(0, stage.retryAfterUntil - Date.now());
      }
    }
    return 0;
  });

  // Edit mode version & conflict review state
  const [openingEtag, setOpeningEtag] = useState<string | undefined>(undefined);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [exitUncertain, setExitUncertain] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewedResource, setReviewedResource] =
    useState<VersionedResource<MenuCategory> | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useTaskDialog(dialogRef, true, nameRef);
  const activeRef = useRef(true);
  const userEditedRef = useRef(false);
  const openingLoadPromiseRef = useRef<Promise<VersionedResource<MenuCategory> | null> | null>(
    null,
  );
  const controllerRef = useRef<OperationAttemptController<CategoryDraft, MenuCategory> | null>(
    null,
  );

  function getOrInitController(): OperationAttemptController<CategoryDraft, MenuCategory> {
    if (!controllerRef.current) {
      controllerRef.current = createOperationAttemptController<CategoryDraft, MenuCategory>({
        scope: buildCategoryCreateScope(),
        storage,
        initialDraft: {
          name: initialPendingRecord?.editableDraft.name ?? name,
          description: initialPendingRecord?.editableDraft.description ?? description,
        },
        buildFinalStageInput: ({ draft, submittedDraftVersion, now }) => ({
          operationKind: "category.create",
          method: "POST",
          endpointPath: "/menu/categories",
          payload: sealJsonPayload({
            name: draft.name.trim(),
            description: draft.description.trim(),
          }),
          submittedDraftVersion,
          now,
        }),
        executeFinalStage: async ({ attempt }) => {
          if (attempt.payload.kind !== "json") {
            throw new Error("El intento de categoría requiere un payload JSON sellado.");
          }
          const sealedDraft = attempt.payload.payloadSnapshot as CategoryDraft;
          return repository.createCategory(sealedDraft, attempt.idempotencyKey);
        },
        classifyError: (err, attempt) =>
          analyzeIdempotentAttemptError(err, attempt.operationKind),
      });
    }
    return controllerRef.current;
  }

  function syncAttemptStateFromRecord(
    record: PendingOperationChainRecord<CategoryDraft> | null,
  ) {
    if (!record) {
      setPendingAttempt(null);
      setRetryCountdownMs(0);
      return;
    }
    const stage = record.stages[record.currentStageIndex] ?? null;
    setPendingAttempt(stage);
    if (stage?.retryAfterUntil) {
      const remaining = Math.max(0, stage.retryAfterUntil - Date.now());
      setRetryCountdownMs(remaining);
    } else {
      setRetryCountdownMs(0);
    }
  }

  function loadOpeningCategoryVersion(
    categoryId: string,
    options?: { preserveDraft?: boolean; signal?: AbortSignal },
  ): Promise<VersionedResource<MenuCategory> | null> {
    const promise = repository
      .getCategory(categoryId, options?.signal)
      .then((versioned) => {
        if (!activeRef.current || options?.signal?.aborted) {
          return null;
        }
        // An opening read may finish after the user has edited the summary.
        // Its version cannot authorize older fields without an explicit review.
        if (userEditedRef.current) {
          setOpeningEtag(undefined);
          setReviewRequired(true);
          setError("Los datos actuales llegaron después de tus cambios. Revisa la categoría actual antes de guardar.");
          return null;
        }
        setActiveCategory(versioned.data);
        if (!options?.preserveDraft && !userEditedRef.current) {
          baseDraft.current = { name: versioned.data.name, description: versioned.data.description ?? "" };
          setName(versioned.data.name);
          setDescription(versioned.data.description ?? "");
        }
        if (isStrongEtag(versioned.etag)) {
          setOpeningEtag(versioned.etag);
          setReviewRequired(false);
        } else {
          setOpeningEtag(undefined);
          setReviewRequired(true);
          setError(
            "No se recibió la versión de la categoría (se requiere una versión fuerte). Revisa los datos actuales antes de guardar.",
          );
        }
        return versioned;
      })
      .catch(() => {
        if (!activeRef.current || options?.signal?.aborted) {
          return null;
        }
        setOpeningEtag(undefined);
        setReviewRequired(true);
        setError(
          "No se pudo cargar la versión actual de la categoría. Revisa los datos actuales antes de guardar.",
        );
        return null;
      })
      .finally(() => {
        if (openingLoadPromiseRef.current === promise) {
          openingLoadPromiseRef.current = null;
        }
      });

    openingLoadPromiseRef.current = promise;
    return promise;
  }

  useEffect(() => {
    activeRef.current = true;

    const abortController = new AbortController();

    if (category) {
      void loadOpeningCategoryVersion(category.id, { signal: abortController.signal });
    } else {
      const controller = getOrInitController();
      void controller
        .restoreFromStorage()
        .then((restored) => {
          if (!activeRef.current || abortController.signal.aborted || !restored) {
            return;
          }
          const stage = restored.stages[restored.currentStageIndex];
          if (!stage || stage.status === "succeeded") {
            return;
          }
          if (!userEditedRef.current) {
            setName(restored.editableDraft.name);
            setDescription(restored.editableDraft.description);
          }
          syncAttemptStateFromRecord(restored);
          if (stage.lastErrorMessage) {
            setError(
              stage.lastErrorMessage.includes("No se pudo guardar la categoría") ||
                stage.lastErrorCode === "INTERRUPTED_BY_RELOAD"
                ? stage.lastErrorMessage
                : `No se pudo guardar la categoría. ${stage.lastErrorMessage}`,
            );
          }
        })
        .catch(() => {
          // Ignore storage read failure on initial mount; pre-send check will enforce storage integrity.
        });
    }

    return () => {
      activeRef.current = false;
      abortController.abort();
      controllerRef.current?.detachForReload();
      // Effect setup may run again with the same refs in StrictMode.
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (retryCountdownMs <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (!activeRef.current) return;
      const stage = controllerRef.current?.getCurrentAttempt() ?? pendingAttempt;
      const nextRemaining = stage?.retryAfterUntil
        ? Math.max(0, stage.retryAfterUntil - Date.now())
        : 0;
      setRetryCountdownMs(nextRemaining);
    }, retryCountdownMs);
    return () => window.clearTimeout(timer);
  }, [retryCountdownMs, pendingAttempt]);

  function handleNameChange(nextName: string) {
    if (busy) return;
    userEditedRef.current = true;
    setName(nextName);
    if (nameError && nextName.trim()) setNameError("");
    if (!activeCategory) {
      const controller = getOrInitController();
      void controller.updateEditableDraft({ name: nextName, description });
    }
  }

  function handleDescriptionChange(nextDescription: string) {
    if (busy) return;
    userEditedRef.current = true;
    setDescription(nextDescription);
    if (!activeCategory) {
      const controller = getOrInitController();
      void controller.updateEditableDraft({ name, description: nextDescription });
    }
  }

  async function abandonEditor() {
    if (busy) return;
    activeRef.current = false;
    if (controllerRef.current) {
      try {
        await controllerRef.current.abandonFlow();
      } catch {
        // Voluntary exit still closes the dialog even if local cleanup fails
      }
    } else {
      try {
        await storage.deleteRecord(buildCategoryCreateScope());
      } catch {
        // Ignore cleanup error on voluntary exit
      }
    }
    exitSucceeded.current = true;
    onClose();
  }

  const guard = useEditGuard({
    get dirty() { return !exitSucceeded.current && !sameDraft({ name, description }, baseDraft.current); },
    blocked: exitUncertain || busy || pendingAttempt?.status === "uncertain" || pendingAttempt?.status === "conflict_in_progress" || pendingAttempt?.status === "in_flight" || Boolean(pendingAttempt?.possibleWriteApplied && pendingAttempt.status !== "succeeded"),
  }, () => { void abandonEditor(); });
  function handleVoluntaryClose() { guard.request(() => { void abandonEditor(); }); }

  async function executeCreationFlow(mode: "submit" | "retry") {
    // A retry sends the original sealed payload, independently of later draft edits.
    if (mode === "submit" && !validateName()) return;

    const controller = getOrInitController();
    const currentStage = controller.getCurrentAttempt();

    if (mode === "submit" && currentStage) {
      if (currentStage.status === "requires_new_key") {
        setError(
          "La clave de idempotencia ya fue utilizada o es inválida. Pulsa «Iniciar nueva operación» para generar una nueva clave.",
        );
        return;
      }
      if (currentStage.status === "pre_commit_rejected") {
        try {
          await controller.startNewAttemptFromEditableDraft();
        } catch (err) {
          if (err instanceof PreSendStorageError) {
            setError(err.message);
            return;
          }
          throw err;
        }
      }
    }

    setBusy(true);
    setError("");
    setInfoNotice("");
    try {
      const result =
        mode === "retry" && controller.getRecord()
          ? await controller.retryPending()
          : await controller.submit();

      if (!activeRef.current) return;

      if (result.status === "succeeded" && result.result) {
        const created = result.result;
        baseDraft.current = { name: created.name, description: created.description ?? "" };
        syncAttemptStateFromRecord(null);

        if (result.hasDraftChangesSinceSubmission) {
          setActiveCategory(created);
          setInfoNotice(
            "La categoría se creó en el servidor. Tus cambios posteriores siguen en el formulario; guarda los cambios para actualizarla.",
          );
          onCreatedWithPendingEdits(created);
          void loadOpeningCategoryVersion(created.id, { preserveDraft: true });
          return;
        }

        onCreated(created);
        return;
      }

      syncAttemptStateFromRecord(result.record);
      const outcomeMessage =
        result.outcome?.message ??
        "No se pudo guardar la categoría. Recarga la lista y vuelve a intentarlo.";
      setError(
        outcomeMessage.includes("No se pudo guardar la categoría")
          ? outcomeMessage
          : `No se pudo guardar la categoría. ${outcomeMessage}`,
      );
    } catch (err) {
      if (!activeRef.current) return;
      if (err instanceof PreSendStorageError) {
        setError(err.message);
        return;
      }
      if (err instanceof OperationRetryBlockedError) {
        setError(err.message);
        if (err.remainingRetryAfterMs > 0) {
          setRetryCountdownMs(err.remainingRetryAfterMs);
        }
        return;
      }
      setError("No se pudo guardar la categoría. Recarga la lista y vuelve a intentarlo.");
    } finally {
      if (activeRef.current) {
        setBusy(false);
      }
    }
  }

  async function handleStartNewOperation() {
    if (busy) return;
    const controller = getOrInitController();
    setError("");
    try {
      const record = await controller.startNewAttemptFromEditableDraft({
        confirmExpiredWindow: true,
      });
      if (!activeRef.current) return;
      syncAttemptStateFromRecord(record);
    } catch (err) {
      if (!activeRef.current) return;
      if (err instanceof PreSendStorageError || err instanceof OperationRetryBlockedError) {
        setError(err.message);
      } else {
        setError("No se pudo iniciar una nueva operación.");
      }
    }
  }

  async function executeEditSave() {
    if (!activeCategory) return;
    if (!validateName()) return;
    const draft: CategoryDraft = {
      name: name.trim(),
      description: description.trim(),
    };

    setBusy(true);
    setError("");
    setInfoNotice("");
    try {
      let etagToUse = openingEtag;
      if (!etagToUse && openingLoadPromiseRef.current) {
        const loaded = await openingLoadPromiseRef.current;
        etagToUse = loaded?.etag;
      }
      if (!activeRef.current) return;

      if (reviewRequired || !isStrongEtag(etagToUse)) {
        setReviewRequired(true);
        setError(
          "No se recibió la versión de la categoría (se requiere una versión fuerte). Revisa los datos actuales antes de guardar.",
        );
        return;
      }

      const updated = await repository.updateCategory(activeCategory.id, draft, etagToUse);
      if (!activeRef.current) return;
      onUpdated(updated);
    } catch (err) {
      if (!activeRef.current) return;
      const analysis = analyzeNonIdempotentWriteError(err);
      setExitUncertain(analysis.possibleWriteApplied);
      if (analysis.requiresResourceReload) {
        setReviewRequired(true);
      }
      setError(`No se pudo guardar la categoría. ${analysis.message}`);
    } finally {
      if (activeRef.current) {
        setBusy(false);
      }
    }
  }

  async function handleReviewCategory() {
    if (!activeCategory || reviewLoading) return;
    setReviewLoading(true);
    setReviewError("");
    try {
      const current = await repository.getCategory(activeCategory.id);
      if (!activeRef.current) return;
      setReviewedResource(current);
    } catch {
      if (!activeRef.current) return;
      setReviewError("No se pudo consultar la categoría actual. Inténtalo de nuevo.");
    } finally {
      if (activeRef.current) {
        setReviewLoading(false);
      }
    }
  }

  function handleAdoptReview(keepDraft: boolean) {
    if (reviewLoading || !reviewedResource || !isStrongEtag(reviewedResource.etag)) {
      return;
    }
    setActiveCategory(reviewedResource.data);
    setOpeningEtag(reviewedResource.etag);
    if (!keepDraft) {
      setExitUncertain(false);
      baseDraft.current = { name: reviewedResource.data.name, description: reviewedResource.data.description ?? "" };
      setName(reviewedResource.data.name);
      setDescription(reviewedResource.data.description ?? "");
      setNameError("");
    }
    setReviewedResource(null);
    setReviewRequired(false);
    setReviewError("");
    setError("");
  }

  function validateName(): boolean {
    if (name.trim()) {
      setNameError("");
      return true;
    }
    setNameError("Indica el nombre de la categoría.");
    nameRef.current?.focus();
    return false;
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (activeCategory) {
      await executeEditSave();
      return;
    }
    const isRetryablePending =
      pendingAttempt !== null &&
      (pendingAttempt.status === "uncertain" ||
        pendingAttempt.status === "conflict_in_progress");
    if (isRetryablePending) {
      await executeCreationFlow("retry");
      return;
    }
    await executeCreationFlow("submit");
  }

  const editing = Boolean(activeCategory);
  const showManualRetryButton =
    !editing &&
    pendingAttempt !== null &&
    (pendingAttempt.status === "uncertain" ||
      pendingAttempt.status === "conflict_in_progress");
  const retryEligibility =
    pendingAttempt !== null
      ? canManualRetryAttempt(pendingAttempt)
      : { allowed: true, remainingRetryAfterMs: 0 };
  const retryDisabled = busy || retryCountdownMs > 0 || !retryEligibility.allowed;

  const requiresNewOperationAction =
    !editing &&
    pendingAttempt !== null &&
    (pendingAttempt.status === "requires_new_key" || pendingAttempt.status === "expired");

  const saveDisabled =
    busy ||
    (editing && reviewRequired) ||
    (!editing && (showManualRetryButton || requiresNewOperationAction));

  let saveLabel = "Guardar categoría";
  if (editing) saveLabel = "Guardar cambios";
  if (busy) saveLabel = "Guardando…";

  const reviewedEtagStrong = isStrongEtag(reviewedResource?.etag);

  return (
    <dialog
      ref={dialogRef}
      className="category-form-dialog menu-task-dialog"
      aria-labelledby="category-form-title"
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!event.repeat) handleVoluntaryClose(); } }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          void handleVoluntaryClose();
        }
      }}
    >
      {guard.confirmation}
      <div className="category-form-dialog__header">
        <h2 id="category-form-title">{editing ? "Editar categoría" : "Crear categoría"}</h2>
        <button
          className="category-form-dialog__close"
          type="button"
          disabled={busy}
          onClick={() => {
            void handleVoluntaryClose();
          }}
          aria-label="Cerrar formulario"
        >
          <Icon name="close" />
        </button>
      </div>
      <form noValidate onSubmit={(event) => void save(event)}>
        <div className="category-form-dialog__fields">
          {nameError && (
            <div className="category-form-dialog__validation" role="alert">
              <p>Revisa el nombre de la categoría.</p>
              <button className="button button--quiet" type="button" onClick={() => nameRef.current?.focus()}>
                Ir al nombre
              </button>
            </div>
          )}
          <div className="category-form-dialog__field">
            <label htmlFor="category-name">Nombre</label>
            <p className="field-hint" id="category-name-hint">Obligatorio. Hasta 255 caracteres.</p>
            <input
              ref={nameRef}
              id="category-name"
              value={name}
              disabled={busy}
              onChange={(event) => handleNameChange(event.target.value)}
              maxLength={255}
              required
              aria-invalid={Boolean(nameError)}
              aria-describedby={`category-name-hint${nameError ? " category-name-error" : ""}`}
              placeholder="Ej. Postres"
            />
            {nameError && <p className="field-error" id="category-name-error">{nameError}</p>}
          </div>
          <div className="category-form-dialog__field">
            <label htmlFor="category-description">Descripción</label>
            <p className="field-hint" id="category-description-hint">Opcional. Hasta 255 caracteres.</p>
            <textarea
              id="category-description"
              value={description}
              disabled={busy}
              onChange={(event) => handleDescriptionChange(event.target.value)}
              maxLength={255}
              rows={3}
              aria-describedby="category-description-hint"
              placeholder="Describe qué entradas agrupa"
            />
          </div>
          {infoNotice && (
            <output className="feedback feedback--success">{infoNotice}</output>
          )}
          {error && (
            <div className="category-form-dialog__error" role="alert">
              <p>{error}</p>
              {showManualRetryButton && retryCountdownMs > 0 && (
                <p>
                  Espera {Math.ceil(retryCountdownMs / 1000)} s antes de volver a intentar.
                </p>
              )}
              {showManualRetryButton && (
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={retryDisabled}
                  onClick={() => {
                    void executeCreationFlow("retry");
                  }}
                >
                  Reintentar
                </button>
              )}
              {requiresNewOperationAction && (
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void handleStartNewOperation();
                  }}
                >
                  Iniciar nueva operación
                </button>
              )}
              {editing && reviewRequired && (
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={reviewLoading}
                  onClick={() => {
                    void handleReviewCategory();
                  }}
                >
                  Revisar categoría actual
                </button>
              )}
            </div>
          )}
          {editing && reviewLoading && (
            <output className="feedback" aria-live="polite">
              Consultando la categoría actual; tu borrador se conserva…
            </output>
          )}
          {editing && reviewError && (
            <p className="category-form-dialog__error" role="alert">
              {reviewError}
            </p>
          )}
          {editing && reviewedResource && (
            <section
              className="category-form-dialog__review"
              aria-label="Datos actuales de la categoría"
            >
              <h3>Datos actuales de la categoría</h3>
              <dl>
                <dt>Nombre</dt>
                <dd>{reviewedResource.data.name}</dd>
                <dt>Descripción</dt>
                <dd>{reviewedResource.data.description || "Sin descripción"}</dd>
              </dl>
              <p>
                Tu borrador permanece en el formulario. Elige usar estos datos o conservar tu
                borrador con la versión que acabas de revisar.
              </p>
              {!reviewedEtagStrong && (
                <p>No se recibió una versión fuerte. Reintenta la consulta antes de continuar.</p>
              )}
              <div className="category-form-dialog__review-actions">
                <button
                  type="button"
                  disabled={!reviewedEtagStrong || reviewLoading}
                  onClick={() => handleAdoptReview(false)}
                >
                  Usar datos actuales
                </button>
                <button
                  type="button"
                  disabled={!reviewedEtagStrong || reviewLoading}
                  onClick={() => handleAdoptReview(true)}
                >
                  Continuar con mi borrador y versión revisada
                </button>
              </div>
            </section>
          )}
        </div>
        <div className="category-form-dialog__actions">
          <button
            className="button button--secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              void handleVoluntaryClose();
            }}
          >
            Cancelar
          </button>
          <button
            className="button button--primary"
            type="submit"
            disabled={saveDisabled}
          >
            {saveLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
