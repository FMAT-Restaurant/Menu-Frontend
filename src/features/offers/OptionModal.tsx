import { sameDraft, useEditGuard } from "../../shared/editGuard";
import { Icon } from "../../shared/Icon";
import { useTaskDialog } from "../../shared/useTaskDialog";
import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import type { OfferStatus } from "../../application/catalog";

import { validateOptionDraft, type OptionDraft, type ValidatedOptionDraft } from "./optionDraft";
export type { OptionDraft } from "./optionDraft";

function draftSnapshot(draft: OptionDraft | null) {
  return { displayName: draft?.displayName ?? "", status: draft?.status ?? "ACTIVE", sourceType: draft?.sourceType ?? null,
    recipeId: draft?.recipeId, recipeName: draft?.recipeName, hasRecipeAssignmentIntent: draft?.hasRecipeAssignmentIntent,
    recipeAssignmentToken: draft?.recipeAssignmentToken, inventoryItemId: draft?.inventoryItemId, inventoryItemName: draft?.inventoryItemName, quantity: draft?.quantity, unit: draft?.unit };
}

export interface OptionModalProps {
  isOpen: boolean;
  slotName: string;
  initialData: OptionDraft | null;
  isCreateMode?: boolean;
  isNestedPickerOpen?: boolean;
  onSave: (data: ValidatedOptionDraft) => void;
  onClose: () => void;
  onOpenRecipePicker: () => void;
  onChangeDraft?: (data: OptionDraft) => void;
  children?: ReactNode;
  recipeStep?: boolean;
  onNestedBack?: () => void;
  hasNestedChanges?: () => boolean;
  onDiscardNested?: () => boolean | void;
  isNestedBlocked?: () => boolean;
}

function sourceDraftFields(
  sourceType: OptionDraft["sourceType"],
  recipe: Pick<OptionDraft, "recipeId" | "recipeName" | "hasRecipeAssignmentIntent" | "recipeAssignmentToken">,
  inventory: Pick<OptionDraft, "inventoryItemId" | "inventoryItemName" | "quantity" | "unit">,
): Partial<OptionDraft> {
  if (sourceType === "RECIPE") return recipe;
  if (sourceType === "INVENTORY_ITEM") return inventory;
  return {};
}

function optionDialogLabelId(
  confirmClose: boolean,
  isNestedPickerOpen: boolean,
  recipeStep: boolean,
): string {
  if (confirmClose) return "option-discard-title";
  if (!isNestedPickerOpen) return "option-modal-title";
  if (recipeStep) return "recipe-form-title";
  return "recipe-selector-title";
}

interface InitialOptionState {
  displayName: string;
  status: OfferStatus;
  sourceType: OptionDraft["sourceType"];
  recipeId?: string;
  recipeName?: string;
  hasRecipeAssignmentIntent?: boolean;
  inventoryItemId?: string;
  inventoryItemName?: string;
  quantity?: number;
  unit?: string;
}

function getInitialOptionState(
  initialData: OptionDraft | null,
  isCreateMode: boolean,
): InitialOptionState {
  if (!initialData) {
    return { displayName: "", status: "ACTIVE", sourceType: null };
  }
  const isRecipe = initialData.sourceType === "RECIPE";
  const isInventoryItem = initialData.sourceType === "INVENTORY_ITEM";
  return {
    displayName: initialData.displayName || "",
    status: isCreateMode ? "ACTIVE" : initialData.status,
    sourceType: initialData.sourceType,
    recipeId: isRecipe ? initialData.recipeId : undefined,
    recipeName: isRecipe ? initialData.recipeName : undefined,
    hasRecipeAssignmentIntent: isRecipe ? initialData.hasRecipeAssignmentIntent : undefined,
    inventoryItemId: isInventoryItem ? initialData.inventoryItemId : undefined,
    inventoryItemName: isInventoryItem ? initialData.inventoryItemName : undefined,
    quantity: isInventoryItem ? initialData.quantity : undefined,
    unit: isInventoryItem ? initialData.unit : undefined,
  };
}

function getOptionSourceSummary(
  sourceType: OptionDraft["sourceType"],
  recipeId: string | undefined,
  recipeName: string | undefined,
  inventoryItemId: string | undefined,
  inventoryItemName: string | undefined,
  quantity: number | undefined,
  unit: string | undefined,
): string {
  if (sourceType === "RECIPE" && recipeName) return `Receta asignada: ${recipeName}`;
  if (sourceType === "RECIPE" && recipeId) return "Receta asignada sin nombre disponible.";
  if (sourceType === "INVENTORY_ITEM" && inventoryItemName) {
    return `Insumo de inventario: ${inventoryItemName} (${quantity ?? "—"} ${unit ?? ""})`;
  }
  if (sourceType === "INVENTORY_ITEM" && inventoryItemId) {
    return "Insumo asignado sin nombre disponible.";
  }
  return "Elige una receta de la biblioteca para esta opción.";
}

interface OptionSubmitContext {
  draft: OptionDraft;
  mode: "create" | "update";
  isNestedBlocked?: () => boolean;
  hasNestedChanges?: () => boolean;
  onSave: (data: ValidatedOptionDraft) => void;
  setValidationError: (message: string) => void;
  setPendingSave: (data: ValidatedOptionDraft | null) => void;
  setConfirmClose: (confirm: boolean) => void;
  setConfirmationTrigger: (trigger: HTMLButtonElement | null) => void;
}

function submitOptionForm(
  event: SubmitEvent<HTMLFormElement>,
  context: OptionSubmitContext,
) {
  event.preventDefault();
  const result = validateOptionDraft(context.draft, context.mode);
  if (!result.valid) {
    context.setValidationError(result.message);
    return;
  }
  if (context.isNestedBlocked?.()) return;
  if (context.hasNestedChanges?.()) {
    context.setConfirmationTrigger(event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]'));
    context.setPendingSave(result.value);
    context.setConfirmClose(true);
    return;
  }
  context.onSave(result.value);
}

export function OptionModal({
  isOpen,
  slotName,
  initialData,
  isCreateMode = false,
  isNestedPickerOpen = false,
  onSave,
  onClose,
  onOpenRecipePicker,
  onChangeDraft,
  children,
  recipeStep = false,
  onNestedBack,
  hasNestedChanges,
  onDiscardNested,
  isNestedBlocked,
}: Readonly<OptionModalProps>) {
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<OfferStatus>("ACTIVE");
  const [sourceType, setSourceType] = useState<"RECIPE" | "INVENTORY_ITEM" | null>(null);
  const [recipeId, setRecipeId] = useState<string | undefined>(undefined);
  const [recipeName, setRecipeName] = useState<string | undefined>(undefined);
  const [hasRecipeAssignmentIntent, setHasRecipeAssignmentIntent] = useState<boolean | undefined>(undefined);
  const [inventoryItemId, setInventoryItemId] = useState<string | undefined>(undefined);
  const [inventoryItemName, setInventoryItemName] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number | undefined>(undefined);
  const [unit, setUnit] = useState<string | undefined>(undefined);

  const [validationError, setValidationError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingSave, setPendingSave] = useState<ValidatedOptionDraft | null>(null);
  const openingDraftRef = useRef(draftSnapshot(initialData));
  const confirmRef = useRef<HTMLButtonElement>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isOpen) { openingDraftRef.current = draftSnapshot(initialData); setConfirmClose(false); setPendingSave(null); }
    // Capture the opening snapshot, not every keystroke emitted to the parent.
  }, [isOpen]);
  const currentDraft = { ...draftSnapshot(initialData), displayName, status: isCreateMode ? "ACTIVE" : status, sourceType, recipeId, recipeName, hasRecipeAssignmentIntent, inventoryItemId, inventoryItemName, quantity, unit };
  const guard = useEditGuard({ get dirty() { return !sameDraft(currentDraft, openingDraftRef.current) || Boolean(hasNestedChanges?.()); }, get blocked() { return Boolean(isNestedBlocked?.()); } }, undefined, isOpen);
  function requestClose() { guard.request(() => { if (onDiscardNested?.() !== false) onClose(); }); }
  function requestStepBack() {
    if (isNestedPickerOpen) { onNestedBack?.(); return; }
    if (confirmClose) { setConfirmClose(false); setPendingSave(null); }
    else requestClose();
  }
  const previousConfirmRef = useRef(false);
  useEffect(() => {
    if (confirmClose) confirmRef.current?.focus();
    else if (previousConfirmRef.current) {
      const trigger = confirmationTriggerRef.current;
      if (trigger && trigger !== document.body && trigger.isConnected && !trigger.closest("[hidden]")) trigger.focus();
      else recipePickerBtnRef.current?.focus();
    }
    previousConfirmRef.current = confirmClose;
  }, [confirmClose]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const recipePickerBtnRef = useRef<HTMLButtonElement>(null);
  const wasNestedPickerOpenRef = useRef(false);

  useEffect(() => {
    const initialState = getInitialOptionState(initialData, isCreateMode);
    setDisplayName(initialState.displayName);
    setStatus(initialState.status);
    setSourceType(initialState.sourceType);
    setRecipeId(initialState.recipeId);
    setRecipeName(initialState.recipeName);
    setHasRecipeAssignmentIntent(initialState.hasRecipeAssignmentIntent);
    setInventoryItemId(initialState.inventoryItemId);
    setInventoryItemName(initialState.inventoryItemName);
    setQuantity(initialState.quantity);
    setUnit(initialState.unit);
    setValidationError("");
  }, [initialData, isOpen, isCreateMode]);

  useTaskDialog(dialogRef, isOpen);

  // Focus restoration when nested picker closes
  useEffect(() => {
    if (wasNestedPickerOpenRef.current && !isNestedPickerOpen && isOpen) {
      recipePickerBtnRef.current?.focus();
    }
    wasNestedPickerOpenRef.current = Boolean(isNestedPickerOpen);
  }, [isNestedPickerOpen, isOpen]);

  if (!isOpen) return null;

  function handleDisplayNameChange(val: string) {
    setDisplayName(val);
    if (onChangeDraft) {
      onChangeDraft({
        localId: initialData?.localId,
        optionId: initialData?.optionId,
        originalSourceType: initialData?.originalSourceType,
        displayName: val,
        status: isCreateMode ? "ACTIVE" : status,
        sourceType,
        ...sourceDraftFields(sourceType,
          { recipeId, recipeName, hasRecipeAssignmentIntent, recipeAssignmentToken: initialData?.recipeAssignmentToken },
          { inventoryItemId, inventoryItemName, quantity, unit }),
      });
    }
  }

  function handleStatusChange(val: OfferStatus) {
    const nextStatus = isCreateMode ? "ACTIVE" : val;
    setStatus(nextStatus);
    if (onChangeDraft) {
      onChangeDraft({
        localId: initialData?.localId,
        optionId: initialData?.optionId,
        originalSourceType: initialData?.originalSourceType,
        displayName,
        status: nextStatus,
        sourceType,
        ...sourceDraftFields(sourceType,
          { recipeId, recipeName, hasRecipeAssignmentIntent, recipeAssignmentToken: initialData?.recipeAssignmentToken },
          { inventoryItemId, inventoryItemName, quantity, unit }),
      });
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    submitOptionForm(event, {
      draft: {
      localId: initialData?.localId,
      optionId: initialData?.optionId,
      originalSourceType: initialData?.originalSourceType,
      displayName,
      status,
      sourceType,
      ...sourceDraftFields(sourceType,
        { recipeId, recipeName, hasRecipeAssignmentIntent, recipeAssignmentToken: initialData?.recipeAssignmentToken },
        { inventoryItemId, inventoryItemName, quantity, unit }),
      },
      mode: isCreateMode ? "create" : "update",
      isNestedBlocked,
      hasNestedChanges,
      onSave,
      setValidationError,
      setPendingSave,
      setConfirmClose,
      setConfirmationTrigger: (trigger) => { confirmationTriggerRef.current = trigger; },
    });
  }

  const title = initialData?.optionId ? `Editar opción · ${slotName}` : `Agregar opción · ${slotName}`;

  const sourceSummary = getOptionSourceSummary(
    sourceType,
    recipeId,
    recipeName,
    inventoryItemId,
    inventoryItemName,
    quantity,
    unit,
  );

  return (
    <dialog
      ref={dialogRef}
      className="option-modal-dialog menu-task-dialog"
      aria-labelledby={optionDialogLabelId(confirmClose, isNestedPickerOpen, recipeStep)}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Repeated native close requests may emit a non-cancelable cancel event.
        // Handle the task transition before the browser requests that close.
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) requestStepBack();
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestStepBack();
      }}
    >
      {guard.confirmation}
      {confirmClose && <section className="option-discard" aria-labelledby="option-discard-title">
        <h2 id="option-discard-title">{pendingSave ? "¿Descartar el borrador de receta y guardar la opción?" : "¿Descartar los cambios de esta opción?"}</h2>
        <p>{pendingSave ? "Hay una receta sin guardar que conservaste al volver. Puedes seguir editándola o descartarla antes de guardar la opción." : "La opción y los borradores de receta sin guardar se conservan si continúas editando."}</p>
        <button ref={confirmRef} type="button" className="button button--secondary" onClick={() => { setConfirmClose(false); setPendingSave(null); }}>Continuar editando</button>
        <button type="button" className="button button--primary" onClick={() => {
          if (isNestedBlocked?.() || onDiscardNested?.() === false) {
            return;
          }
          setConfirmClose(false);
          if (pendingSave) {
            onSave(pendingSave);
            setPendingSave(null);
          } else {
            onClose();
          }
        }}>{pendingSave ? "Descartar receta y guardar opción" : "Descartar cambios"}</button>
      </section>}
      <header className="modal-header" hidden={isNestedPickerOpen || confirmClose}>
        <h2 id="option-modal-title">{title}</h2>
        <button
          type="button"
          className="modal-close"
          onClick={requestClose}
          aria-label="Cerrar modal de opción"
        >
          <Icon name="close" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="option-form" noValidate hidden={isNestedPickerOpen || confirmClose}>
        <div className="modal-body">
          {validationError && (
            <p className="feedback feedback--error" role="alert">
              {validationError}
            </p>
          )}

          <div className="form-field">
            <label htmlFor="option-display-name">Nombre mostrado (opcional)</label>
            <input
              id="option-display-name"
              type="text"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Ej. Coca-Cola o Papas a la francesa"
            />
            <p className="field-hint">
              Puedes usar una etiqueta distinta al nombre de la receta o del insumo.
            </p>
          </div>

          <div className="option-source-box">
            <span className="option-source-box__title">Contenido actual:</span>
            <p className="option-source-box__summary">{sourceSummary}</p>
            {sourceType === "RECIPE" && recipeId && !recipeName && <details><summary>Referencia de receta</summary>{recipeId}</details>}
            {sourceType === "INVENTORY_ITEM" && inventoryItemId && !inventoryItemName && <details><summary>Referencia de insumo</summary>{inventoryItemId}</details>}
          </div>

          <div className="form-field">
            <span className="field-label">Origen del contenido de esta opción</span>
            <div className="source-picker-buttons">
              <button
                ref={recipePickerBtnRef}
                type="button"
                className="source-btn"
                onClick={onOpenRecipePicker}
              >
                <span className="source-btn__title">Elegir receta</span>
                <span className="source-btn__desc">
                  Seleccionar una preparación de la biblioteca.
                </span>
              </button>

            </div>

          </div>

          {isCreateMode ? (
            <div className="form-field">
              <span className="field-label">Disponibilidad</span>
              <p className="field-hint">Las opciones se crean activas por defecto.</p>
            </div>
          ) : (
            <fieldset className="form-fieldset">
              <legend>Disponibilidad</legend>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="option-status"
                    value="ACTIVE"
                    checked={status === "ACTIVE"}
                    onChange={() => handleStatusChange("ACTIVE")}
                  />
                  Activa
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="option-status"
                    value="INACTIVE"
                    checked={status === "INACTIVE"}
                    onChange={() => handleStatusChange("INACTIVE")}
                  />
                  {" "}Inactiva
                </label>
              </div>
            </fieldset>
          )}
        </div>

        <footer className="modal-footer">
          <button type="button" className="button button--secondary" onClick={requestClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={!sourceType}
          >
            Guardar opción
          </button>
        </footer>
      </form>
      <div hidden={confirmClose}>{children}</div>
    </dialog>
  );
}
