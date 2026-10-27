import { LoadingState } from "../../shared/LoadingState";
import { useEffect, useRef, useState } from "react";
import type { MenuRepository, Page, RecipeSummary } from "../../application/catalog";
import { SearchField } from "../../shared/SearchField";
import { RecipeCard } from "./RecipeCard";

export interface RecipeSelectionState { draftSearch: string; query: string; page: number }
export const emptyRecipeSelection: RecipeSelectionState = { draftSearch: "", query: "", page: 1 };

interface RecipeSelectorProps {
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
}

export function RecipeSelector({ repository, state, onChange, onSelect, onCreate, onBack, active, slotName, createDisabled = false, focusCreate = false }: Readonly<RecipeSelectorProps>) {
  const createRef = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<Page<RecipeSummary> | null>(null);
  const [displayedContext, setDisplayedContext] = useState<{ query: string; page: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    repository.listRecipes({ q: state.query || undefined, page: state.page, pageSize: 50 }, controller.signal)
      .then(value => { if (!controller.signal.aborted) { setResult(value); setDisplayedContext({ query: state.query, page: state.page }); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [repository, state.query, state.page, retry]);
  useEffect(() => {
    if (!active) return;
    if (focusCreate) createRef.current?.focus({ preventScroll: true });
    else document.getElementById("recipe-search")?.focus({ preventScroll: true });
  }, [active, focusCreate]);
  const olderResults = Boolean(displayedContext && (displayedContext.query !== state.query || displayedContext.page !== state.page));
  const resultsBusy = loading || olderResults;
  return <section className="recipe-selector" hidden={!active} aria-labelledby="recipe-selector-title" aria-busy={loading}>
    <header className="recipe-selector__header">
      <button type="button" className="button button--quiet" onClick={onBack}>Volver a la opción</button>
      <h2 id="recipe-selector-title">Elegir receta · {slotName}</h2>
      <button ref={createRef} type="button" className="button button--secondary" aria-label="+ Nueva receta" disabled={createDisabled} onClick={onCreate}>Nueva receta</button>
    </header>
    <SearchField id="recipe-search" label="Buscar recetas" placeholder="Buscar por nombre o descripción…"
      value={state.draftSearch} onChange={draftSearch => onChange({ ...state, draftSearch })}
      onSearch={() => onChange({ ...state, query: state.draftSearch.trim(), page: 1 })} />
    {loading && !result && <LoadingState variant="recipe-selection" label="Cargando recetas…" />}
    {loading && result && <output className="feedback">Actualizando recetas…</output>}
    {olderResults && <p className="feedback">Resultados anteriores: {displayedContext?.query ? `búsqueda “${displayedContext.query}”` : "todas las recetas"}, página {displayedContext?.page}. La nueva consulta aún no se ha confirmado.</p>}
    {error && <div role="alert" className="feedback feedback--error">No se pudieron cargar las recetas. <button type="button" className="button button--secondary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
    {!loading && !error && !olderResults && !result?.data.length && <div className="recipe-selector__empty">
      <p>{state.query ? "No hay recetas que coincidan con tu búsqueda." : "Aún no hay recetas registradas."}</p>
      {state.query ? <button type="button" className="button button--secondary" onClick={() => { onChange(emptyRecipeSelection); document.getElementById("recipe-search")?.focus(); }}>Limpiar búsqueda</button>
        : <button type="button" className="button button--secondary" disabled={createDisabled} onClick={onCreate}>Crear receta</button>}
    </div>}
    {result && <ul className="recipe-list">{result?.data.map(recipe => <li key={recipe.id} className="recipe-list__item">
      <RecipeCard recipe={recipe} mode="selection" onSelect={onSelect} isBusy={resultsBusy} />
    </li>)}</ul>}
    {result && result.meta.totalPages > 1 && <nav className="pagination" aria-label="Páginas de recetas">
      <button type="button" className="button button--secondary" disabled={result.meta.page <= 1 || resultsBusy} onClick={() => onChange({ ...state, page: state.page - 1 })} aria-label="Página anterior">Anterior</button>
      <span className="pagination__info">Página {result.meta.page} de {result.meta.totalPages}</span>
      <button type="button" className="button button--secondary" disabled={result.meta.page >= result.meta.totalPages || resultsBusy} onClick={() => onChange({ ...state, page: state.page + 1 })} aria-label="Siguiente página">Siguiente</button>
    </nav>}
  </section>;
}
