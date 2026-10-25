import { Icon } from "../../shared/Icon";
import { useTaskDialog } from "../../shared/useTaskDialog";
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
  getOrCreateTabId,
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
import { useRetryEligibility } from "../../shared/useRetryEligibility";
import { createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";

export interface RecipeFormDialogProps {
  openingResource?: VersionedResource<RecipeDetail>;
  recipe?: RecipeDetail | RecipeSummary | null;
  inventoryItems?: InventoryItem[];
  repository?: Pick<
    MenuRepository,
    "createRecipe" | "updateRecipe" | "getRecipe" | "listInventoryItems"
  >;
  onClose(): void;
  onCreated?(created: RecipeDetail): void;
  onCreatedWithPendingEdits?(created: RecipeDetail): void;
  onUpdated?(updated: RecipeDetail): void;
  storage?: PendingOperationStorageAdapter;
  initialPendingRecord?: PendingOperationChainRecord<RecipeDraft> | null;
  nestedContext?: Readonly<Record<string, unknown>>;
  onSubmit?(draft: RecipeDraft): Promise<void>;
}

export interface SupplyRow {
  key: string;
  inventoryItemId: string;
  quantity: string | number;
}

export function buildRecipeCreateScope(tabId = getOrCreateTabId()): OperationFlowScope {
  return {
    tabId,
    formKind: "recipe-form",
    resourceKey: "recipe-create",
  };
}

export function RecipeFormDialog({
  openingResource,
  recipe,
  inventoryItems,
  repository,
  onClose,
  onCreated,
  onCreatedWithPendingEdits,
  onUpdated,
  storage: providedStorage,
  initialPendingRecord,
  nestedContext,
  onSubmit,
}: Readonly<RecipeFormDialogProps>) {
  const [fallbackStorage] = useState(createIndexedDbPendingOperationStorage);
  const storage = providedStorage ?? fallbackStorage;
  const [activeRecipe, setActiveRecipe] = useState<RecipeDetail | RecipeSummary | undefined>(
    recipe ?? undefined,
  );

  const [knownItems, setKnownItems] = useState<Map<string, { id: string; name: string; unit: string }>>(() => {
    const map = new Map<string, { id: string; name: string; unit: string }>();
    if (inventoryItems) {
      for (const item of inventoryItems) {
        map.set(item.id, item);
      }
    }
    if (recipe?.supplies) {
      for (const s of recipe.supplies) {
        if (s.inventoryItem) {
          map.set(s.inventoryItemId, {
            id: s.inventoryItemId,
            name: s.inventoryItem.name || s.inventoryItemId,
            unit: s.inventoryItem.unit || "",
          });
        }
      }
    }
    return map;
  });

  const [itemsFromApi, setItemsFromApi] = useState<InventoryItem[] | null>(null);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryTotalPages, setInventoryTotalPages] = useState(1);
  const [inventorySearchDraft, setInventorySearchDraft] = useState("");
  const [confirmedInventoryQuery, setConfirmedInventoryQuery] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryRetryCount, setInventoryRetryCount] = useState(0);

  useEffect(() => {
    if (inventoryItems && inventoryItems.length > 0) {
      setKnownItems((prev) => {
        const next = new Map(prev);
        for (const item of inventoryItems) {
          next.set(item.id, item);
        }
        return next;
      });
    }
  }, [inventoryItems]);

  useEffect(() => {
    if (activeRecipe?.supplies) {
      setKnownItems((prev) => {
        const next = new Map(prev);
        for (const s of activeRecipe.supplies) {
          if (s.inventoryItem) {
            next.set(s.inventoryItemId, {
              id: s.inventoryItemId,
              name: s.inventoryItem.name || s.inventoryItemId,
              unit: s.inventoryItem.unit || "",
            });
          }
        }
        return next;
      });
    }
  }, [activeRecipe]);

  useEffect(() => {
    if (!repository?.listInventoryItems) return;
    const controller = new AbortController();
    setInventoryLoading(true);
    setInventoryError("");

    repository
      .listInventoryItems(
        {
          q: confirmedInventoryQuery || undefined,
          page: inventoryPage,
          pageSize: 50,
        },
        controller.signal,
      )
      .then((res) => {
        if (!controller.signal.aborted) {
          setItemsFromApi(res.data);
          setInventoryTotalPages(res.meta.totalPages || 1);
          setKnownItems((prev) => {
            const next = new Map(prev);
            for (const item of res.data) {
              next.set(item.id, item);
            }
            return next;
          });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          setInventoryError(`No se pudieron cargar los artículos de inventario. ${message}`);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setInventoryLoading(false);
        }
      });

    return () => controller.abort();
  }, [repository, inventoryPage, confirmedInventoryQuery, inventoryRetryCount]);

  const currentInventoryItems = itemsFromApi ?? inventoryItems ?? [];

  const initialDraft = initialPendingRecord?.editableDraft;

  const initialSuppliesCount =
    recipe?.supplies && recipe.supplies.length > 0
      ? recipe.supplies.length
      : initialDraft?.supplies && initialDraft.supplies.length > 0
        ? initialDraft.supplies.length
        : 1;
  const rowCounterRef = useRef(initialSuppliesCount);

  function createNextRowKey(): string {
    rowCounterRef.current += 1;
    return `supply-row-${rowCounterRef.current}`;
  }

  const isSubmittingRef = useRef(false);

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
      return recipe.supplies.map((s, idx) => ({
        key: `supply-row-${idx + 1}`,
        inventoryItemId: s.inventoryItemId,
        quantity: s.quantity,
      }));
    }
    if (initialDraft?.supplies && initialDraft.supplies.length > 0) {
      return initialDraft.supplies.map((s, idx) => ({
        key: `supply-row-${idx + 1}`,
        inventoryItemId: s.inventoryItemId,
        quantity: s.quantity,
      }));
    }
    return [{ key: "supply-row-1", inventoryItemId: "", quantity: 1 }];
  });

  const [busy, setBusy] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const validationSummaryRef = useRef<HTMLDivElement>(null);
  const fieldErrors: Record<string, string> = {};
  if (validationAttempt > 0) {
    if (!name.trim()) fieldErrors["recipe-name"] = "Indica el nombre de la receta.";
    if (!description.trim()) fieldErrors["recipe-description"] = "Indica la descripción de la receta.";
    if (!instructions.trim()) fieldErrors["recipe-instructions"] = "Indica las instrucciones de la receta.";
    if (supplies.length === 0) fieldErrors["recipe-add-supply"] = "Agrega al menos un ingrediente del inventario.";
    for (const supply of supplies) {
      if (!supply.inventoryItemId) fieldErrors[`${supply.key}-item`] = "Selecciona un artículo de inventario para cada ingrediente.";
      const quantity = Number(supply.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) fieldErrors[`${supply.key}-quantity`] = "La cantidad de cada ingrediente debe ser mayor a 0.";
    }
  }
  useEffect(() => {
    if (validationAttempt > 0) validationSummaryRef.current?.focus();
  }, [validationAttempt]);
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
  // Edit version & review state
  const [openingEtag, setOpeningEtag] = useState<string | undefined>(openingResource?.etag);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewedResource, setReviewedResource] =
    useState<VersionedResource<RecipeDetail> | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useTaskDialog(dialogRef, true, nameRef);
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
        retainConfirmedResult: true,
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

      return;
    }
    const stage = record.stages[record.currentStageIndex] ?? null;
    setPendingAttempt(stage);

  }

  useEffect(() => {
    activeRef.current = true;

    if (!activeRecipe) {
      const controller = getOrInitController();
      void controller
        .restoreFromStorage()
        .then((restored) => {
          if (!activeRef.current || controllerRef.current !== controller || !restored) return;
          const stage = restored.stages[restored.currentStageIndex];
          if (!stage) return;
          if (!userEditedRef.current) {
            setName(restored.editableDraft.name);
            setDescription(restored.editableDraft.description);
            setInstructions(restored.editableDraft.instructions);
            if (restored.editableDraft.supplies && restored.editableDraft.supplies.length > 0) {
              rowCounterRef.current = Math.max(
                rowCounterRef.current,
                restored.editableDraft.supplies.length,
              );
              setSupplies(
                restored.editableDraft.supplies.map((s, idx) => ({
                  key: `supply-row-restored-${idx + 1}`,
                  inventoryItemId: s.inventoryItemId,
                  quantity: s.quantity,
                })),
              );
            }
          }
          syncAttemptStateFromRecord(restored);
          if (stage.status === "succeeded" && restored.confirmedResult) {
            setActiveRecipe(restored.confirmedResult as RecipeDetail);
            setOpeningEtag((restored.confirmedResult as RecipeDetail).etag);
            setReviewRequired(!isStrongEtag((restored.confirmedResult as RecipeDetail).etag));
            setInfoNotice("La receta ya fue creada. Conservamos tus cambios posteriores; revisa la versión actual antes de guardarlos.");
          }
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

    if (activeRecipe && repository && !openingResource) {
      const loadPromise = repository
        .getRecipe(activeRecipe.id)
        .then((versioned) => {
          if (!activeRef.current) return null;
          // The version and every editable field must come from the same read.
          if (userEditedRef.current) {
            setReviewRequired(true);
            return null;
          }
          setOpeningEtag(versioned.etag);
          setActiveRecipe(versioned.data);
          setName(versioned.data.name);
          setDescription(versioned.data.description);
          setInstructions(versioned.data.instructions);
          setSupplies(versioned.data.supplies.map((s, idx) => ({
            key: `supply-row-opening-${idx + 1}`,
            inventoryItemId: s.inventoryItemId,
            quantity: s.quantity,
          })));
          return versioned;
        })
        .catch(() => null);
      openingLoadPromiseRef.current = loadPromise;
    }

    return () => {
      activeRef.current = false;
      controllerRef.current?.detachForReload();
      // Effect setup may run again with the same refs in StrictMode.
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (activeRecipe && controllerRef.current?.getRecord()?.confirmedResult) {
      void controllerRef.current.updateEditableDraft(getCurrentDraft());
    }
  }, [name, description, instructions, supplies, activeRecipe]);

  function handleNameChange(val: string) {
    if (busy || isSubmittingRef.current) return;
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
    if (busy || isSubmittingRef.current) return;
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
    if (busy || isSubmittingRef.current) return;
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
    if (busy || isSubmittingRef.current) return;
    userEditedRef.current = true;
    const nextSupplies = [
      ...supplies,
      { key: createNextRowKey(), inventoryItemId: "", quantity: 1 },
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
    if (busy || isSubmittingRef.current) return;
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
    if (busy || isSubmittingRef.current) return;
    userEditedRef.current = true;
    if (field === "inventoryItemId" && value) {
      const selected = currentInventoryItems.find((i) => i.id === value);
      if (selected) {
        setKnownItems((prev) => new Map(prev).set(selected.id, selected));
      }
    }
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
    const found = currentInventoryItems.find((item) => item.id === inventoryItemId);
    if (found) return found.unit;
    const known = knownItems.get(inventoryItemId);
    if (known?.unit) return known.unit;
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
    setValidationAttempt(attempt => attempt + 1);
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanInstructions = instructions.trim();

    if (!cleanName) {
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
    if (busy || isSubmittingRef.current) return;
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

    setError("");
  }

  async function executeCreationFlow(action: "submit" | "retry") {
    if (isSubmittingRef.current) return;
    const recovering = action === "retry" && repository && controllerRef.current?.getRecord();
    const validation = recovering ? null : validateDraft();
    if (validation && !validation.ok) {
      setError("");
      return;
    }

    const cleanDraft: RecipeDraft = validation ? {
      name: validation.cleanName!,
      description: validation.cleanDescription!,
      instructions: validation.cleanInstructions!,
      supplies: validation.parsedSupplies!,
    } : getCurrentDraft();

    isSubmittingRef.current = true;
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
        isSubmittingRef.current = false;
        setBusy(false);
      }
      return;
    }

    try {
      const controller = getOrInitController();

      if (controller.getCurrentAttempt()?.status === "pre_commit_rejected") {
        await controller.startNewAttemptFromEditableDraft();
      }

      const result =
        action === "retry" && controller.getRecord()
          ? await controller.retryPending()
          : await controller.submit();

      if (!activeRef.current) return;

      if (result.status === "succeeded" && result.result) {
        setPendingAttempt(null);
        if (result.hasDraftChangesSinceSubmission) {
          setActiveRecipe(result.result);
          setOpeningEtag(result.result.etag);
          setReviewRequired(!isStrongEtag(result.result.etag));
          setInfoNotice(
            "La receta fue creada en el servidor mientras editabas. Los cambios nuevos están conservados; guárdalos explícitamente para actualizarla.",
          );
          onCreatedWithPendingEdits?.(result.result);
        } else {
          await controller.abandonFlow().catch(() => {});
          if (!activeRef.current) return;
          onCreated?.(result.result);
          onClose();
        }
      } else {
        const stage = controller.getCurrentAttempt() ?? result.record?.stages[result.record.currentStageIndex] ?? null;
        setPendingAttempt(stage);
        setError(stage?.lastErrorMessage || result.outcome?.message || "No se pudo crear la receta. Vuelve a intentarlo.");
      }
    } catch (err) {
      if (!activeRef.current) return;
      if (err instanceof PreSendStorageError || err instanceof OperationRetryBlockedError) {
        setError(err.message);
        return;
      }
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Error inesperado al crear la receta.";
      setError(message);
    } finally {
      isSubmittingRef.current = false;
      if (activeRef.current) {
        setBusy(false);
      }
    }
  }

  async function executeEditSave() {
    if (!activeRecipe || isSubmittingRef.current) return;

    const validation = validateDraft();
    if (!validation.ok) {
      setError("");
      return;
    }

    const cleanDraft: RecipeDraft = {
      name: validation.cleanName!,
      description: validation.cleanDescription!,
      instructions: validation.cleanInstructions!,
      supplies: validation.parsedSupplies!,
    };

    isSubmittingRef.current = true;
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
        isSubmittingRef.current = false;
        setBusy(false);
      }
      return;
    }

    if (!repository) {
      setError("No se puede editar la receta sin un repositorio configurado.");
      isSubmittingRef.current = false;
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
      await controllerRef.current?.abandonFlow().catch(() => {});
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
      isSubmittingRef.current = false;
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
        rowCounterRef.current = Math.max(
          rowCounterRef.current,
          reviewedResource.data.supplies.length,
        );
        setSupplies(
          reviewedResource.data.supplies.map((s, idx) => ({
            key: `supply-row-reviewed-${idx + 1}`,
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
    if (busy || isSubmittingRef.current) return;
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
  const retryEligibility = useRetryEligibility(pendingAttempt) ?? { allowed: true, remainingRetryAfterMs: 0 };
  const retryCountdownMs = retryEligibility.remainingRetryAfterMs;
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
      className="recipe-form-dialog menu-task-dialog"
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
          <Icon name="close" />
        </button>
      </div>

      <form noValidate onSubmit={(e) => void save(e)}>
        <div className="recipe-form-dialog__fields">
          {Object.keys(fieldErrors).length > 0 && (
            <div ref={validationSummaryRef} className="recipe-validation-summary" role="alert" aria-labelledby="recipe-validation-title" tabIndex={-1}>
              <h3 id="recipe-validation-title">Revisa los campos de la receta</h3>
              <ul>{Object.entries(fieldErrors).map(([id, message]) => {
                const rowIndex = supplies.findIndex(supply => id.startsWith(`${supply.key}-`));
                return <li key={id}><a href={`#${id}`} onClick={event => {
                  event.preventDefault();
                  document.getElementById(id)?.focus();
                }}>{rowIndex >= 0 ? `Insumo ${rowIndex + 1}: ${message}` : message}</a></li>;
              })}</ul>
            </div>
          )}
          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-name">Nombre</label>
            <input
              ref={nameRef}
              id="recipe-name"
              aria-invalid={Boolean(fieldErrors["recipe-name"])}
              aria-describedby={fieldErrors["recipe-name"] ? "recipe-name-error" : undefined}
              value={name}
              disabled={busy}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={255}
              placeholder="Ej. Hamburguesa Hawaiana"
              required
            />
            {fieldErrors["recipe-name"] && <p className="recipe-field-error" id="recipe-name-error">{fieldErrors["recipe-name"]}</p>}
          </div>

          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-description">Descripción</label>
            <textarea
              id="recipe-description"
              aria-invalid={Boolean(fieldErrors["recipe-description"])}
              aria-describedby={fieldErrors["recipe-description"] ? "recipe-description-error" : undefined}
              value={description}
              disabled={busy}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={2}
              placeholder="Descripción breve de la receta"
              required
            />
            {fieldErrors["recipe-description"] && <p className="recipe-field-error" id="recipe-description-error">{fieldErrors["recipe-description"]}</p>}
          </div>

          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-instructions">Instrucciones</label>
            <textarea
              id="recipe-instructions"
              aria-invalid={Boolean(fieldErrors["recipe-instructions"])}
              aria-describedby={fieldErrors["recipe-instructions"] ? "recipe-instructions-error" : undefined}
              value={instructions}
              disabled={busy}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              rows={3}
              placeholder="Pasos de preparación"
              required
            />
            {fieldErrors["recipe-instructions"] && <p className="recipe-field-error" id="recipe-instructions-error">{fieldErrors["recipe-instructions"]}</p>}
          </div>

          <fieldset className="recipe-supplies-section">
            <legend>Insumos del inventario</legend>
            <div className="recipe-supplies-section__header">
              <button
                type="button"
                className="button button--secondary button--small"
                aria-label="+ Agregar insumo"
                id="recipe-add-supply"
                aria-describedby={fieldErrors["recipe-add-supply"] ? "recipe-supplies-error" : undefined}
                onClick={handleAddSupply}
                disabled={busy}
              >
                <Icon name="add" /> Agregar insumo
              </button>
            </div>
            {fieldErrors["recipe-add-supply"] && <p className="recipe-field-error" id="recipe-supplies-error">{fieldErrors["recipe-add-supply"]}</p>}

            {inventoryError && (
              <div className="feedback feedback--error" role="alert" style={{ marginBottom: "0.75rem" }}>
                <span>{inventoryError}</span>{" "}
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => setInventoryRetryCount((c) => c + 1)}
                >
                  Reintentar
                </button>
              </div>
            )}
            {inventoryLoading && <output className="feedback">Cargando insumos…</output>}

            <div className="recipe-inventory-controls" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <input
                type="search"
                aria-label="Buscar insumos de inventario"
                placeholder="Filtrar insumos de inventario…"
                value={inventorySearchDraft}
                onChange={(e) => setInventorySearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setConfirmedInventoryQuery(inventorySearchDraft.trim());
                    setInventoryPage(1);
                  }
                }}
                disabled={busy}
              />
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={() => {
                  setConfirmedInventoryQuery(inventorySearchDraft.trim());
                  setInventoryPage(1);
                }}
                disabled={busy || inventoryLoading}
              >
                Buscar insumos
              </button>
              {inventoryTotalPages > 1 && (
                <nav className="pagination" aria-label="Páginas de inventario" style={{ marginLeft: "auto", display: "flex", gap: "0.25rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="button button--secondary button--small"
                    disabled={inventoryPage <= 1 || inventoryLoading || busy}
                    onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior de inventario"
                  >
                    Anterior
                  </button>
                  <span className="pagination__info">
                    Página {inventoryPage} de {inventoryTotalPages}
                  </span>
                  <button
                    type="button"
                    className="button button--secondary button--small"
                    disabled={inventoryPage >= inventoryTotalPages || inventoryLoading || busy}
                    onClick={() => setInventoryPage((p) => p + 1)}
                    aria-label="Siguiente página de inventario"
                  >
                    Siguiente
                  </button>
                </nav>
              )}
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
                      <td data-label="Insumo seleccionado">
                        <select
                          id={`${supply.key}-item`}
                          aria-invalid={Boolean(fieldErrors[`${supply.key}-item`])}
                          aria-describedby={fieldErrors[`${supply.key}-item`] ? `${supply.key}-item-error` : undefined}
                          aria-label={`Insumo ${index + 1}`}
                          value={supply.inventoryItemId}
                          onChange={(e) =>
                            handleSupplyChange(index, "inventoryItemId", e.target.value)
                          }
                          disabled={busy}
                          required
                        >
                          <option value="">Seleccione insumo…</option>
                          {supply.inventoryItemId &&
                            !currentInventoryItems.some((item) => item.id === supply.inventoryItemId) && (
                              <option key={supply.inventoryItemId} value={supply.inventoryItemId}>
                                {knownItems.get(supply.inventoryItemId)?.name ||
                                  activeRecipe?.supplies?.find((s) => s.inventoryItemId === supply.inventoryItemId)
                                    ?.inventoryItem?.name ||
                                  supply.inventoryItemId}
                              </option>
                            )}
                          {currentInventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        {fieldErrors[`${supply.key}-item`] && <p className="recipe-field-error" id={`${supply.key}-item-error`}>{fieldErrors[`${supply.key}-item`]}</p>}
                      </td>
                      <td data-label="Cantidad">
                        <input
                          id={`${supply.key}-quantity`}
                          aria-invalid={Boolean(fieldErrors[`${supply.key}-quantity`])}
                          aria-describedby={fieldErrors[`${supply.key}-quantity`] ? `${supply.key}-quantity-error` : undefined}
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
                        {fieldErrors[`${supply.key}-quantity`] && <p className="recipe-field-error" id={`${supply.key}-quantity-error`}>{fieldErrors[`${supply.key}-quantity`]}</p>}
                      </td>
                      <td data-label="U. Medida" className="recipe-supplies-table__unit">{unit}</td>
                      <td data-label="Acción">
                        <button
                          type="button"
                          className="button button--quiet"
                          onClick={() => handleRemoveSupply(index)}
                          disabled={busy || supplies.length <= 1}
                          aria-label={`Eliminar insumo ${index + 1}`}
                        >
                          <Icon name="close" />
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
