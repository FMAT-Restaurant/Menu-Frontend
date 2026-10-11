import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { EntryQuery, EntryStatus, MenuCategory, MenuEntry, MenuRepository, Page } from "../../application/catalog";
import { SearchField } from "../../shared/SearchField";
import { EntryCard } from "./EntryCard";

const pageSizes = [6, 12, 24];
const statuses: EntryStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

function positiveNumber(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function CatalogPage({ repository }: Readonly<{ repository: MenuRepository }>) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const requestedStatus = searchParams.get("status");
  const status = statuses.find((value) => value === requestedStatus);
  const page = positiveNumber(searchParams.get("page"), 1);
  const pageSize = pageSizes.includes(Number(searchParams.get("pageSize"))) ? Number(searchParams.get("pageSize")) : 12;
  const [draftSearch, setDraftSearch] = useState(q);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [result, setResult] = useState<Page<MenuEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [actionError, setActionError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<MenuEntry | null>(null);
  const [notice, setNotice] = useState("");
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setDraftSearch(q), [q]);

  useEffect(() => {
    if (!entryToDelete) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = deleteDialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    cancelDeleteRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEntryToDelete(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
      previouslyFocused?.focus();
    };
  }, [entryToDelete]);

  useEffect(() => {
    const controller = new AbortController();
    setCategoryError("");
    repository.listCategories(controller.signal).then(setCategories).catch(() => {
      if (!controller.signal.aborted) setCategoryError("No se pudieron cargar las categorías.");
    });
    return () => controller.abort();
  }, [repository, retry]);

  useEffect(() => {
    const controller = new AbortController();
    const query: EntryQuery = { page, pageSize };
    if (q) query.q = q;
    if (categoryId) query.categoryId = categoryId;
    if (status) query.status = status;
    setLoading(true);
    setError("");
    repository.listEntries(query, controller.signal).then((pageResult) => {
      if (!controller.signal.aborted) setResult(pageResult);
    }).catch(() => {
      if (!controller.signal.aborted) setError("No se pudieron cargar las entradas.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [repository, q, categoryId, status, page, pageSize, retry]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  async function changeStatus(entry: MenuEntry, nextStatus: EntryStatus) {
    setBusyId(entry.id);
    setNotice("");
    setActionError("");
    try {
      await repository.setEntryStatus(entry.id, nextStatus);
      setRetry((current) => current + 1);
      setNotice(nextStatus === "ARCHIVED" ? "Entrada archivada." : "Estado administrativo actualizado.");
    } catch {
      setActionError("No se pudo cambiar el estado. Recarga la lista e inténtalo de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!entryToDelete) return;
    setBusyId(entryToDelete.id);
    setNotice("");
    setActionError("");
    try {
      await repository.deleteArchivedEntry(entryToDelete.id);
      setEntryToDelete(null);
      setRetry((current) => current + 1);
      setNotice("Entrada eliminada.");
    } catch {
      setActionError("No se pudo eliminar la entrada. Comprueba su estado y vuelve a intentarlo.");
      setEntryToDelete(null);
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = Boolean(q || categoryId || status);
  const count = result?.data.length ?? 0;
  const total = result?.meta.total ?? 0;
  const totalPages = result?.meta.totalPages ?? 0;
  const first = count ? (page - 1) * pageSize + 1 : 0;
  const last = count ? first + count - 1 : 0;
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => Math.abs(number - page) <= 2);

  return (
    <div className="app-shell">
      <nav className="global-nav" aria-label="Navegación principal">
        <Link className="brand" to="/"><span className="brand__mark" aria-hidden="true">F</span><span>FMAT <strong>Restaurant</strong></span></Link>
        <span className="global-nav__section">Administración del menú</span>
      </nav>

      <main className="catalog-page">
        <header className="catalog-header">
          <div>
            <p className="eyebrow">Administración / Menú</p>
            <h1>Entradas del menú</h1>
            <p className="catalog-header__intro">Gestiona la identidad y el estado administrativo de cada entrada.</p>
          </div>
          <div className="catalog-header__actions">
            <Link className="button button--secondary" to="/recipes">Biblioteca de recetas</Link>
            <Link className="button button--secondary" to="/categories" state={{ returnTo: location.pathname + location.search }}>Categorías</Link>
            <Link className="button button--primary" to="/entries/new">Nueva entrada</Link>
          </div>
        </header>

        <section className="filters" aria-label="Filtros de entradas">
          <SearchField value={draftSearch} onChange={setDraftSearch} onSearch={() => updateFilter("q", draftSearch.trim())} />
          <div className="select-field">
            <label htmlFor="category-filter">Categoría</label>
            <select id="category-filter" value={categoryId} onChange={(event) => updateFilter("categoryId", event.target.value)}>
              <option value="">Todas las categorías</option>
              <option value="__uncategorized__">Sin categoría</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className="select-field">
            <label htmlFor="status-filter">Estado administrativo</label>
            <select id="status-filter" value={status ?? ""} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
              <option value="ARCHIVED">Archivada</option>
            </select>
          </div>
          <button className="button button--quiet filters__clear" type="button" onClick={() => setSearchParams(new URLSearchParams())} disabled={!hasFilters}>Limpiar filtros</button>
        </section>

        <div className="catalog-toolbar">
          <div>
            <p className="catalog-toolbar__count" aria-live="polite">Mostrando {first}–{last} de {total} entradas</p>
            <p className="catalog-toolbar__note">El estado administrativo no confirma publicación. Se requiere una oferta activa válida.</p>
          </div>
          <div className="select-field select-field--inline">
            <label htmlFor="page-size">Entradas por página</label>
            <select id="page-size" value={pageSize} onChange={(event) => updateFilter("pageSize", event.target.value)}>
              {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="feedback feedback--error" role="alert">{error} <button type="button" onClick={() => setRetry((current) => current + 1)}>Reintentar</button></div>}
        {categoryError && <div className="feedback feedback--error" role="alert">{categoryError} <button type="button" onClick={() => setRetry((current) => current + 1)}>Reintentar</button></div>}
        {actionError && <div className="feedback feedback--error" role="alert">{actionError}</div>}
        {notice && <output className="feedback feedback--success">{notice}</output>}
        {loading && <output className="feedback">Cargando entradas…</output>}
        {!loading && !error && count > 0 && <section className="entry-grid" aria-label="Entradas administrativas">{result?.data.map((entry) => <EntryCard key={entry.id} entry={entry} busy={busyId === entry.id} onStatusChange={changeStatus} onDelete={setEntryToDelete} />)}</section>}
        {!loading && !error && count === 0 && (
          <section className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">⌕</span>
            <h2>{hasFilters ? "No hay coincidencias para esta consulta." : "Aún no hay entradas."}</h2>
            <p>{hasFilters ? "Prueba otra búsqueda o limpia los filtros para recuperar la lista." : "Crea la primera entrada para comenzar a administrar el menú."}</p>
            {hasFilters ? <button className="button button--primary" type="button" onClick={() => setSearchParams(new URLSearchParams())}>Limpiar filtros</button> : <Link className="button button--primary" to="/entries/new">Nueva entrada</Link>}
          </section>
        )}

        {!loading && !error && totalPages > 1 && (
          <nav className="pagination" aria-label="Páginas de entradas">
            <button type="button" className="button button--secondary" disabled={page <= 1} onClick={() => changePage(page - 1)} aria-label="Página anterior">Anterior</button>
            {visiblePages.map((number) => <button key={number} type="button" className={`pagination__number ${number === page ? "pagination__number--current" : ""}`} aria-current={number === page ? "page" : undefined} onClick={() => changePage(number)}>{number}</button>)}
            <button type="button" className="button button--secondary" disabled={page >= totalPages} onClick={() => changePage(page + 1)} aria-label="Siguiente página">Siguiente</button>
          </nav>
        )}
        {entryToDelete && (
          <div className="dialog-backdrop">
            <dialog ref={deleteDialogRef} className="confirm-dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); setEntryToDelete(null); }}>
              <h2 id="delete-title">Eliminar entrada archivada</h2>
              <p id="delete-description">Se eliminará definitivamente “{entryToDelete.brandName}”. Confirma solo si deseas retirar esta entrada.</p>
              <div className="confirm-dialog__actions">
                <button ref={cancelDeleteRef} className="button button--secondary" type="button" disabled={busyId === entryToDelete.id} onClick={() => setEntryToDelete(null)} aria-label="Cancelar eliminación">Cancelar</button>
                <button className="button button--danger" type="button" disabled={busyId === entryToDelete.id} onClick={confirmDelete} aria-label="Confirmar eliminación">Eliminar entrada</button>
              </div>
            </dialog>
          </div>
        )}
      </main>
    </div>
  );
}
