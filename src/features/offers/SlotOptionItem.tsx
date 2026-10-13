import type { OptionDraft } from "./OptionModal";

export interface SlotOptionItemProps {
  option: OptionDraft;
  optionIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  disabled?: boolean;
}

export function SlotOptionItem({
  option,
  optionIndex,
  onEdit,
  onDelete,
  onToggleStatus,
  disabled = false,
}: Readonly<SlotOptionItemProps>) {
  const isRecipe = option.sourceType === "RECIPE";
  const sourceName = isRecipe
    ? option.recipeName || "Receta de biblioteca"
    : option.inventoryItemName || "Artículo de inventario";
  const label = option.displayName || sourceName;
  const isActive = option.status === "ACTIVE";

  return (
    <div
      className={`slot-option-item ${isActive ? "slot-option-item--active" : "slot-option-item--inactive"}`}
      data-testid={`slot-option-${optionIndex}`}
    >
      <div className="slot-option-item__main">
        <div className="slot-option-item__header">
          <strong className="slot-option-item__name">{label}</strong>
          <span className="slot-option-item__source-badge">
            {isRecipe ? "Receta" : "Inventario"}
          </span>
        </div>
        {option.displayName && option.displayName !== sourceName && (
          <p className="slot-option-item__source-ref">Origen: {sourceName}</p>
        )}
        {!isRecipe && option.quantity !== undefined && (
          <p className="slot-option-item__quantity">
            {option.quantity} {option.unit ?? "u"}
          </p>
        )}
      </div>

      <div className="slot-option-item__actions">
        <button
          type="button"
          className={`option-status-badge ${isActive ? "option-status-badge--active" : "option-status-badge--inactive"}`}
          onClick={onToggleStatus}
          disabled={disabled}
          title={isActive ? "Hacer inactiva" : "Hacer activa"}
          aria-label={`Cambiar estado de ${label}`}
        >
          {isActive ? "Activa" : "Inactiva"}
        </button>

        <button
          type="button"
          className="button button--small button--secondary"
          onClick={onEdit}
          disabled={disabled}
          aria-label={`Editar opción ${label}`}
        >
          Editar
        </button>

        <button
          type="button"
          className="button button--small button--danger"
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Eliminar opción ${label}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
