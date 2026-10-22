import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type {
  InventoryItem,
  MenuRepository,
  RecipeDetail,
  RecipeDraft,
  RecipeSummary,
  RecipeSupplyInput,
  VersionedResource,
} from "../../application/catalog";
import { isStrongEtag } from "../../application/entryVersion";
import {
  OperationRetryBlockedError,
  PreSendStorageError,
  canManualRetryAttempt,
  createOperationAttemptController,
  sealJsonPayload,
  type OperationAttemptController,
  type OperationFlowScope,
  type PendingOperationChainRecord,
  type PendingOperationStorageAdapter,
  type SealedOperationAttempt,
} from "../../application/operationAttempt";
import {
  analyzeIdempotentAttemptError,
  analyzeNonIdempotentWriteError,
} from "../../api/idempotencyResponse";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";

export interface RecipeFormDialogProps {
  recipe?: RecipeDetail | RecipeSummary | null;
  inventoryItems: InventoryItem[];
  repository?: Pick<MenuRepository, "createRecipe" | "updateRecipe" | "getRecipe">;
  onClose(): void;
  onCreated?(created: RecipeDetail): void;
  onCreatedWithPendingEdits?(created: RecipeDetail): void;
  onUpdated?(updated: RecipeDetail): void;
  storage?: PendingOperationStorageAdapter;
  initialPendingRecord?: PendingOperationChainRecord<RecipeDraft> | null;
  nestedContext?: Readonly<Record<string, unknown>>;
  onSubmit?(draft: RecipeDraft): Promise<void>;
}

let rowSeed = 0;
function nextRowKey(): string {
  rowSeed += 1;
  return `supply-row-${rowSeed}`;
}

export interface SupplyRow {
  key: string;
  inventoryItemId: string;
  quantity: string | number;
}

export function buildRecipeCreateScope(tabId = "global-tab"): OperationFlowScope {
  return {
    tabId,
    formKind: "recipe-form",
    resourceKey: "recipe-create",
  };
}

export function RecipeFormDialog({
  recipe,
  inventoryItems,
  repository,
  onClose,
  onCreated,
  onCreatedWithPendingEdits,
  onUpdated,
  storage = createIndexedDbPendingOperationStorage(),
  initialPendingRecord,
  nestedContext,
  onSubmit,
}: Readonly<RecipeFormDialogProps>) {
  const [activeRecipe, setActiveRecipe] = useState<RecipeDetail | RecipeSummary | undefined>(
    recipe ?? undefined,
  );

  const initialDraft = initialPendingRecord?.editableDraft;

  const [name, setName] = useState(
    () => recipe?.name ?? initialDraft?.name ?? "",
  );
  const [description, setDescription] = useState(
    () => recipe?.description ?? initialDraft?.description ?? "",
  );
  const [instructions, setInstructions] = useState(
    () =>
      (recipe && "instructions" in recipe ? recipe.instructions : "") ||
      initialDraft?.instructions ||
      "",
  );
  const [supplies, setSupplies] = useState<SupplyRow[]>(() => {
    if (recipe?.supplies && recipe.supplies.length > 0) {
      return recipe.supplies.map((s) => ({
        key: nextRowKey(),
        inventoryItemId: s.inventoryItemId,
        quantity: s.quantity,
      }));
    }
    if (initialDraft?.supplies && initialDraft.supplies.length > 0) {
      return initialDraft.supplies.map((s) => ({
        key: nextRowKey(),
        inventoryItemId: s.inventoryItemId,
        quantity: s.quantity,
      }));
    }
    return [{ key: nextRowKey(), inventoryItemId: "", quantity: 1 }];
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>(() => {
    if (!recipe && initialPendingRecord) {
      const stage = initialPendingRecord.stages[initialPendingRecord.currentStageIndex];
      if (stage?.lastErrorMessage) {
        return stage.lastErrorMessage.includes("No se pudo guardar la receta") ||
          stage.lastErrorCode === "INTERRUPTED_BY_RELOAD"
          ? stage.lastErrorMessage
          : `No se pudo guardar la receta. ${stage.lastErrorMessage}`;
      }
      if (
        stage &&
        (stage.status === "uncertain" || stage.status === "conflict_in_progress")
      ) {
        return "Existe una operación previa pendiente de confirmación. Puedes reintentarla o continuar.";
      }
    }
    return "";
  });
  const [infoNotice, setInfoNotice] = useState("");

  // Creation recovery state
  const [pendingAttempt, setPendingAttempt] = useState<SealedOperationAttempt | null>(() =>
    !recipe && initialPendingRecord
      ? initialPendingRecord.stages[initialPendingRecord.currentStageIndex] ?? null
      : null,
  );
  const [retryCountdownMs, setRetryCountdownMs] = useState<number>(() => {
    if (!recipe && initialPendingRecord) {
      const stage = initialPendingRecord.stages[initialPendingRecord.currentStageIndex];
      if (stage?.retryAfterUntil) {
        return Math.max(0, stage.retryAfterUntil - Date.now());
      }
    }
    return 0;
  });

  // Edit version & review state
  const [openingEtag, setOpeningEtag] = useState<string | undefined>(undefined);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewedResource, setReviewedResource] =
    useState<VersionedResource<RecipeDetail> | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef(true);
  const userEditedRef = useRef(false);
  const openingLoadPromiseRef = useRef<Promise<VersionedResource<RecipeDetail> | null> | null>(
    null,
  );
  const controllerRef = useRef<OperationAttemptController<RecipeDraft, RecipeDetail> | null>(
    null,
  );

  function getCurrentDraft(): RecipeDraft {
    const parsedSupplies: RecipeSupplyInput[] = supplies.map((s) => ({
      inventoryItemId: s.inventoryItemId,
      quantity: Number(s.quantity) || 0,
    }));
    return {
      name: name.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      supplies: parsedSupplies,
    };
  }

  function getOrInitController(): OperationAttemptController<RecipeDraft, RecipeDetail> {
    if (!controllerRef.current) {
      controllerRef.current = createOperationAttemptController<RecipeDraft, RecipeDetail>({
        scope: buildRecipeCreateScope(),
        storage,
        initialDraft: initialDraft ?? getCurrentDraft(),
        nestedContext,
        buildFinalStageInput: ({ draft, submittedDraftVersion, now }) => ({
          operationKind: "recipe.create",
          method: "POST",
          endpointPath: "/menu/recipes",
          payload: sealJsonPayload({
            name: draft.name.trim(),
            description: draft.description.trim(),
            instructions: draft.instructions.trim(),
            supplies: draft.supplies,
          }),
          submittedDraftVersion,
          now,
        }),
        executeFinalStage: async ({ attempt }) => {
          if (!repository) {
            throw new Error("No se proporcionó el repositorio para crear recetas.");
          }
          if (attempt.payload.kind !== "json") {
            throw new Error("El intento de receta requiere un payload JSON sellado.");
          }
          const sealedDraft = attempt.payload.payloadSnapshot as RecipeDraft;
          return repository.createRecipe(sealedDraft, attempt.idempotencyKey);
        },
        classifyError: (err, attempt) =>
          analyzeIdempotentAttemptError(err, attempt.operationKind),
      });
    }
    return controllerRef.current;
  }

  function syncAttemptStateFromRecord(
    record: PendingOperationChainRecord<RecipeDraft> | null,
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

  useEffect(() => {
    activeRef.current = true;
    const dialog = dialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    nameRef.current?.focus();

    if (!activeRecipe) {
      const controller = getOrInitController();
      void controller
        .restoreFromStorage()
        .then((restored) => {
          if (!activeRef.current || !restored) return;
          const stage = restored.stages[restored.currentStageIndex];
          if (!stage || stage.status === "succeeded") return;
          if (!userEditedRef.current) {
            setName(restored.editableDraft.name);
            setDescription(restored.editableDraft.description);
            setInstructions(restored.editableDraft.instructions);
            if (restored.editableDraft.supplies && restored.editableDraft.supplies.length > 0) {
              setSupplies(
                restored.editableDraft.supplies.map((s) => ({
                  key: nextRowKey(),
                  inventoryItemId: s.inventoryItemId,
                  quantity: s.quantity,
                })),
              );
            }
          }
          syncAttemptStateFromRecord(restored);
          if (stage.lastErrorMessage) {
            setError(
              stage.lastErrorMessage.includes("No se pudo guardar la receta") ||
                stage.lastErrorCode === "INTERRUPTED_BY_RELOAD"
                ? stage.lastErrorMessage
                : `No se pudo guardar la receta. ${stage.lastErrorMessage}`,
            );
          }
        })
        .catch(() => {});
    }

    if (activeRecipe && repository) {
      const loadPromise = repository
        .getRecipe(activeRecipe.id)
        .then((versioned) => {
          if (!activeRef.current) return null;
          setOpeningEtag(versioned.etag);
          if ("instructions" in versioned.data && !instructions) {
            setInstructions(versioned.data.instructions);
          }
          return versioned;
        })
        .catch(() => null);
      openingLoadPromiseRef.current = loadPromise;
    }

    return () => {
      activeRef.current = false;
      controllerRef.current?.detachForReload();
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  useEffect(() => {
    if (retryCountdownMs <= 0) return;
    const interval = window.setInterval(() => {
      setRetryCountdownMs((prev) => {
        const next = Math.max(0, prev - 250);
        return next;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [retryCountdownMs]);

  function handleNameChange(val: string) {
    if (busy) return;
    userEditedRef.current = true;
    setName(val);
    if (!activeRecipe) {
      const draft: RecipeDraft = {
        name: val,
        description,
        instructions,
        supplies: supplies.map((s) => ({
          inventoryItemId: s.inventoryItemId,
          quantity: Number(s.quantity) || 0,
        })),
      };
      const controller = getOrInitController();
      void controller.updateEditableDraft(draft).catch(() => {});
    }
  }

  function handleDescriptionChange(val: string) {
    if (busy) return;
    userEditedRef.current = true;
    setDescription(val);
    if (!activeRecipe) {
      const draft: RecipeDraft = {
        name,
        description: val,
        instructions,
        supplies: supplies.map((s) => ({
          inventoryItemId: s.inventoryItemId,
          quantity: Number(s.quantity) || 0,
        })),
      };
      const controller = getOrInitController();
      void controller.updateEditableDraft(draft).catch(() => {});
    }
  }

  function handleInstructionsChange(val: string) {
    if (busy) return;
    userEditedRef.current = true;
    setInstructions(val);
    if (!activeRecipe) {
      const draft: RecipeDraft = {
        name,
        description,
        instructions: val,
        supplies: supplies.map((s) => ({
          inventoryItemId: s.inventoryItemId,
          quantity: Number(s.quantity) || 0,
        })),
      };
      const controller = getOrInitController();
      void controller.updateEditableDraft(draft).catch(() => {});
    }
  }

  function handleAddSupply() {
    if (busy) return;
    userEditedRef.current = true;
    const nextSupplies = [
      ...supplies,
      { key: nextRowKey(), inventoryItemId: "", quantity: 1 },
    ];
    setSupplies(nextSupplies);
    if (!activeRecipe) {
      const draft: RecipeDraft = {
        name,
        description,
        instructions,
        supplies: nextSupplies.map((s) => ({
          inventoryItemId: s.inventoryItemId,
          quantity: Number(s.quantity) || 0,
        })),
      };
      const controller = getOrInitController();
      void controller.updateEditableDraft(draft).catch(() => {});
    }
  }

  function handleRemoveSupply(index: number) {
    if (busy) return;
    userEditedRef.current = true;
    const nextSupplies = supplies.filter((_, i) => i !== index);
    setSupplies(nextSupplies);
    if (!activeRecipe) {
      const draft: RecipeDraft = {
        name,
        description,
        instructions,
        supplies: nextSupplies.map((s) => ({
          inventoryItemId: s.inventoryItemId,
          quantity: Number(s.quantity) || 0,
        })),
      };
      const controller = getOrInitController();
      void controller.updateEditableDraft(draft).catch(() => {});
    }
  }

  function handleSupplyChange(
    index: number,
    field: "inventoryItemId" | "quantity",
    value: string,
  ) {
    if (busy) return;
    userEditedRef.current = true;
    const nextSupplies = supplies.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    setSupplies(nextSupplies);
    if (!activeRecipe) {
      const draft: RecipeDraft = {
        name,
        description,
        instructions,
        supplies: nextSupplies.map((s) => ({
          inventoryItemId: s.inventoryItemId,
          quantity: Number(s.quantity) || 0,
        })),
      };
      const controller = getOrInitController();
      void controller.updateEditableDraft(draft).catch(() => {});
    }
  }

  function getUnitForItem(inventoryItemId: string) {
    if (!inventoryItemId) return "--";
    const found = inventoryItems.find((item) => item.id === inventoryItemId);
    if (found) return found.unit;
    const fromRecipe = activeRecipe?.supplies?.find(
      (s) => s.inventoryItemId === inventoryItemId,
    )?.inventoryItem;
    return fromRecipe?.unit ?? "--";
  }

  function validateDraft(): {
    ok: boolean;
    error?: string;
    cleanName?: string;
    cleanDescription?: string;
    cleanInstructions?: string;
    parsedSupplies?: RecipeSupplyInput[];
  } {
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanInstructions = instructions.trim();

    if (!cleanName) {
      nameRef.current?.focus();
      return { ok: false, error: "Indica el nombre de la receta." };
    }
    if (!cleanDescription) {
      return { ok: false, error: "Indica la descripción de la receta." };
    }
    if (!cleanInstructions) {
      return { ok: false, error: "Indica las instrucciones de la receta." };
    }
    if (supplies.length === 0) {
      return { ok: false, error: "Agrega al menos un ingrediente del inventario." };
    }

    const parsedSupplies: RecipeSupplyInput[] = [];
    for (const supply of supplies) {
      if (!supply.inventoryItemId) {
        return {
          ok: false,
          error: "Selecciona un artículo de inventario para cada ingrediente.",
        };
      }
      const qty = Number(supply.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return {
          ok: false,
          error: "La cantidad de cada ingrediente debe ser mayor a 0.",
        };
      }
      parsedSupplies.push({
        inventoryItemId: supply.inventoryItemId,
        quantity: qty,
      });
    }

    return {
      ok: true,
      cleanName,
      cleanDescription,
      cleanInstructions,
      parsedSupplies,
    };
  }

  function handleVoluntaryClose() {
    if (busy) return;
    activeRef.current = false;
    if (controllerRef.current) {
      void controllerRef.current.abandonFlow().catch(() => {});
    }
    onClose();
  }

  async function handleStartNewOperation() {
    if (controllerRef.current) {
      await controllerRef.current.abandonFlow().catch(() => {});
      controllerRef.current = null;
    }
    setPendingAttempt(null);
    setRetryCountdownMs(0);
    setError("");
  }

  async function executeCreationFlow(action: "submit" | "retry") {
    const validation = validateDraft();
    if (!validation.ok) {
      setError(validation.error!);
      return;
    }

    const cleanDraft: RecipeDraft = {
      name: validation.cleanName!,
      description: validation.cleanDescription!,
      instructions: validation.cleanInstructions!,
      supplies: validation.parsedSupplies!,
    };

    setBusy(true);
    setError("");
    setInfoNotice("");

    // Fallback if repository is not passed and onSubmit is provided
    if (!repository && onSubmit) {
      try {
        await onSubmit(cleanDraft);
        onClose();
      } catch {
        setError("No se pudo guardar la receta. Verifica los datos y vuelve a intentarlo.");
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const controller = getOrInitController();

      const result =
        action === "retry" && controller.getRecord()
          ? await controller.retryPending()
          : await controller.submit();

      if (!activeRef.current) return;

      if (result.status === "succeeded" && result.result) {
        setPendingAttempt(null);
        if (result.hasDraftChangesSinceSubmission) {
          setActiveRecipe(result.result);
          setOpeningEtag(undefined);
          setInfoNotice(
            "La receta fue creada en el servidor mientras editabas. Los cambios nuevos están conservados; guárdalos explícitamente para actualizarla.",
          );
          onCreatedWithPendingEdits?.(result.result);
        } else {
          onCreated?.(result.result);
          onClose();
        }
      } else {
        const stage = controller.getCurrentAttempt() ?? result.record?.stages[result.record.currentStageIndex] ?? null;
        setPendingAttempt(stage);
        if (stage?.retryAfterUntil) {
          setRetryCountdownMs(Math.max(0, stage.retryAfterUntil - Date.now()));
        }
        setError(stage?.lastErrorMessage || result.outcome?.message || "No se pudo crear la receta. Vuelve a intentarlo.");
      }
    } catch (err) {
      if (!activeRef.current) return;
      if (err instanceof PreSendStorageError || err instanceof OperationRetryBlockedError) {
        setError(err.message);
        if (err instanceof OperationRetryBlockedError && err.remainingRetryAfterMs > 0) {
          setRetryCountdownMs(err.remainingRetryAfterMs);
        }
        return;
      }
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Error inesperado al crear la receta.";
      setError(message);
    } finally {
      if (activeRef.current) {
        setBusy(false);
      }
    }
  }

  async function executeEditSave() {
    if (!activeRecipe) return;

    const validation = validateDraft();
    if (!validation.ok) {
      setError(validation.error!);
      return;
    }

    const cleanDraft: RecipeDraft = {
      name: validation.cleanName!,
      description: validation.cleanDescription!,
      instructions: validation.cleanInstructions!,
      supplies: validation.parsedSupplies!,
    };

    setBusy(true);
    setError("");
    setInfoNotice("");

    // Fallback if repository is not passed and onSubmit is provided
    if (!repository && onSubmit) {
      try {
        await onSubmit(cleanDraft);
        onClose();
      } catch {
        setError("No se pudo guardar la receta. Verifica los datos y vuelve a intentarlo.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!repository) {
      setError("No se puede editar la receta sin un repositorio configurado.");
      setBusy(false);
      return;
    }

    try {
      let etagToUse = openingEtag;
      if (!isStrongEtag(etagToUse)) {
        if (openingLoadPromiseRef.current) {
          const loaded = await openingLoadPromiseRef.current;
          if (loaded?.etag && isStrongEtag(loaded.etag)) {
            etagToUse = loaded.etag;
            setOpeningEtag(loaded.etag);
          }
        }
      }

      if (!isStrongEtag(etagToUse)) {
        setReviewRequired(true);
        setError(
          "No se recibió la versión de la receta (se requiere una versión fuerte). Revisa los datos actuales antes de guardar.",
        );
        return;
      }

      const updated = await repository.updateRecipe(activeRecipe.id, cleanDraft, etagToUse);
      if (!activeRef.current) return;
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      if (!activeRef.current) return;
      const analysis = analyzeNonIdempotentWriteError(err);
      if (analysis.requiresResourceReload) {
        setReviewRequired(true);
      }
      setError(`No se pudo guardar la receta. ${analysis.message}`);
    } finally {
      if (activeRef.current) {
        setBusy(false);
      }
    }
  }

  async function handleReviewRecipe() {
    if (!activeRecipe || !repository || reviewLoading) return;
    setReviewLoading(true);
    setReviewError("");
    try {
      const current = await repository.getRecipe(activeRecipe.id);
      if (!activeRef.current) return;
      setReviewedResource(current);
    } catch {
      if (!activeRef.current) return;
      setReviewError("No se pudo consultar la receta actual. Inténtalo de nuevo.");
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
    setActiveRecipe(reviewedResource.data);
    setOpeningEtag(reviewedResource.etag);
    if (!keepDraft) {
      setName(reviewedResource.data.name);
      setDescription(reviewedResource.data.description ?? "");
      setInstructions(reviewedResource.data.instructions ?? "");
      if (reviewedResource.data.supplies?.length) {
        setSupplies(
          reviewedResource.data.supplies.map((s) => ({
            key: nextRowKey(),
            inventoryItemId: s.inventoryItemId,
            quantity: s.quantity,
          })),
        );
      }
    }
    setReviewedResource(null);
    setReviewRequired(false);
    setReviewError("");
    setError("");
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (activeRecipe) {
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

  const editing = Boolean(activeRecipe);
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

  let saveLabel = "Guardar receta";
  if (editing) saveLabel = "Guardar cambios";
  if (busy) saveLabel = "Guardando…";

  const reviewedEtagStrong = isStrongEtag(reviewedResource?.etag);

  return (
    <dialog
      ref={dialogRef}
      className="recipe-form-dialog"
      aria-labelledby="recipe-form-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          void handleVoluntaryClose();
        }
      }}
    >
      <div className="recipe-form-dialog__header">
        <h2 id="recipe-form-title">{editing ? "Editar receta" : "Nueva receta"}</h2>
        <button
          className="recipe-form-dialog__close"
          type="button"
          disabled={busy}
          onClick={() => {
            void handleVoluntaryClose();
          }}
          aria-label="Cerrar formulario"
        >
          ×
        </button>
      </div>

      <form noValidate onSubmit={(e) => void save(e)}>
        <div className="recipe-form-dialog__fields">
          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-name">Nombre</label>
            <input
              ref={nameRef}
              id="recipe-name"
              value={name}
              disabled={busy}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={255}
              placeholder="Ej. Hamburguesa Hawaiana"
              required
            />
          </div>

          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-description">Descripción</label>
            <textarea
              id="recipe-description"
              value={description}
              disabled={busy}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={2}
              placeholder="Descripción breve de la receta"
              required
            />
          </div>

          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-instructions">Instrucciones</label>
            <textarea
              id="recipe-instructions"
              value={instructions}
              disabled={busy}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              rows={3}
              placeholder="Pasos de preparación"
              required
            />
          </div>

          <fieldset className="recipe-supplies-section">
            <div className="recipe-supplies-section__header">
              <legend>Insumos del inventario</legend>
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={handleAddSupply}
                disabled={busy}
              >
                + Agregar insumo
              </button>
            </div>

            <table className="recipe-supplies-table">
              <thead>
                <tr>
                  <th scope="col">Insumo seleccionado</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">U. Medida</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((supply, index) => {
                  const unit = getUnitForItem(supply.inventoryItemId);
                  return (
                    <tr key={supply.key}>
                      <td>
                        <select
                          aria-label={`Insumo ${index + 1}`}
                          value={supply.inventoryItemId}
                          onChange={(e) =>
                            handleSupplyChange(index, "inventoryItemId", e.target.value)
                          }
                          disabled={busy}
                          required
                        >
                          <option value="">Seleccione insumo…</option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          aria-label={`Cantidad del insumo ${index + 1}`}
                          value={supply.quantity}
                          onChange={(e) =>
                            handleSupplyChange(index, "quantity", e.target.value)
                          }
                          disabled={busy}
                          required
                        />
                      </td>
                      <td className="recipe-supplies-table__unit">{unit}</td>
                      <td>
                        <button
                          type="button"
                          className="button button--quiet"
                          onClick={() => handleRemoveSupply(index)}
                          disabled={busy || supplies.length <= 1}
                          aria-label={`Eliminar insumo ${index + 1}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </fieldset>

          {infoNotice && (
            <output className="feedback feedback--success">{infoNotice}</output>
          )}

          {(error || showManualRetryButton || requiresNewOperationAction) && (
            <div className="recipe-form-dialog__error" role="alert">
              {error ? (
                <p>{error}</p>
              ) : (
                <p>Existe una operación pendiente de confirmación.</p>
              )}
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
                    void handleReviewRecipe();
                  }}
                >
                  Revisar receta actual
                </button>
              )}
            </div>
          )}

          {editing && reviewLoading && (
            <output className="feedback" aria-live="polite">
              Consultando la receta actual; tu borrador se conserva…
            </output>
          )}

          {editing && reviewError && (
            <p className="recipe-form-dialog__error" role="alert">
              {reviewError}
            </p>
          )}

          {editing && reviewedResource && (
            <section
              className="recipe-form-dialog__review"
              aria-label="Datos actuales de la receta"
            >
              <h3>Datos actuales de la receta</h3>
              <dl>
                <dt>Nombre</dt>
                <dd>{reviewedResource.data.name}</dd>
                <dt>Descripción</dt>
                <dd>{reviewedResource.data.description || "Sin descripción"}</dd>
                <dt>Instrucciones</dt>
                <dd>{reviewedResource.data.instructions || "Sin instrucciones"}</dd>
              </dl>
              <p>
                Tu borrador permanece en el formulario. Elige usar estos datos o conservar tu
                borrador con la versión que acabas de revisar.
              </p>
              {!reviewedEtagStrong && (
                <p>No se recibió una versión fuerte. Reintenta la consulta antes de continuar.</p>
              )}
              <div className="recipe-form-dialog__review-actions">
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

        <div className="recipe-form-dialog__actions">
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
