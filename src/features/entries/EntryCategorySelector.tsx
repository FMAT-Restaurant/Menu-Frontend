import { LoadingState } from "../../shared/LoadingState";
import { useEffect, useRef, useState } from "react";
import type { MenuCategory } from "../../application/catalog";
import { Icon } from "../../shared/Icon";

interface Props {
  categories: MenuCategory[];
  selected: string[];
  loading: boolean;
  error: string;
  fieldError?: string;
  disabled: boolean;
  continuing: boolean;
  onChange(ids: string[]): void;
  onRetry(): void;
  onContinue(): void;
}

function selectionLabel(count: number) {
  if (count === 0) return "Seleccionar categorías";
  if (count === 1) return "1 categoría seleccionada";
  return `${count} categorías seleccionadas`;
}

function CategoryLoadState({ loading, error, continuing, onRetry, onContinue }: Readonly<Pick<Props, "loading" | "error" | "continuing" | "onRetry" | "onContinue">>) {
  if (loading) return <output className="entry-form__muted" aria-live="polite">Cargando categorías…</output>;
  if (!error) return null;
  return <div className="entry-category-selector__error" role="alert">
    <p>{error}</p>
    <button type="button" onClick={onRetry}>Reintentar categorías</button>
    {!continuing && <button type="button" onClick={onContinue}>Continuar sin añadir categorías</button>}
    {continuing && <p>Se conservarán las asignaciones seleccionadas. Puedes guardar sin añadir categorías.</p>}
  </div>;
}

export function EntryCategorySelector({ categories, selected, loading, error, fieldError, disabled, continuing, onChange, onRetry, onContinue }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLFieldSetElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const known = new Map(categories.map((category) => [category.id, category.name]));
  const nameFor = (id: string) => known.get(id) ?? `Categoría ya asignada (${id})`;
  const missing = selected.filter((id) => !known.has(id)).map((id) => ({ id, name: nameFor(id) }));
  const available = [...categories, ...missing];
  const filtered = available.filter((category) => category.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    function outside(event: MouseEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !(event.target instanceof Node) || !root.current?.contains(event.target)) return;
      event.preventDefault(); setOpen(false); trigger.current?.focus();
    }
    // Collapsing this in-flow panel on pointerdown can move a submit button
    // before pointerup, preventing its click. Dismiss after the click is delivered.
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((value) => value !== id));
    else onChange([...selected, id]);
  }

  return <fieldset ref={root} className="entry-category-selector" aria-busy={loading}>
    <legend>Categorías</legend>
    <p className="entry-form__muted">Puedes asignar varias o guardar sin clasificación.</p>
    <CategoryLoadState loading={loading} error={error} continuing={continuing} onRetry={onRetry} onContinue={onContinue} />
    <button ref={trigger} id="entry-categoryIds" className="entry-category-selector__trigger" type="button" aria-expanded={open} aria-controls="entry-category-panel" data-invalid={Boolean(fieldError)} aria-describedby="entry-categoryIds-error" disabled={disabled} onClick={() => setOpen((value) => !value)}>
      <span>{selectionLabel(selected.length)}</span><span className="entry-category-selector__chevron" aria-hidden="true" />
    </button>
    {open && <div id="entry-category-panel" className="entry-category-selector__panel">
      <label className="entry-category-selector__search-label" htmlFor="entry-category-search">Buscar categorías</label>
      <div className="entry-category-selector__search">
        <Icon name="search" />
        <input ref={search} id="entry-category-search" type="search" placeholder="Nombre de categoría" value={query} onChange={(event) => setQuery(event.target.value)} disabled={disabled} />
      </div>
      <fieldset className="entry-category-selector__list">
        <legend className="sr-only">Categorías disponibles</legend>
        {loading && available.length === 0 && <LoadingState variant="options" />}
        {filtered.map((category) => <label className="entry-category-selector__option" key={category.id}>
          <input type="checkbox" checked={selected.includes(category.id)} onChange={() => toggle(category.id)} disabled={disabled} aria-invalid={Boolean(fieldError)} aria-describedby="entry-categoryIds-error" />
          <span>{category.name}</span>
        </label>)}
        {!loading && !error && available.length === 0 && <p>Aún no hay categorías. Puedes guardar sin clasificación.</p>}
        {available.length > 0 && filtered.length === 0 && <p>No hay coincidencias para esta búsqueda.</p>}
      </fieldset>
    </div>}
    {selected.length > 0 && <ul className="entry-category-selector__selection" aria-label="Categorías seleccionadas">
      {selected.map((id) => <li key={id}><span>{nameFor(id)}</span><button type="button" aria-label={`Retirar categoría ${nameFor(id)}`} disabled={disabled} onClick={() => toggle(id)}><Icon name="close" /></button></li>)}
    </ul>}
    <p id="entry-categoryIds-error" className="entry-form__error">{fieldError}</p>
  </fieldset>;
}
