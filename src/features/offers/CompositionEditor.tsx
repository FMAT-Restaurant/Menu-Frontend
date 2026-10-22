import { type SlotDraft, SlotCard } from "./SlotCard";

export interface CompositionEditorProps {
  slots: SlotDraft[];
  onAddSlot: () => void;
  onEditSlot: (slotIndex: number) => void;
  onDeleteSlot: (slotIndex: number) => void;
  onAddOption: (slotIndex: number) => void;
  onEditOption: (slotIndex: number, optionIndex: number) => void;
  onDeleteOption: (slotIndex: number, optionIndex: number) => void;
  onToggleOptionStatus: (slotIndex: number, optionIndex: number) => void;
  disabled?: boolean;
}

export function CompositionEditor({
  slots,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onToggleOptionStatus,
  disabled = false,
}: Readonly<CompositionEditorProps>) {
  return (
    <section className="composition-editor" aria-labelledby="composition-editor-title">
      <div className="composition-editor__header">
        <div>
          <h2 id="composition-editor-title" className="composition-editor__title">
            2. Composición
          </h2>
          <p className="composition-editor__subtitle">
            Cada grupo define su participación y cantidad; cada opción elige su propia fuente de contenido.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="button button--secondary"
            disabled
            aria-describedby="copy-composition-pending-hint"
          >
            Copiar composición desde otra oferta
          </button>
          <p id="copy-composition-pending-hint" className="field-hint">
            Función pendiente: copiar la composición desde otra oferta aún no está disponible.
          </p>
        </div>
      </div>

      {slots.length === 0 && (
        <div className="feedback feedback--warning" role="alert">
          La composición debe contener al menos un grupo (slot) con opciones válidas.
        </div>
      )}

      <div className="composition-editor__slots-container">
        {slots.map((slot, index) => (
          <SlotCard
            key={slot.localId || slot.slotId || `slot-${index}`}
            slot={slot}
            slotIndex={index}
            onEdit={() => onEditSlot(index)}
            onDelete={() => onDeleteSlot(index)}
            onAddOption={() => onAddOption(index)}
            onEditOption={(optIdx) => onEditOption(index, optIdx)}
            onDeleteOption={(optIdx) => onDeleteOption(index, optIdx)}
            onToggleOptionStatus={(optIdx) => onToggleOptionStatus(index, optIdx)}
            disabled={disabled}
          />
        ))}

        <button
          type="button"
          className="add-slot-card"
          onClick={onAddSlot}
          disabled={disabled}
          aria-label="Agregar grupo"
        >
          <span className="add-slot-card__icon" aria-hidden="true">+</span>
          <span className="add-slot-card__label">Agregar grupo</span>
        </button>
      </div>
    </section>
  );
}
