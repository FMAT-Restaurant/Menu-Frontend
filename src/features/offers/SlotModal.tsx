import { sameDraft, useEditGuard } from "../../shared/editGuard";
import { Icon } from "../../shared/Icon";
import { useTaskDialog } from "../../shared/useTaskDialog";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import type { OfferCourse } from "../../application/catalog";

export interface SlotModalData {
  name: string;
  quantity: number;
  course: OfferCourse | null;
}

export interface SlotModalProps {
  isOpen: boolean;
  initialData: SlotModalData | null;
  onSave: (data: SlotModalData) => void;
  onClose: () => void;
}

function parseRoundsQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || !Number.isSafeInteger(num) || num < 1) {
    return null;
  }
  return num;
}

export function SlotModal({
  isOpen,
  initialData,
  onSave,
  onClose,
}: Readonly<SlotModalProps>) {
  const [name, setName] = useState("");
  const [quantityText, setQuantityText] = useState("1");
  const [course, setCourse] = useState<OfferCourse | "">("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; quantity?: string }>({});
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setQuantityText(String(initialData.quantity > 0 ? initialData.quantity : 1));
      setCourse(initialData.course ?? "");
    } else {
      setName("");
      setQuantityText("1");
      setCourse("");
    }
    setFieldErrors({});
  }, [initialData, isOpen]);

  useTaskDialog(dialogRef, isOpen);

  const guard = useEditGuard({ dirty: !sameDraft({ name, quantity: quantityText, course }, { name: initialData?.name ?? "", quantity: String(initialData?.quantity ?? 1), course: initialData?.course ?? "" }), blocked: false }, undefined, isOpen);
  const requestClose = () => guard.request(onClose);

  if (!isOpen) return null;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const parsedQuantity = parseRoundsQuantity(quantityText);
    const nextErrors: { name?: string; quantity?: string } = {};
    if (!cleanName) {
      nextErrors.name = "El nombre del grupo es obligatorio.";
    }
    if (parsedQuantity === null) {
      nextErrors.quantity = "Escribe un número entero de rondas de selección, igual o mayor que 1.";
    }
    if (nextErrors.name || nextErrors.quantity || parsedQuantity === null) {
      setFieldErrors(nextErrors);
      return;
    }
    onSave({
      name: cleanName,
      quantity: parsedQuantity,
      course: course === "" ? null : course,
    });
  }

  const title = initialData ? "Editar grupo" : "Definir nuevo grupo";

  return (
    <dialog
      ref={dialogRef}
      className="slot-modal-dialog menu-task-dialog"
      aria-labelledby="slot-modal-title"
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!event.repeat) requestClose(); } }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      {guard.confirmation}
      <header className="modal-header">
        <h2 id="slot-modal-title">{title}</h2>
        <button
          type="button"
          className="modal-close"
          onClick={requestClose}
          aria-label="Cerrar modal de grupo"
        >
          <Icon name="close" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="slot-form" noValidate>
        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="slot-name-input">Nombre del grupo</label>
            <input
              id="slot-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Ej. Plato principal o Acompañamiento"
              autoFocus
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "slot-name-error" : undefined}
            />
            <p id="slot-name-error" className="field-error" role={fieldErrors.name ? "alert" : undefined}>
              {fieldErrors.name ?? ""}
            </p>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="slot-quantity-input">
                Rondas de selección
              </label>
              <input
                id="slot-quantity-input"
                type="text"
                inputMode="numeric"
                value={quantityText}
                onChange={(e) => {
                  setQuantityText(e.target.value);
                  if (fieldErrors.quantity) setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
                }}
                required
                aria-invalid={Boolean(fieldErrors.quantity)}
                aria-describedby={fieldErrors.quantity ? "slot-quantity-error slot-rounds-help" : "slot-rounds-help"}
              />
              <p id="slot-quantity-error" className="field-error" role={fieldErrors.quantity ? "alert" : undefined}>
                {fieldErrors.quantity ?? ""}
              </p>
              <p id="slot-rounds-help" className="field-hint">Indica cuántas veces se elige entre las opciones de este grupo.</p>
            </div>

            <div className="form-field">
              <label htmlFor="slot-course-select">
                Curso / tiempo sugerido (opcional)
              </label>
              <select
                id="slot-course-select"
                value={course}
                onChange={(e) => setCourse(e.target.value as OfferCourse | "")}
              >
                <option value="">Sin especificar</option>
                <option value="entrada">Entrada</option>
                <option value="plato fuerte">Plato fuerte</option>
                <option value="postre">Postre</option>
                <option value="bebida">Bebida</option>
              </select>
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="button button--secondary"
            onClick={requestClose}
          >
            Cancelar
          </button>
          <button type="submit" className="button button--primary">
            Guardar grupo
          </button>
        </footer>
      </form>
    </dialog>
  );
}
