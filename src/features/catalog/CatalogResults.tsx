import { Link } from "react-router-dom";
import type { EntryQuery, MenuEntry, Page } from "../../application/catalog";
import { EntryCard } from "./EntryCard";

export interface DisplayedPage { key: string; query: EntryQuery; result: Page<MenuEntry> }

interface ResultsProps {
  displayed: DisplayedPage | null;
  pageSize: number;
  returnTo: string;
  fetching: boolean;
  busy: boolean;
  olderResults: boolean;
  hasFilters: boolean;
  onPageSize(size: string): void;
  onPage(page: number): void;
  onClear(): void;
  onDelete(entry: MenuEntry): void;
}

function EmptyEntries({ hasFilters, returnTo, onClear }: Readonly<Pick<ResultsProps, "hasFilters" | "returnTo" | "onClear">>) {
  let title = "Aún no hay entradas.";
  let description = "Crea la primera entrada para comenzar a administrar el menú.";
  if (hasFilters) {
    title = "No hay coincidencias para esta consulta.";
    description = "Prueba otra búsqueda o limpia los filtros para recuperar la lista.";
  }
  return <section className="empty-state">
    <span className="empty-state__icon" aria-hidden="true">⌕</span>
    <h2>{title}</h2><p>{description}</p>
    {hasFilters ? <button className="button button--primary" type="button" onClick={onClear}>Limpiar filtros</button> : <Link className="button button--primary" to="/entries/new" state={{ returnTo }}>Nueva entrada</Link>}
  </section>;
}

function EntryPagination({ page, totalPages, disabled, onPage }: Readonly<{ page: number; totalPages: number; disabled: boolean; onPage(page: number): void }>) {
  const visible = Array.from({ length: totalPages }, (_, index) => index + 1).filter((number) => Math.abs(number - page) <= 2);
  return <nav className="pagination" aria-label="Páginas de entradas">
    <button type="button" className="button button--secondary" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">Anterior</button>
    {visible.map((number) => <button key={number} type="button" className={`pagination__number ${number === page ? "pagination__number--current" : ""}`} disabled={disabled} aria-current={number === page ? "page" : undefined} onClick={() => onPage(number)}>{number}</button>)}
    <button type="button" className="button button--secondary" disabled={disabled || page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Siguiente página">Siguiente</button>
  </nav>;
}

function EntryGrid(props: Readonly<Pick<ResultsProps, "displayed" | "busy" | "returnTo" | "onDelete">>) {
  return <div className="entry-grid" aria-label="Entradas administrativas">{props.displayed?.result.data.map((entry) => <EntryCard key={entry.id} entry={entry} busy={props.busy} returnTo={props.returnTo} onDelete={props.onDelete} />)}</div>;
}

function showEmpty(props: Pick<ResultsProps, "displayed" | "olderResults" | "fetching">, count: number) {
  return Boolean(props.displayed) && count === 0 && !props.olderResults && !props.fetching;
}

function ResultsToolbar(props: Readonly<Pick<ResultsProps, "displayed" | "pageSize" | "olderResults" | "onPageSize">>) {
  const shown = props.displayed?.result;
  const shownPage = props.displayed?.query.page ?? 1;
  const count = shown?.data.length ?? 0;
  const total = shown?.meta.total ?? 0;
  const first = count ? (shownPage - 1) * (props.displayed?.query.pageSize ?? 12) + 1 : 0;
  const last = count ? first + count - 1 : 0;
  return <div className="catalog-toolbar">
      <div>
        {shown && <p className="catalog-toolbar__count" aria-live="polite">Mostrando {first}–{last} de {total} entradas</p>}
        {props.olderResults && <p className="catalog-toolbar__note">Mostrando resultados anteriores mientras se actualiza la consulta.</p>}
      </div>
      <div className="select-field select-field--inline"><label htmlFor="page-size">Entradas por página</label><select id="page-size" value={props.pageSize} onChange={(event) => props.onPageSize(event.target.value)}>{[6, 12, 24].map((size) => <option key={size} value={size}>{size}</option>)}</select></div>
    </div>;
}

function ResultsBody(props: Readonly<Omit<ResultsProps, "pageSize" | "onPageSize">>) {
  const shown = props.displayed?.result;
  const shownPage = props.displayed?.query.page ?? 1;
  const count = shown?.data.length ?? 0;
  const totalPages = shown?.meta.totalPages ?? 0;
  return (
    <section className="catalog-results" aria-busy={props.fetching || props.busy}>
      {shown && count > 0 && <EntryGrid {...props} />}
      {showEmpty(props, count) && <EmptyEntries hasFilters={props.hasFilters} returnTo={props.returnTo} onClear={props.onClear} />}
      {shown && totalPages > 1 && <EntryPagination page={shownPage} totalPages={totalPages} disabled={props.busy} onPage={props.onPage} />}
    </section>
  );
}

export function CatalogResults(props: Readonly<ResultsProps>) {
  return <>
    <ResultsToolbar displayed={props.displayed} pageSize={props.pageSize} olderResults={props.olderResults} onPageSize={props.onPageSize} />
    <ResultsBody {...props} />
  </>;
}
