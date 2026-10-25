import { useEffect, useRef, useState } from "react";
import type { MenuRepository, Page, RecipeSummary } from "../../application/catalog";
import { SearchField } from "../../shared/SearchField";
import { RecipeCard } from "./RecipeCard";

export interface RecipeSelectionState { draftSearch: string; query: string; page: number }
export const emptyRecipeSelection: RecipeSelectionState = { draftSearch: "", query: "", page: 1 };

export function RecipeSelector({ repository, state, onChange, onSelect, onCreate, onBack, active, slotName, createDisabled = false, focusCreate = false }: {
  repository: Pick<MenuRepository, "listRecipes">;
  state: RecipeSelectionState;
  onChange(state: RecipeSelectionState): void;
  onSelect(recipe: RecipeSummary): void;
  onCreate(): void;
  onBack(): void;
  active: boolean;
  slotName: string;
  createDisabled?: boolean;
  focusCreate?: boolean;
}) {
  const createRef = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<Page<RecipeSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    repository.listRecipes({ q: state.query || undefined, page: state.page, pageSize: 50 }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setResult(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [repository, state.query, state.page, retry]);
  useEffect(() => {
    if (!active) return;
    if (focusCreate) createRef.current?.focus({ preventScroll: true });
    else document.getElementById("recipe-search")?.focus({ preventScroll: true });
  }, [active, focusCreate]);
  return <section className="recipe-selector" hidden={!active} aria-labelledby="recipe-selector-title">
    <header className="recipe-selector__header">
      <button type="button" className="button button--quiet" onClick={onBack}>Volver a la opción</button>
      <h2 id="recipe-selector-title">Elegir receta · {slotName}</h2>
      <button ref={createRef} type="button" className="button button--secondary" aria-label="+ Nueva receta" disabled={createDisabled} onClick={onCreate}>Nueva receta</button>
    </header>
    <SearchField id="recipe-search" label="Buscar recetas" placeholder="Buscar por nombre o descripción…"
      value={state.draftSearch} onChange={draftSearch => onChange({ ...state, draftSearch })}
      onSearch={() => onChange({ ...state, query: state.draftSearch.trim(), page: 1 })} />
    {loading && <output className="feedback">Cargando recetas…</output>}
    {error && <div role="alert" className="feedback feedback--error">No se pudieron cargar las recetas. <button type="button" className="button button--secondary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
    {!loading && !error && !result?.data.length && <div className="recipe-selector__empty">
      <p>{state.query ? "No hay recetas que coincidan con tu búsqueda." : "Aún no hay recetas registradas."}</p>
      {state.query ? <button type="button" className="button button--secondary" onClick={() => { onChange(emptyRecipeSelection); document.getElementById("recipe-search")?.focus(); }}>Limpiar búsqueda</button>
        : <button type="button" className="button button--secondary" disabled={createDisabled} onClick={onCreate}>Crear receta</button>}
    </div>}
    {!loading && !error && <ul className="recipe-list">{result?.data.map(recipe => <li key={recipe.id} className="recipe-list__item">
      <RecipeCard recipe={recipe} mode="selection" onSelect={onSelect} />
    </li>)}</ul>}
    {!loading && !error && result && result.meta.totalPages > 1 && <nav className="pagination" aria-label="Páginas de recetas">
      <button type="button" className="button button--secondary" disabled={state.page <= 1} onClick={() => onChange({ ...state, page: state.page - 1 })} aria-label="Página anterior">Anterior</button>
      <span className="pagination__info">Página {state.page} de {result.meta.totalPages}</span>
      <button type="button" className="button button--secondary" disabled={state.page >= result.meta.totalPages} onClick={() => onChange({ ...state, page: state.page + 1 })} aria-label="Siguiente página">Siguiente</button>
    </nav>}
  </section>;
}
