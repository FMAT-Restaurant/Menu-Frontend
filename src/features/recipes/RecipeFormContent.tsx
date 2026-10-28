import { sameDraft, useEditGuard } from "../../shared/editGuard";
import { Icon } from "../../shared/Icon";
import { useEffect, useRef, useState, useImperativeHandle, type ChangeEvent, type Ref, type SubmitEvent } from "react";
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
  type OperationExecutionResult,
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
import { InventoryPage } from "../inventory/InventoryPage";

export interface RecipeFormContentHandle {
  back(): void;
  discard(): boolean;
  isBlocked(): boolean;
  hasChanges(): boolean;
}

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

type EditableRecipeFields = Partial<Pick<RecipeDraft, "name" | "description" | "instructions">> & {
  supplies?: SupplyRow[];
};

interface RecipeDraftSnapshot {
  name: string;
  description: string;
  instructions: string;
  supplies: Array<{ inventoryItemId: string; quantity: string }>;
}

export function buildRecipeCreateScope(tabId = getOrCreateTabId()): OperationFlowScope {
  return {
    tabId,
    formKind: "recipe-form",
    resourceKey: "recipe-create",
  };
}

function recipeDetailDraft(recipe: RecipeDetail): RecipeDraftSnapshot {
  return {
    name: recipe.name,
    description: recipe.description ?? "",
    instructions: recipe.instructions ?? "",
    supplies: recipe.supplies.map(({ inventoryItemId, quantity }) => ({
      inventoryItemId,
      quantity: String(quantity),
    })),
  };
}

function initialRecipeSuppliesCount(
  recipe: RecipeDetail | RecipeSummary | null | undefined,
  draft: RecipeDraft | undefined,
): number {
  if (recipe?.supplies?.length) return recipe.supplies.length;
  if (draft?.supplies?.length) return draft.supplies.length;
  return 1;
}

function initialRecipeBaseDraft(
  confirmed: RecipeDetail | undefined,
  recipe: RecipeDetail | RecipeSummary | null | undefined,
  snapshot: RecipeDraftSnapshot,
): RecipeDraftSnapshot {
  if (confirmed) return recipeDetailDraft(confirmed);
  if (recipe) return snapshot;
  return { name: "", description: "", instructions: "", supplies: [{ inventoryItemId: "", quantity: "1" }] };
}

function recipeFieldErrors(
  attempt: number,
  name: string,
  description: string,
  instructions: string,
  supplies: SupplyRow[],
): Record<string, string> {
  if (attempt === 0) return {};
  const errors: Record<string, string> = {};
  if (!name.trim()) errors["recipe-name"] = "Indica el nombre de la receta.";
  if (!description.trim()) errors["recipe-description"] = "Indica la descripción de la receta.";
  if (!instructions.trim()) errors["recipe-instructions"] = "Indica las instrucciones de la receta.";
  if (supplies.length === 0) errors["recipe-add-supply"] = "Agrega al menos un insumo del inventario.";
  for (const supply of supplies) {
    if (!supply.inventoryItemId) errors[`${supply.key}-item`] = "Selecciona un insumo del inventario en cada fila.";
    const quantity = Number(supply.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) errors[`${supply.key}-quantity`] = "La cantidad de cada insumo debe ser mayor a 0.";
  }
  return errors;
}

export interface RecipeFormContentProps extends RecipeFormDialogProps {
  active?: boolean;
  onBack?(): void;
  sessionRef?: Ref<RecipeFormContentHandle>;
}

function recipeSubmissionMessage(
  showManualRetryButton: boolean,
  pendingAttempt: SealedOperationAttempt | null,
  error: string,
): string {
  if (showManualRetryButton) {
    return "No sabemos si se creó la receta. Reintentar recupera el mismo envío; tus cambios posteriores se conservan. No reintentaremos automáticamente.";
  }
  if (pendingAttempt?.status === "requires_new_key") {
    return "Este envío fue rechazado y no puede repetirse como está. Pulsa Iniciar nueva operación para preparar otro envío.";
  }
  return error || "Hay un envío sin confirmar. Reintentar recupera ese envío; tus cambios posteriores se conservan.";
}

interface RecipeTextFieldProps {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange(value: string): void;
  fieldErrors: Record<string, string>;
  inputRef?: Ref<HTMLInputElement>;
  rows?: number;
  maxLength?: number;
}

function RecipeTextField({
  id,
  label,
  value,
  disabled,
  placeholder,
  onChange,
  fieldErrors,
  inputRef,
  rows,
  maxLength,
}: Readonly<RecipeTextFieldProps>) {
  const error = fieldErrors[id];
  const errorId = `${id}-error`;
  const commonProps = {
    id,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    value,
    disabled,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    placeholder,
    required: true,
  };
  return <div className="recipe-form-dialog__field">
    <label htmlFor={id}>{label}</label>
    {rows ? <textarea {...commonProps} rows={rows} /> : <input {...commonProps} ref={inputRef} maxLength={maxLength} />}
    {error && <p className="recipe-field-error" id={errorId}>{error}</p>}
  </div>;
}

function RecipeValidationSummary({
  fieldErrors,
  supplies,
  summaryRef,
}: Readonly<{
  fieldErrors: Record<string, string>;
  supplies: SupplyRow[];
  summaryRef: Ref<HTMLDivElement>;
}>) {
  if (Object.keys(fieldErrors).length === 0) return null;
  return <div ref={summaryRef} className="recipe-validation-summary" role="alert" aria-labelledby="recipe-validation-title" tabIndex={-1}>
    <h3 id="recipe-validation-title">Revisa los campos de la receta</h3>
    <ul>{Object.entries(fieldErrors).map(([id, message]) => {
      const rowIndex = supplies.findIndex(supply => id.startsWith(`${supply.key}-`));
      const description = rowIndex >= 0 ? `Insumo ${rowIndex + 1}: ${message}` : message;
      return <li key={id}><a href={`#${id}`} onClick={event => {
        event.preventDefault();
        document.getElementById(id)?.focus();
      }}>{description}</a></li>;
    })}</ul>
  </div>;
}

interface RecipeSupplyTableProps {
  supplies: SupplyRow[];
  fieldErrors: Record<string, string>;
  currentInventoryItems: InventoryItem[];
  knownItems: Map<string, { id: string; name: string; unit: string }>;
  activeRecipe: RecipeDetail | RecipeSummary | undefined;
  busy: boolean;
  inventoryLoading: boolean;
  olderInventory: boolean;
  onSupplyChange(index: number, field: "inventoryItemId" | "quantity", value: string): void;
  onRemoveSupply(index: number): void;
  onOpenInventoryPicker?(index: number): void;
  getUnitForItem(inventoryItemId: string): string;
}

function RecipeSupplyTable({
  supplies,
  fieldErrors,
  currentInventoryItems,
  knownItems,
  activeRecipe,
  busy,
  inventoryLoading,
  olderInventory,
  onSupplyChange,
  onRemoveSupply,
  onOpenInventoryPicker,
  getUnitForItem,
}: Readonly<RecipeSupplyTableProps>) {
  return <table className="recipe-supplies-table">
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
        const itemError = fieldErrors[`${supply.key}-item`];
        const quantityError = fieldErrors[`${supply.key}-quantity`];
        const itemIsUnavailable = supply.inventoryItemId &&
          !currentInventoryItems.some(item => item.id === supply.inventoryItemId);
        const itemName = knownItems.get(supply.inventoryItemId)?.name ||
          activeRecipe?.supplies?.find(item => item.inventoryItemId === supply.inventoryItemId)?.inventoryItem?.name ||
          supply.inventoryItemId;
        return <tr key={supply.key}>
          <td data-label="Insumo seleccionado">
            <div className="recipe-supplies-table__item-control">
              <select id={`${supply.key}-item`} aria-invalid={Boolean(itemError)}
                aria-describedby={itemError ? `${supply.key}-item-error` : undefined}
                aria-label={`Insumo ${index + 1}`} value={supply.inventoryItemId}
                onChange={event => onSupplyChange(index, "inventoryItemId", event.target.value)}
                disabled={busy || inventoryLoading || olderInventory} required>
                <option value="">Seleccione insumo…</option>
                {itemIsUnavailable && <option value={supply.inventoryItemId}>{itemName}</option>}
                {currentInventoryItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {onOpenInventoryPicker && (
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => onOpenInventoryPicker(index)}
                  disabled={busy}
                  aria-label={`Buscar insumo ${index + 1} en inventario`}
                >
                  Buscar en inventario
                </button>
              )}
            </div>
            {itemError && <p className="recipe-field-error" id={`${supply.key}-item-error`}>{itemError}</p>}
          </td>
          <td data-label="Cantidad">
            <input id={`${supply.key}-quantity`} aria-invalid={Boolean(quantityError)}
              aria-describedby={quantityError ? `${supply.key}-quantity-error` : undefined}
              type="number" step="any" min="0" aria-label={`Cantidad del insumo ${index + 1}`}
              value={supply.quantity}
              onChange={event => onSupplyChange(index, "quantity", event.target.value)}
              disabled={busy} required />
            {quantityError && <p className="recipe-field-error" id={`${supply.key}-quantity-error`}>{quantityError}</p>}
          </td>
          <td data-label="U. Medida" className="recipe-supplies-table__unit">{unit}</td>
          <td data-label="Acción">
            <button type="button" className="button button--quiet" onClick={() => onRemoveSupply(index)}
              disabled={busy || supplies.length <= 1} aria-label={`Eliminar insumo ${index + 1}`}>
              <Icon name="close" />
            </button>
          </td>
        </tr>;
      })}
    </tbody>
  </table>;
}

interface RecipeInventoryControlsProps {
  inventoryError: string;
  inventoryLoading: boolean;
  inventoryCount: number;
  olderInventory: boolean;
  displayedInventory: { query: string; page: number } | null;
  inventorySearchDraft: string;
  inventoryPage: number;
  inventoryTotalPages: number;
  busy: boolean;
  onRetry(): void;
  onSearch(query: string): void;
  onSearchDraftChange(query: string): void;
  onPageChange(page: number | ((currentPage: number) => number)): void;
}

function RecipeInventoryControls({
  inventoryError,
  inventoryLoading,
  inventoryCount,
  olderInventory,
  displayedInventory,
  inventorySearchDraft,
  inventoryPage,
  inventoryTotalPages,
  busy,
  onRetry,
  onSearch,
  onSearchDraftChange,
  onPageChange,
}: Readonly<RecipeInventoryControlsProps>) {
  function submitSearch() {
    onSearch(inventorySearchDraft.trim());
  }

  return <>
    {inventoryError && <div className="feedback feedback--error" role="alert" style={{ marginBottom: "0.75rem" }}>
      <span>{inventoryError}</span>{" "}
      <button type="button" className="button button--secondary button--small" onClick={onRetry}>Reintentar</button>
    </div>}
    {inventoryLoading && inventoryCount === 0 && <output className="feedback">Cargando insumos…</output>}
    {inventoryLoading && inventoryCount > 0 && <output className="feedback">Actualizando insumos…</output>}
    {olderInventory && <p className="feedback">
      Opciones anteriores de insumos: {displayedInventory?.query ? `búsqueda “${displayedInventory.query}”` : "sin filtro"}, página {displayedInventory?.page}. Las selecciones y cantidades del borrador se conservan.
    </p>}
    <div className="recipe-inventory-controls" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
      <input type="search" aria-label="Buscar insumos de inventario" placeholder="Filtrar insumos de inventario…"
        value={inventorySearchDraft} onChange={event => onSearchDraftChange(event.target.value)}
        onKeyDown={event => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          submitSearch();
        }} disabled={busy} />
      <button type="button" className="button button--secondary button--small" onClick={submitSearch}
        disabled={busy || inventoryLoading}>Buscar insumos</button>
      {inventoryTotalPages > 1 && <nav className="pagination" aria-label="Páginas de inventario" style={{ marginLeft: "auto", display: "flex", gap: "0.25rem", alignItems: "center" }}>
        <button type="button" className="button button--secondary button--small"
          disabled={inventoryPage <= 1 || inventoryLoading || olderInventory || busy}
          onClick={() => onPageChange(currentPage => Math.max(1, currentPage - 1))} aria-label="Página anterior de inventario">
          Anterior
        </button>
        <span className="pagination__info">Página {displayedInventory?.page ?? inventoryPage} de {inventoryTotalPages}</span>
        <button type="button" className="button button--secondary button--small"
          disabled={inventoryPage >= inventoryTotalPages || inventoryLoading || olderInventory || busy}
          onClick={() => onPageChange(currentPage => currentPage + 1)} aria-label="Siguiente página de inventario">
          Siguiente
        </button>
      </nav>}
    </div>
  </>;
}

interface RecipeOperationFeedbackProps {
  infoNotice: string;
  error: string;
  showManualRetryButton: boolean;
  requiresNewOperationAction: boolean;
  retryCountdownMs: number;
  retryDisabled: boolean;
  busy: boolean;
  editing: boolean;
  reviewRequired: boolean;
  reviewLoading: boolean;
  reviewError: string;
  reviewedResource: VersionedResource<RecipeDetail> | null;
  reviewedEtagStrong: boolean;
  pendingAttempt: SealedOperationAttempt | null;
  onRetry(): void;
  onStartNewOperation(): void;
  onReview(): void;
  onAdoptReview(keepDraft: boolean): void;
}

function RecipeOperationFeedback({
  infoNotice,
  error,
  showManualRetryButton,
  requiresNewOperationAction,
  retryCountdownMs,
  retryDisabled,
  busy,
  editing,
  reviewRequired,
  reviewLoading,
  reviewError,
  reviewedResource,
  reviewedEtagStrong,
  pendingAttempt,
  onRetry,
  onStartNewOperation,
  onReview,
  onAdoptReview,
}: Readonly<RecipeOperationFeedbackProps>) {
  return <>
    {infoNotice && <output className="feedback feedback--success">{infoNotice}</output>}
    {(error || showManualRetryButton || requiresNewOperationAction) && <div className="recipe-form-dialog__error" role="alert">
      <p>{recipeSubmissionMessage(showManualRetryButton, pendingAttempt, error)}</p>
      {showManualRetryButton && retryCountdownMs > 0 && <p>Espera {Math.ceil(retryCountdownMs / 1000)} s antes de volver a intentar.</p>}
      {showManualRetryButton && <button className="button button--secondary" type="button" disabled={retryDisabled} onClick={onRetry}>Reintentar</button>}
      {requiresNewOperationAction && <button className="button button--secondary" type="button" disabled={busy} onClick={onStartNewOperation}>Iniciar nueva operación</button>}
      {editing && reviewRequired && <button className="button button--secondary" type="button" disabled={reviewLoading} onClick={onReview}>Revisar receta actual</button>}
    </div>}
    {editing && reviewLoading && <output className="feedback" aria-live="polite">
      Consultando la receta actual; tu borrador se conserva…
    </output>}
    {editing && reviewError && <p className="recipe-form-dialog__error" role="alert">{reviewError}</p>}
    {editing && reviewedResource && <section className="recipe-form-dialog__review" aria-label="Datos actuales de la receta">
      <h3>Datos actuales de la receta</h3>
      <dl>
        <dt>Nombre</dt>
        <dd>{reviewedResource.data.name}</dd>
        <dt>Descripción</dt>
        <dd>{reviewedResource.data.description || "Sin descripción"}</dd>
        <dt>Instrucciones</dt>
        <dd>{reviewedResource.data.instructions || "Sin instrucciones"}</dd>
      </dl>
      <p>Tu borrador permanece en el formulario. Elige usar estos datos o conservar tu borrador con la versión que acabas de revisar.</p>
      {!reviewedEtagStrong && <p>No pudimos comprobar la versión actual. Reintenta la consulta antes de continuar.</p>}
      <div className="recipe-form-dialog__review-actions">
        <button type="button" disabled={!reviewedEtagStrong || reviewLoading} onClick={() => onAdoptReview(false)}>Usar datos actuales</button>
        <button type="button" disabled={!reviewedEtagStrong || reviewLoading} onClick={() => onAdoptReview(true)}>Continuar con mi borrador y versión revisada</button>
      </div>
    </section>}
  </>;
}

/** Owns one recipe editing/recovery session independently of its modal host. */
export function RecipeFormContent({
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
  active = true,
  onBack,
  sessionRef,
}: Readonly<RecipeFormContentProps>) {
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
  const [displayedInventory, setDisplayedInventory] = useState<{ query: string; page: number } | null>(null);
  const [inventorySearchDraft, setInventorySearchDraft] = useState("");
  const [confirmedInventoryQuery, setConfirmedInventoryQuery] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryRetryCount, setInventoryRetryCount] = useState(0);
  const [pickingSupplyIndex, setPickingSupplyIndex] = useState<number | null>(null);

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
          setDisplayedInventory({ query: confirmedInventoryQuery, page: inventoryPage });
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
  const olderInventory = Boolean(displayedInventory && (displayedInventory.query !== confirmedInventoryQuery || displayedInventory.page !== inventoryPage));

  const initialDraft = initialPendingRecord?.editableDraft;

  const initialSuppliesCount = initialRecipeSuppliesCount(recipe, initialDraft);
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

  const snapshot = { name, description, instructions, supplies: supplies.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity: String(quantity) })) };
  const initialConfirmed = initialPendingRecord?.confirmedResult as RecipeDetail | undefined;
  const baseDraft = useRef(initialRecipeBaseDraft(initialConfirmed, recipe, snapshot));
  const exitSucceeded = useRef(false);
  const [busy, setBusy] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const backConfirmRef = useRef<HTMLButtonElement>(null);
  const previousBackConfirmRef = useRef(false);
  useEffect(() => {
    if (confirmBack) backConfirmRef.current?.focus();
    else if (active && previousBackConfirmRef.current) nameRef.current?.focus();
    previousBackConfirmRef.current = confirmBack;
  }, [active, confirmBack]);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const validationSummaryRef = useRef<HTMLDivElement>(null);
  const fieldErrors = recipeFieldErrors(validationAttempt, name, description, instructions, supplies);
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
        return "Hay un envío sin confirmar. Reintentar recupera ese envío; tus cambios posteriores se conservan.";
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
  const [exitUncertain, setExitUncertain] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewedResource, setReviewedResource] =
    useState<VersionedResource<RecipeDetail> | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active) nameRef.current?.focus({ preventScroll: true });
  }, [active]);
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
    controllerRef.current ??= createOperationAttemptController<RecipeDraft, RecipeDetail>({
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
            const confirmed = restored.confirmedResult as RecipeDetail;
            baseDraft.current = recipeDetailDraft(confirmed);
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
          baseDraft.current = recipeDetailDraft(versioned.data);
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

  function markUserEdit(): boolean {
    if (busy || isSubmittingRef.current) return false;
    userEditedRef.current = true;
    return true;
  }

  function persistEditableDraft(fields: EditableRecipeFields = {}) {
    if (activeRecipe) return;
    const draft: RecipeDraft = {
      name: fields.name ?? name,
      description: fields.description ?? description,
      instructions: fields.instructions ?? instructions,
      supplies: (fields.supplies ?? supplies).map((supply) => ({
        inventoryItemId: supply.inventoryItemId,
        quantity: Number(supply.quantity) || 0,
      })),
    };
    void getOrInitController().updateEditableDraft(draft).catch(() => {});
  }

  function handleNameChange(val: string) {
    if (!markUserEdit()) return;
    setName(val);
    persistEditableDraft({ name: val });
  }

  function handleDescriptionChange(val: string) {
    if (!markUserEdit()) return;
    setDescription(val);
    persistEditableDraft({ description: val });
  }

  function handleInstructionsChange(val: string) {
    if (!markUserEdit()) return;
    setInstructions(val);
    persistEditableDraft({ instructions: val });
  }

  function handleAddSupply() {
    if (!markUserEdit()) return;
    const nextSupplies = [
      ...supplies,
      { key: createNextRowKey(), inventoryItemId: "", quantity: 1 },
    ];
    setSupplies(nextSupplies);
    persistEditableDraft({ supplies: nextSupplies });
  }

  function handleRemoveSupply(index: number) {
    if (!markUserEdit()) return;
    const nextSupplies = supplies.filter((_, i) => i !== index);
    setSupplies(nextSupplies);
    persistEditableDraft({ supplies: nextSupplies });
  }

  function handleSupplyChange(
    index: number,
    field: "inventoryItemId" | "quantity",
    value: string,
  ) {
    if (!markUserEdit()) return;
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
    persistEditableDraft({ supplies: nextSupplies });
  }

  function handleSelectInventoryForSupply(item: InventoryItem) {
    if (pickingSupplyIndex === null) return;
    if (!markUserEdit()) return;
    setKnownItems((prev) => new Map(prev).set(item.id, item));
    const nextSupplies = supplies.map((supply, i) =>
      i === pickingSupplyIndex ? { ...supply, inventoryItemId: item.id } : supply,
    );
    setSupplies(nextSupplies);
    persistEditableDraft({ supplies: nextSupplies });
    setPickingSupplyIndex(null);
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
      return { ok: false, error: "Agrega al menos un insumo del inventario." };
    }

    const parsedSupplies: RecipeSupplyInput[] = [];
    for (const supply of supplies) {
      if (!supply.inventoryItemId) {
        return {
          ok: false,
          error: "Selecciona un insumo del inventario en cada fila.",
        };
      }
      const qty = Number(supply.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return {
          ok: false,
          error: "La cantidad de cada insumo debe ser mayor a 0.",
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

  function handleBack() {
    if (pickingSupplyIndex !== null) {
      setPickingSupplyIndex(null);
      return;
    }
    if (exitBlocked()) return;
    if (onBack && dirty) setConfirmBack(value => !value);
    else if (onBack) onBack();
    else guard.request(() => { handleVoluntaryClose(); });
  }

  const dirty = !exitSucceeded.current && !sameDraft(snapshot, baseDraft.current);
  function exitBlocked() { return exitUncertain || busy || isSubmittingRef.current || pendingAttempt?.status === "uncertain" || pendingAttempt?.status === "conflict_in_progress" || pendingAttempt?.status === "in_flight" || Boolean(pendingAttempt?.possibleWriteApplied && pendingAttempt.status !== "succeeded"); }
  const guard = useEditGuard({ get dirty() { return dirty && !exitSucceeded.current; }, get blocked() { return exitBlocked(); } }, () => { handleVoluntaryClose(); });
  useImperativeHandle(sessionRef, () => ({ back: handleBack, discard: handleVoluntaryClose, hasChanges: () => dirty, isBlocked: exitBlocked }));

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller) void controller.updateEditableDraft(getCurrentDraft(), { nestedContext }).catch(() => {});
  }, [nestedContext]);

  function handleVoluntaryClose() {
    if (exitBlocked()) return false;
    activeRef.current = false;
    if (controllerRef.current) {
      void controllerRef.current.abandonFlow().catch(() => {});
    }
    onClose();
    return true;
  }

  async function handleStartNewOperation() {
    if (controllerRef.current) {
      await controllerRef.current.abandonFlow().catch(() => {});
      controllerRef.current = null;
    }
    setPendingAttempt(null);

    setError("");
  }

  async function executeCreationAttempt(
    action: "submit" | "retry",
    controller: OperationAttemptController<RecipeDraft, RecipeDetail>,
  ): Promise<OperationExecutionResult<RecipeDraft, RecipeDetail>> {
    if (controller.getCurrentAttempt()?.status === "pre_commit_rejected") {
      await controller.startNewAttemptFromEditableDraft();
    }
    if (action === "retry" && controller.getRecord()) return controller.retryPending();
    return controller.submit();
  }

  function saveSubmittedRecipeDraft(draft: RecipeDraft | undefined) {
    if (!draft) return;
    baseDraft.current = {
      name: draft.name,
      description: draft.description,
      instructions: draft.instructions,
      supplies: draft.supplies.map((supply) => ({
        inventoryItemId: supply.inventoryItemId,
        quantity: String(supply.quantity),
      })),
    };
  }

  async function handleSuccessfulCreation(
    result: OperationExecutionResult<RecipeDraft, RecipeDetail>,
    controller: OperationAttemptController<RecipeDraft, RecipeDetail>,
  ) {
    if (!result.result) return;
    const created = result.result;
    setPendingAttempt(null);
    saveSubmittedRecipeDraft(result.record.submittedDraft);
    if (result.hasDraftChangesSinceSubmission) {
      setActiveRecipe(created);
      setOpeningEtag(created.etag);
      setReviewRequired(!isStrongEtag(created.etag));
      setInfoNotice("La receta se creó. Conservamos tus cambios posteriores; guárdalos para actualizarla.");
      onCreatedWithPendingEdits?.(created);
      return;
    }
    await controller.abandonFlow().catch(() => {});
    if (!activeRef.current) return;
    exitSucceeded.current = true;
    onCreated?.(created);
    onClose();
  }

  function handleFailedCreation(
    result: OperationExecutionResult<RecipeDraft, RecipeDetail>,
    controller: OperationAttemptController<RecipeDraft, RecipeDetail>,
  ) {
    const stage = controller.getCurrentAttempt() ?? result.record.stages[result.record.currentStageIndex] ?? null;
    setPendingAttempt(stage);
    setError(stage?.lastErrorMessage || result.outcome?.message || "No se pudo crear la receta. Vuelve a intentarlo.");
  }

  async function executeFallbackCreation(draft: RecipeDraft) {
    try {
      await onSubmit?.(draft);
      exitSucceeded.current = true;
      onClose();
    } catch {
      setError("No se pudo guardar la receta. Verifica los datos y vuelve a intentarlo.");
    } finally {
      isSubmittingRef.current = false;
      setBusy(false);
    }
  }

  function handleCreationFlowError(error: unknown) {
    if (!activeRef.current) return;
    if (error instanceof PreSendStorageError || error instanceof OperationRetryBlockedError) {
      setError(error.message);
      return;
    }
    const message =
      error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Error inesperado al crear la receta.";
    setError(message);
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

    if (!repository && onSubmit) {
      await executeFallbackCreation(cleanDraft);
      return;
    }

    try {
      const controller = getOrInitController();
      const result = await executeCreationAttempt(action, controller);
      if (!activeRef.current) return;
      if (result.status === "succeeded" && result.result) {
        await handleSuccessfulCreation(result, controller);
      } else {
        handleFailedCreation(result, controller);
      }
    } catch (error) {
      handleCreationFlowError(error);
    } finally {
      isSubmittingRef.current = false;
      if (activeRef.current) setBusy(false);
    }
  }

  async function getEditSaveEtag(): Promise<string | null> {
    let etag = openingEtag;
    if (!isStrongEtag(etag) && openingLoadPromiseRef.current) {
      const loaded = await openingLoadPromiseRef.current;
      if (loaded?.etag && isStrongEtag(loaded.etag)) {
        etag = loaded.etag;
        setOpeningEtag(loaded.etag);
      }
    }
    if (isStrongEtag(etag)) return etag;
    setReviewRequired(true);
    setError("No pudimos comprobar la versión de la receta. Consulta sus datos actuales antes de guardar.");
    return null;
  }

  async function saveEditThroughCallback(cleanDraft: RecipeDraft): Promise<boolean> {
    if (!onSubmit) return false;
    try {
      await onSubmit(cleanDraft);
      exitSucceeded.current = true;
      onClose();
    } catch {
      setError("No se pudo guardar la receta. Verifica los datos y vuelve a intentarlo.");
    } finally {
      isSubmittingRef.current = false;
      setBusy(false);
    }
    return true;
  }

  function reportRecipeEditFailure(err: unknown) {
    if (!activeRef.current) return;
    const analysis = analyzeNonIdempotentWriteError(err);
    setExitUncertain(analysis.possibleWriteApplied);
    if (analysis.requiresResourceReload) setReviewRequired(true);
    setError(`No se pudo guardar la receta. ${analysis.message}`);
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

    if (!repository && await saveEditThroughCallback(cleanDraft)) return;

    if (!repository) {
      setError("No se puede editar la receta sin un repositorio configurado.");
      isSubmittingRef.current = false;
      setBusy(false);
      return;
    }

    try {
      const etagToUse = await getEditSaveEtag();
      if (!etagToUse) return;

      const updated = await repository.updateRecipe(activeRecipe.id, cleanDraft, etagToUse);
      if (!activeRef.current) return;
      await controllerRef.current?.abandonFlow().catch(() => {});
      if (!activeRef.current) return;
      exitSucceeded.current = true;
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      reportRecipeEditFailure(err);
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
      setExitUncertain(false);
    baseDraft.current = recipeDetailDraft(reviewedResource.data);
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
    <section className="recipe-form-dialog recipe-form-content" hidden={!active} aria-labelledby="recipe-form-title">
      {guard.confirmation}
      {confirmBack && <section className="recipe-back-confirm" aria-labelledby="recipe-back-title">
        <h3 id="recipe-back-title">Tu receta tiene cambios sin guardar</h3>
        <p>Puedes volver a la búsqueda conservando este borrador, o seguir editando la receta.</p>
        <button ref={backConfirmRef} type="button" className="button button--secondary" onClick={() => { setConfirmBack(false); nameRef.current?.focus(); }}>Seguir editando receta</button>
        <button type="button" className="button button--primary" onClick={() => { setConfirmBack(false); onBack?.(); }}>Conservar borrador y volver</button>
      </section>}
      <div className="recipe-form-dialog__header" hidden={confirmBack || pickingSupplyIndex !== null}>
        <h2 id="recipe-form-title">{editing ? "Editar receta" : "Nueva receta"}</h2>
        <button
          className="recipe-form-dialog__close"
          type="button"
          disabled={busy}
          onClick={() => {
            handleBack();
          }}
          aria-label={onBack ? "Volver a elegir receta" : "Cerrar formulario"}
        >
          <Icon name="close" />
        </button>
      </div>

      <form noValidate onSubmit={(e) => void save(e)} hidden={confirmBack || pickingSupplyIndex !== null}>
        <div className="recipe-form-dialog__fields">
          <RecipeValidationSummary fieldErrors={fieldErrors} supplies={supplies} summaryRef={validationSummaryRef} />
          <RecipeTextField id="recipe-name" label="Nombre" value={name} disabled={busy}
            placeholder="Ej. Hamburguesa Hawaiana" maxLength={255} inputRef={nameRef}
            fieldErrors={fieldErrors} onChange={handleNameChange} />
          <RecipeTextField id="recipe-description" label="Descripción" value={description} disabled={busy}
            placeholder="Descripción breve de la receta" rows={2}
            fieldErrors={fieldErrors} onChange={handleDescriptionChange} />
          <RecipeTextField id="recipe-instructions" label="Instrucciones" value={instructions} disabled={busy}
            placeholder="Pasos de preparación" rows={3}
            fieldErrors={fieldErrors} onChange={handleInstructionsChange} />

          <fieldset className="recipe-supplies-section" aria-busy={inventoryLoading}>
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
            <RecipeInventoryControls inventoryError={inventoryError} inventoryLoading={inventoryLoading}
              inventoryCount={currentInventoryItems.length} olderInventory={olderInventory}
              displayedInventory={displayedInventory} inventorySearchDraft={inventorySearchDraft}
              inventoryPage={inventoryPage} inventoryTotalPages={inventoryTotalPages} busy={busy}
              onRetry={() => setInventoryRetryCount(count => count + 1)}
              onSearch={query => { setConfirmedInventoryQuery(query); setInventoryPage(1); }}
              onSearchDraftChange={setInventorySearchDraft} onPageChange={setInventoryPage} />

            <RecipeSupplyTable supplies={supplies} fieldErrors={fieldErrors}
              currentInventoryItems={currentInventoryItems} knownItems={knownItems}
              activeRecipe={activeRecipe} busy={busy} inventoryLoading={inventoryLoading}
              olderInventory={olderInventory} onSupplyChange={handleSupplyChange}
              onRemoveSupply={handleRemoveSupply}
              onOpenInventoryPicker={repository?.listInventoryItems ? (index) => setPickingSupplyIndex(index) : undefined}
              getUnitForItem={getUnitForItem} />
          </fieldset>

          <RecipeOperationFeedback infoNotice={infoNotice} error={error}
            showManualRetryButton={showManualRetryButton}
            requiresNewOperationAction={requiresNewOperationAction}
            retryCountdownMs={retryCountdownMs} retryDisabled={retryDisabled} busy={busy}
            editing={editing} reviewRequired={reviewRequired} reviewLoading={reviewLoading}
            reviewError={reviewError} reviewedResource={reviewedResource}
            reviewedEtagStrong={reviewedEtagStrong} pendingAttempt={pendingAttempt}
            onRetry={() => { void executeCreationFlow("retry"); }}
            onStartNewOperation={() => { void handleStartNewOperation(); }}
            onReview={() => { void handleReviewRecipe(); }} onAdoptReview={handleAdoptReview} />
        </div>

        <div className="recipe-form-dialog__actions">
          <button
            className="button button--secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              handleBack();
            }}
          >
            {onBack ? "Volver a elegir receta" : "Cancelar"}
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
      {pickingSupplyIndex !== null && repository?.listInventoryItems && (
        <InventoryPage
          repository={{ listInventoryItems: repository.listInventoryItems }}
          context="ingredient"
          onSelectItem={handleSelectInventoryForSupply}
          onClose={() => setPickingSupplyIndex(null)}
        />
      )}
    </section>
  );
}
