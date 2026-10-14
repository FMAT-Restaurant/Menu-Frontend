import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type { OfferStatus } from "../../application/catalog";

export interface OptionDraft {
  optionId?: string;
  displayName: string;
  status: OfferStatus;
  sourceType: "RECIPE" | "INVENTORY_ITEM" | null;
  recipeId?: string;
  recipeRevision?: number;
  recipeName?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  quantity?: number;
  unit?: string;
}

export interface OptionModalProps {
  isOpen: boolean;
  slotName: string;
  initialData: OptionDraft | null;
  onSave: (data: OptionDraft) => void;
  onClose: () => void;
  onOpenRecipePicker: () => void;
}

export function OptionModal({
  isOpen,
  slotName,
  initialData,
  onSave,
  onClose,
  onOpenRecipePicker,
}: Readonly<OptionModalProps>) {
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<OfferStatus>("ACTIVE");
  const [sourceType, setSourceType] = useState<"RECIPE" | "INVENTORY_ITEM" | null>(null);
  const [recipeId, setRecipeId] = useState<string | undefined>(undefined);
  const [recipeRevision, setRecipeRevision] = useState<number | undefined>(undefined);
  const [recipeName, setRecipeName] = useState<string | undefined>(undefined);
  const [inventoryItemId, setInventoryItemId] = useState<string | undefined>(undefined);
  const [inventoryItemName, setInventoryItemName] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number | undefined>(undefined);
  const [unit, setUnit] = useState<string | undefined>(undefined);

  const [validationError, setValidationError] = useState("");
  const [featureNotice, setFeatureNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (initialData) {
      setDisplayName(initialData.displayName || "");
      setStatus(initialData.status);
      setSourceType(initialData.sourceType);
      setRecipeId(initialData.recipeId);
      setRecipeRevision(initialData.recipeRevision);
      setRecipeName(initialData.recipeName);
      setInventoryItemId(initialData.inventoryItemId);
      setInventoryItemName(initialData.inventoryItemName);
      setQuantity(initialData.quantity);
      setUnit(initialData.unit);
    } else {
      setDisplayName("");
      setStatus("ACTIVE");
      setSourceType(null);
      setRecipeId(undefined);
      setRecipeRevision(undefined);
      setRecipeName(undefined);
      setInventoryItemId(undefined);
      setInventoryItemName(undefined);
      setQuantity(undefined);
      setUnit(undefined);
    }
    setValidationError("");
    setFeatureNotice("");
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (typeof dialog?.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog?.setAttribute("open", "");
    }
    return () => {
      if (dialog?.open && typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog?.removeAttribute("open");
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceType) {
      setValidationError("Debes seleccionar un origen de contenido (receta o artículo de inventario).");
      return;
    }
    if (sourceType === "RECIPE" && !recipeId) {
      setValidationError("Debes elegir una receta de la biblioteca.");
      return;
    }
    if (sourceType === "INVENTORY_ITEM" && (!inventoryItemId || (quantity ?? 0) <= 0)) {
      setValidationError("El artículo de inventario requiere una cantidad positiva.");
      return;
    }

    onSave({
      optionId: initialData?.optionId,
      displayName: displayName.trim(),
      status,
      sourceType,
      recipeId,
      recipeRevision: recipeRevision ?? 1,
      recipeName,
      inventoryItemId,
      inventoryItemName,
      quantity,
      unit,
    });
  }

  function handleInventoryClick() {
    setFeatureNotice("La selección interactiva de artículos de inventario se implementará en V7.");
  }

  const title = initialData ? `Editar opción · ${slotName}` : `Agregar opción · ${slotName}`;

  let sourceSummary = "Elige una receta de la biblioteca o un artículo de inventario para esta opción.";
  if (sourceType === "RECIPE" && recipeName) {
    sourceSummary = `Receta asignada: ${recipeName}`;
  } else if (sourceType === "RECIPE" && recipeId) {
    sourceSummary = `Receta asignada (ID: ${recipeId})`;
  } else if (sourceType === "INVENTORY_ITEM" && inventoryItemName) {
    sourceSummary = `Artículo de inventario: ${inventoryItemName} (${quantity ?? 1} ${unit ?? "u"})`;
  } else if (sourceType === "INVENTORY_ITEM" && inventoryItemId) {
    sourceSummary = `Artículo de inventario (ID: ${inventoryItemId})`;
  }

  return (
    <dialog
      ref={dialogRef}
      className="option-modal-dialog"
      aria-labelledby="option-modal-title"
      onCancel={(event) => {
        event.preventDefault();
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
          ✕
        </button>
      </header>

      <form onSubmit={handleSubmit} className="option-form" noValidate>
        <div className="modal-body">
          {validationError && (
            <p className="feedback feedback--error" role="alert">
              {validationError}
            </p>
          )}
          {featureNotice && (
            <output className="feedback feedback--info" aria-live="polite">
              {featureNotice}
            </output>
          )}

          <div className="form-field">
            <label htmlFor="option-display-name">Nombre mostrado (opcional)</label>
            <input
              id="option-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
                type="button"
                className="source-btn"
                onClick={onOpenRecipePicker}
              >
                <span className="source-btn__title">Elegir receta</span>
                <span className="source-btn__desc">
                  Seleccionar una preparación de la biblioteca (V6).
                </span>
              </button>
              <button
                type="button"
                className="source-btn"
                onClick={handleInventoryClick}
              >
                <span className="source-btn__title">Elegir artículo de inventario</span>
                <span className="source-btn__desc">
                  Seleccionar un artículo directamente de stock (V7).
                </span>
              </button>
            </div>
          </div>

          <div className="form-field">
            <span className="field-label" id="option-status-label">Estado de la opción</span>
            <div className="radio-group" role="radiogroup" aria-labelledby="option-status-label">
              <label className="radio-label">
                <input
                  type="radio"
                  name="option-status"
                  value="ACTIVE"
                  checked={status === "ACTIVE"}
                  onChange={() => setStatus("ACTIVE")}
                />
                <span>Activa</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="option-status"
                  value="INACTIVE"
                  checked={status === "INACTIVE"}
                  onChange={() => setStatus("INACTIVE")}
                />
                <span>Inactiva</span>
              </label>
            </div>
            <p className="field-hint">
              Una opción inactiva no se ofrece para nuevas selecciones. Si todas las opciones de un grupo están inactivas, el grupo pasa a estar inactivo.
            </p>
          </div>
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
          >
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
