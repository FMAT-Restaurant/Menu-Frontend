import { useEffect, useRef, useState, type SubmitEvent } from "react";
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

export function SlotModal({
  isOpen,
  initialData,
  onSave,
  onClose,
}: Readonly<SlotModalProps>) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [course, setCourse] = useState<OfferCourse | "">("");
  const [validationError, setValidationError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setQuantity(initialData.quantity > 0 ? initialData.quantity : 1);
      setCourse(initialData.course ?? "");
    } else {
      setName("");
      setQuantity(1);
      setCourse("");
    }
    setValidationError("");
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
    const cleanName = name.trim();
    if (!cleanName) {
      setValidationError("El nombre del grupo es obligatorio.");
      return;
    }
    if (quantity < 1 || !Number.isFinite(quantity)) {
      setValidationError("La cantidad de rondas debe ser al menos 1.");
      return;
    }
    onSave({
      name: cleanName,
      quantity,
      course: course === "" ? null : course,
    });
  }

  const title = initialData ? "Editar grupo" : "Definir nuevo grupo";

  return (
    <dialog
      ref={dialogRef}
      className="slot-modal-dialog"
      aria-labelledby="slot-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="modal-header">
        <h2 id="slot-modal-title">{title}</h2>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Cerrar modal de grupo"
        >
          ✕
        </button>
      </header>

      <form onSubmit={handleSubmit} className="slot-form" noValidate>
        <div className="modal-body">
          {validationError && (
            <p className="feedback feedback--error" role="alert">
              {validationError}
            </p>
          )}

          <div className="form-field">
            <label htmlFor="slot-name-input">Nombre del grupo</label>
            <input
              id="slot-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Plato principal o Acompañamiento"
              autoFocus
              required
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="slot-quantity-input">
                Unidades incluidas
              </label>
              <input
                id="slot-quantity-input"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                required
              />
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
            onClick={onClose}
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
