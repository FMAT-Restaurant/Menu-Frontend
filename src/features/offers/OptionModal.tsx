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
    if (initialData) {
      setDisplayName(initialData.displayName || "");
      setStatus(isCreateMode ? "ACTIVE" : initialData.status);
      setSourceType(initialData.sourceType);
      if (initialData.sourceType === "RECIPE") {
        setRecipeId(initialData.recipeId);
        setRecipeName(initialData.recipeName);
        setHasRecipeAssignmentIntent(initialData.hasRecipeAssignmentIntent);
        setInventoryItemId(undefined);
        setInventoryItemName(undefined);
        setQuantity(undefined);
        setUnit(undefined);
      } else if (initialData.sourceType === "INVENTORY_ITEM") {
        setRecipeId(undefined);
        setRecipeName(undefined);
        setHasRecipeAssignmentIntent(undefined);
        setInventoryItemId(initialData.inventoryItemId);
        setInventoryItemName(initialData.inventoryItemName);
        setQuantity(initialData.quantity);
        setUnit(initialData.unit);
      } else {
        setRecipeId(undefined);
        setRecipeName(undefined);
        setHasRecipeAssignmentIntent(undefined);
        setInventoryItemId(undefined);
        setInventoryItemName(undefined);
        setQuantity(undefined);
        setUnit(undefined);
      }
    } else {
      setDisplayName("");
      setStatus("ACTIVE");
      setSourceType(null);
      setRecipeId(undefined);
      setRecipeName(undefined);
      setHasRecipeAssignmentIntent(undefined);
      setInventoryItemId(undefined);
      setInventoryItemName(undefined);
      setQuantity(undefined);
      setUnit(undefined);
    }
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
        ...(sourceType === "RECIPE"
          ? {
              recipeId,
              recipeName,
              hasRecipeAssignmentIntent,
              recipeAssignmentToken: initialData?.recipeAssignmentToken,
            }
          : sourceType === "INVENTORY_ITEM"
            ? {
                inventoryItemId,
                inventoryItemName,
                quantity,
                unit,
              }
            : {}),
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
        ...(sourceType === "RECIPE"
          ? {
              recipeId,
              recipeName,
              hasRecipeAssignmentIntent,
              recipeAssignmentToken: initialData?.recipeAssignmentToken,
            }
          : sourceType === "INVENTORY_ITEM"
            ? {
                inventoryItemId,
                inventoryItemName,
                quantity,
                unit,
              }
            : {}),
      });
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateOptionDraft({
      localId: initialData?.localId,
      optionId: initialData?.optionId,
      originalSourceType: initialData?.originalSourceType,
      displayName,
      status,
      sourceType,
      ...(sourceType === "RECIPE" ? {
        recipeId, recipeName, hasRecipeAssignmentIntent,
        recipeAssignmentToken: initialData?.recipeAssignmentToken,
      } : sourceType === "INVENTORY_ITEM" ? {
        inventoryItemId, inventoryItemName, quantity, unit,
      } : {}),
    }, isCreateMode ? "create" : "update");
    if (!result.valid) { setValidationError(result.message); return; }
    if (isNestedBlocked?.()) return;
    if (hasNestedChanges?.()) {
      confirmationTriggerRef.current = event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]');
      setPendingSave(result.value);
      setConfirmClose(true);
    } else onSave(result.value);
  }

  const title = initialData?.optionId ? `Editar opción · ${slotName}` : `Agregar opción · ${slotName}`;

  let sourceSummary = "Elige una receta de la biblioteca para esta opción.";
  if (sourceType === "RECIPE" && recipeName) {
    sourceSummary = `Receta asignada: ${recipeName}`;
  } else if (sourceType === "RECIPE" && recipeId) {
    sourceSummary = `Receta asignada (ID: ${recipeId})`;
  } else if (sourceType === "INVENTORY_ITEM" && inventoryItemName) {
    sourceSummary = `Artículo de inventario: ${inventoryItemName} (${quantity ?? "—"} ${unit ?? ""})`;
  } else if (sourceType === "INVENTORY_ITEM" && inventoryItemId) {
    sourceSummary = `Artículo de inventario (ID: ${inventoryItemId})`;
  }

  return (
    <dialog
      ref={dialogRef}
      className="option-modal-dialog menu-task-dialog"
      aria-labelledby={confirmClose ? "option-discard-title" : isNestedPickerOpen ? (recipeStep ? "recipe-form-title" : "recipe-selector-title") : "option-modal-title"}
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
        <button type="button" className="button button--primary" onClick={() => { if (isNestedBlocked?.() || onDiscardNested?.() === false) return; setConfirmClose(false); if (pendingSave) { onSave(pendingSave); setPendingSave(null); } else onClose(); }}>{pendingSave ? "Descartar receta y guardar opción" : "Descartar cambios"}</button>
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
              Puedes usar una etiqueta contextual distinta al nombre de la receta o del artículo.
            </p>
          </div>

          <div className="option-source-box">
            <span className="option-source-box__title">Contenido actual:</span>
            <p className="option-source-box__summary">{sourceSummary}</p>
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
                  Inactiva
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
