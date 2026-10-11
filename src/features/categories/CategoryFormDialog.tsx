import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type { CategoryDraft, MenuCategory } from "../../application/catalog";

interface CategoryFormDialogProps {
  category?: MenuCategory;
  onClose(): void;
  onSubmit(draft: CategoryDraft): Promise<void>;
}

export function CategoryFormDialog({ category, onClose, onSubmit }: Readonly<CategoryFormDialogProps>) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    nameRef.current?.focus();
    return () => {
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = { name: name.trim(), description: description.trim() };
    if (!draft.name) {
      setError("Indica el nombre de la categoría.");
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(draft);
    } catch {
      setError("No se pudo guardar la categoría. Recarga la lista y vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  let saveLabel = "Guardar categoría";
  if (category) saveLabel = "Guardar cambios";
  if (busy) saveLabel = "Guardando…";

  return (
    <dialog
      ref={dialogRef}
      className="category-form-dialog"
      aria-labelledby="category-form-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="category-form-dialog__header">
        <h2 id="category-form-title">{category ? "Editar categoría" : "Crear categoría"}</h2>
        <button className="category-form-dialog__close" type="button" disabled={busy} onClick={onClose} aria-label="Cerrar formulario">×</button>
      </div>
      <form onSubmit={save}>
        <div className="category-form-dialog__fields">
          <div className="category-form-dialog__field">
            <label htmlFor="category-name">Nombre</label>
            <input ref={nameRef} id="category-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required placeholder="Ej. Postres" />
          </div>
          <div className="category-form-dialog__field">
            <label htmlFor="category-description">Descripción</label>
            <textarea id="category-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} rows={3} placeholder="Describe qué entradas agrupa" />
          </div>
          {error && <p className="category-form-dialog__error" role="alert">{error}</p>}
        </div>
        <div className="category-form-dialog__actions">
          <button className="button button--secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="button button--primary" type="submit" disabled={busy}>{saveLabel}</button>
        </div>
      </form>
    </dialog>
  );
}
