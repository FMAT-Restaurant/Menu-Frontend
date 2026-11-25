import type { OfferCourse } from "../../application/catalog";
import type { OptionDraft } from "./optionDraft";
import { SlotOptionItem } from "./SlotOptionItem";
import { Icon } from "../../shared/Icon";

export interface SlotDraft {
  localId?: string;
  slotId?: string;
  name: string;
  quantity: number;
  course: OfferCourse | null;
  options: OptionDraft[];
}

export interface SlotCardProps {
  slot: SlotDraft;
  slotIndex: number;
  totalSlots?: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddOption: () => void;
  onEditOption: (optionIndex: number) => void;
  onDeleteOption: (optionIndex: number) => void;
  onToggleOptionStatus: (optionIndex: number) => void;
  onMoveOption?: (fromOptionIndex: number, toOptionIndex: number) => void;
  canChangeStatus?: boolean;
  disabled?: boolean;
}

export function SlotCard({
  slot,
  slotIndex,
  totalSlots,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onToggleOptionStatus,
  onMoveOption,
  canChangeStatus = true,
  disabled = false,
}: Readonly<SlotCardProps>) {
  const hasActiveOption = slot.options.some((opt) => opt.status === "ACTIVE");
  const isSlotActive = slot.options.length > 0 && hasActiveOption;

  const roundsLabel = slot.quantity === 1 ? "1 ronda de selección" : `${slot.quantity} rondas de selección`;

  const courseLabels: Record<OfferCourse, string> = {
    entrada: "Entrada",
    "plato fuerte": "Plato fuerte",
    postre: "Postre",
    bebida: "Bebida",
  };

  return (
    <article
      className={`slot-card ${isSlotActive ? "slot-card--active" : "slot-card--inactive"}`}
      data-testid={`slot-card-${slotIndex}`}
      aria-label={`Grupo ${slot.name}`}
    >
      <header className="slot-card__header">
        <div className="slot-card__title-row">
          <h3 className="slot-card__title">{slot.name}</h3>
          <div className="slot-card__badges">
            <span className="slot-card__badge slot-card__badge--rounds">{roundsLabel}</span>
            {slot.course && (
              <span className="slot-card__badge slot-card__badge--course">
                {courseLabels[slot.course] || slot.course}
              </span>
            )}
            <span
              className={`slot-card__badge ${
                isSlotActive ? "slot-card__badge--active" : "slot-card__badge--inactive"
              }`}
            >
              {isSlotActive ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <div className="slot-card__header-actions">
          {onMoveUp && (
            <button
              type="button"
              className="button button--small button--secondary"
              onClick={onMoveUp}
              disabled={disabled || slotIndex === 0}
              aria-label={`Subir grupo ${slot.name}`}
            >
              Subir
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              className="button button--small button--secondary"
              onClick={onMoveDown}
              disabled={disabled || (totalSlots !== undefined && slotIndex >= totalSlots - 1)}
              aria-label={`Bajar grupo ${slot.name}`}
            >
              Bajar
            </button>
          )}
          <button
            type="button"
            className="button button--small button--secondary"
            onClick={onEdit}
            disabled={disabled}
            aria-label={`Editar grupo ${slot.name}`}
          >
            Editar
          </button>
          <button
            type="button"
            className="button button--small button--secondary"
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Eliminar grupo ${slot.name}`}
            aria-describedby={`slot-draft-hint-${slotIndex}`}
          >
            Retirar grupo
          </button>
        </div>
      </header>

      <div className="slot-card__body">
        <p id={`slot-draft-hint-${slotIndex}`} className="field-hint">Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.</p>
        {slot.options.length === 0 ? (
          <p className="slot-card__empty-notice">
            Este grupo aún no tiene opciones. Debe incluir al menos una opción para ser válido.
          </p>
        ) : (
          <div className="slot-card__options-list">
            {slot.options.map((option, optIdx) => (
              <SlotOptionItem
                key={option.localId || option.optionId || `opt-${optIdx}`}
                option={option}
                optionIndex={optIdx}
                totalOptions={slot.options.length}
                onEdit={() => onEditOption(optIdx)}
                onDelete={() => onDeleteOption(optIdx)}
                onToggleStatus={() => onToggleOptionStatus(optIdx)}
                onMoveUp={onMoveOption ? () => onMoveOption(optIdx, optIdx - 1) : undefined}
                onMoveDown={onMoveOption ? () => onMoveOption(optIdx, optIdx + 1) : undefined}
                canChangeStatus={canChangeStatus}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="slot-card__footer">
        <button
          type="button"
          className="button button--secondary button--full"
          onClick={onAddOption}
          disabled={disabled}
          aria-label={`Agregar opción a ${slot.name}`}
        >
          <Icon name="add" /> Agregar opción
        </button>
      </footer>
    </article>
  );
}
