import { Icon } from "../../shared/Icon";
import { useTaskDialog } from "../../shared/useTaskDialog";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type { OfferStatus } from "../../application/catalog";

import { validateOptionDraft, type OptionDraft, type ValidatedOptionDraft } from "./optionDraft";
export type { OptionDraft } from "./optionDraft";

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

  // Modal Escape key handling respecting modal hierarchy
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isNestedPickerOpen) {
          // Leave the native cancel event available to the topmost dialog.
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isNestedPickerOpen, onClose]);

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
    onSave(result.value);
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
      aria-labelledby="option-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isNestedPickerOpen) return;
        onClose();
      }}
    >
      <header className="modal-header">
        <h2 id="option-modal-title">{title}</h2>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Cerrar modal de opción"
        >
          <Icon name="close" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="option-form" noValidate>
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
          <button type="button" className="button button--secondary" onClick={onClose}>
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
    </dialog>
  );
}
