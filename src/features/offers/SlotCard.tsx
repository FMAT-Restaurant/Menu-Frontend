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
  onEdit: () => void;
  onDelete: () => void;
  onAddOption: () => void;
  onEditOption: (optionIndex: number) => void;
  onDeleteOption: (optionIndex: number) => void;
  onToggleOptionStatus: (optionIndex: number) => void;
  disabled?: boolean;
}

export function SlotCard({
  slot,
  slotIndex,
  onEdit,
  onDelete,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onToggleOptionStatus,
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
                onEdit={() => onEditOption(optIdx)}
                onDelete={() => onDeleteOption(optIdx)}
                onToggleStatus={() => onToggleOptionStatus(optIdx)}
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
