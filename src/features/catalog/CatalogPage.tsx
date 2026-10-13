import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { EntryQuery, EntryStatus, MenuCategory, MenuEntry, MenuRepository, Page } from "../../application/catalog";
import { cachedCategories, cachedEntries, entryQueryKey, invalidateCatalogCategories, invalidateCatalogEntries, rememberCategories, rememberEntries } from "../../application/catalogCache";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogResults, type DisplayedPage } from "./CatalogResults";
import { catalogErrorKind, catalogErrorMessage, type CatalogErrorKind } from "./catalogError";

const pageSizes = new Set([6, 12, 24]);
const statuses: EntryStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

interface Feedback { kind: CatalogErrorKind; message: string }

function positiveNumber(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function validPage(result: Page<MenuEntry>, requested: number): number {
  const last = Math.max(1, result.meta.totalPages);
  if (result.meta.page !== requested && result.meta.page <= last) return result.meta.page;
  return Math.min(requested, last);
}

function queryFromUrl(searchParams: URLSearchParams): EntryQuery {
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const query: EntryQuery = {
    page: positiveNumber(searchParams.get("page"), 1),
    pageSize: pageSizes.has(requestedPageSize) ? requestedPageSize : 12,
  };
  const q = searchParams.get("q")?.trim();
  const categoryId = searchParams.get("categoryId");
  const status = statuses.find((value) => value === searchParams.get("status"));
  if (q) query.q = q;
  if (categoryId) query.categoryId = categoryId;
  if (status) query.status = status;
  return query;
}

interface CatalogFeedbackProps {
  categoryError: boolean;
  entryError: Feedback | null;
  actionError: Feedback | null;
  notice: string;
  fetching: boolean;
  hasDisplayed: boolean;
  busyId: string | null;
  needsReconcile: boolean;
  onRetryCategories(): void;
  onRetryEntries(): void;
}

function CatalogFeedback(props: Readonly<CatalogFeedbackProps>) {
  return <>
    {props.categoryError && <div className="feedback feedback--error catalog-feedback" role="alert">No se pudieron cargar las categorías. El listado sigue disponible. <button type="button" onClick={props.onRetryCategories}>Reintentar categorías</button></div>}
    {props.entryError && <div className="feedback feedback--error catalog-feedback" role="alert">{props.entryError.message} <button type="button" onClick={props.onRetryEntries}>Reintentar entradas</button></div>}
    {props.actionError && <div className="feedback feedback--error catalog-feedback" role="alert">{props.actionError.message} {(props.actionError.kind === "conflict" || props.needsReconcile) && <button type="button" onClick={props.onRetryEntries}>Actualizar lista</button>}</div>}
    {props.notice && <output className="feedback feedback--success">{props.notice}</output>}
    {props.fetching && <output className="catalog-updating">{props.hasDisplayed ? "Actualizando entradas…" : "Cargando entradas…"}</output>}
    {props.busyId && <output className="catalog-updating">Actualizando entrada…</output>}
  </>;
}

export function CatalogPage({ repository }: Readonly<{ repository: MenuRepository }>) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = queryFromUrl(searchParams);
  const key = entryQueryKey(query);
  const currentQuery = useRef({ key, query });
  currentQuery.current = { key, query };
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;
  const [draftSearch, setDraftSearch] = useState(query.q ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [displayed, setDisplayed] = useState<DisplayedPage | null>(null);
  const [fetching, setFetching] = useState(true);
  const [entryError, setEntryError] = useState<Feedback | null>(null);
  const [categoryError, setCategoryError] = useState(false);
  const [actionError, setActionError] = useState<Feedback | null>(null);
  const [entryRetry, setEntryRetry] = useState(0);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const actionInProgress = useRef(false);
  const [needsReconcile, setNeedsReconcile] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<MenuEntry | null>(null);
  const [notice, setNotice] = useState("");
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setDraftSearch(query.q ?? ""), [query.q]);

  useEffect(() => {
    setActionError(null);
    setNotice("");
  }, [key]);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  useEffect(() => {
    if (!entryToDelete) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = deleteDialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    cancelDeleteRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !actionInProgress.current) setEntryToDelete(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
      previouslyFocused?.focus();
    };
  }, [entryToDelete]);

  useEffect(() => {
    const cached = cachedCategories(repository);
    if (cached) {
      setCategories(cached);
      setCategoryError(false);
      return;
    }
    const controller = new AbortController();
    setCategoryError(false);
    repository.listCategories(controller.signal).then((loaded) => {
      if (controller.signal.aborted) return;
      rememberCategories(repository, loaded);
      setCategories(loaded);
    }).catch(() => {
      if (!controller.signal.aborted) setCategoryError(true);
    });
    return () => controller.abort();
  }, [repository, categoryRetry]);

  useEffect(() => {
    const requested = queryFromUrl(searchParams);
    const requestedKey = entryQueryKey(requested);
    const cached = cachedEntries(repository, requested);
    if (cached) {
      setDisplayed({ key: requestedKey, query: requested, result: cached });
      setEntryError(null);
      setFetching(false);
      setNeedsReconcile(false);
      return;
    }
    const controller = new AbortController();
    setFetching(true);
    setEntryError(null);
    repository.listEntries(requested, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      const corrected = validPage(result, requested.page);
      if (corrected !== requested.page) {
        const next = new URLSearchParams(searchParams);
        if (corrected === 1) next.delete("page");
        else next.set("page", String(corrected));
        setSearchParams(next, { replace: true });
        return;
      }
      rememberEntries(repository, requested, result);
      setDisplayed({ key: requestedKey, query: requested, result });
      setNeedsReconcile(false);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const kind = catalogErrorKind(error);
      setEntryError({ kind, message: catalogErrorMessage(kind, "load") });
    }).finally(() => {
      if (!controller.signal.aborted) setFetching(false);
    });
    return () => controller.abort();
  }, [repository, key, entryRetry, setSearchParams]);

  function updateFilter(name: string, value: string) {
    const next = new URLSearchParams(paramsRef.current);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    setSearchParams(next);
  }

  function submitSearch() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (draftSearch.trim() !== (query.q ?? "")) updateFilter("q", draftSearch.trim());
  }

  function changeSearch(value: string) {
    setDraftSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim() !== (query.q ?? "")) searchTimer.current = setTimeout(() => updateFilter("q", value.trim()), 300);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(paramsRef.current);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  function retryEntries() {
    setEntryToDelete(null);
    invalidateCatalogEntries(repository);
    setEntryRetry((current) => current + 1);
  }

  function retryCategories() {
    setCategoryRetry((current) => current + 1);
  }

  async function deleteEntry(entry: MenuEntry) {
    if (actionInProgress.current || needsReconcile) return;
    actionInProgress.current = true;
    setBusyId(entry.id);
    setActionError(null);
    setNotice("");
    try {
      await repository.deleteArchivedEntry(entry.id);
      invalidateCatalogEntries(repository);
      invalidateCatalogCategories(repository);
      const { key: latestKey, query: latestQuery } = currentQuery.current;
      try {
        const updated = await repository.listEntries(latestQuery);
        if (latestKey === currentQuery.current.key) {
          const corrected = validPage(updated, latestQuery.page);
          if (corrected !== latestQuery.page) {
            const correctedQuery = { ...latestQuery, page: corrected };
            const correctedResult = await repository.listEntries(correctedQuery);
            rememberEntries(repository, correctedQuery, correctedResult);
            setDisplayed({ key: entryQueryKey(correctedQuery), query: correctedQuery, result: correctedResult });
            changePage(corrected);
          } else {
            rememberEntries(repository, latestQuery, updated);
            setDisplayed({ key: latestKey, query: latestQuery, result: updated });
          }
        }
        setNeedsReconcile(false);
        if (latestKey === currentQuery.current.key) {
          setNotice("Entrada eliminada.");
        }
        setEntryToDelete(null);
      } catch {
        setNeedsReconcile(true);
        setActionError({ kind: "temporary", message: "El cambio se aplicó, pero no se pudo actualizar la lista. Actualízala antes de continuar." });
      }
    } catch (error) {
      const kind = catalogErrorKind(error);
      setNeedsReconcile(kind === "network" || kind === "conflict");
      setActionError({ kind, message: catalogErrorMessage(kind, "delete") });
    } finally {
      actionInProgress.current = false;
      setBusyId(null);
    }
  }

  const shown = displayed?.result;
  const olderResults = Boolean(displayed && (displayed.key !== key || entryError || needsReconcile));
  const actionsDisabled = Boolean(busyId || fetching || olderResults);
  const hasFilters = Boolean(query.q || query.categoryId || query.status);
  const advancedCount = Number(Boolean(query.categoryId)) + Number(Boolean(query.status));
  const returnTo = location.pathname + location.search;

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
          </div>
          <div className="catalog-header__actions">
            <Link className="button button--secondary catalog-header__later" to="/recipes">Biblioteca de recetas <small>Próximamente</small></Link>
            <Link className="button button--secondary" to="/categories" state={{ returnTo }}>Categorías</Link>
            <Link className="button button--primary" to="/entries/new" state={{ returnTo }}>Nueva entrada</Link>
          </div>
        </header>
        <CatalogFilters search={draftSearch} onSearchChange={changeSearch} onSearch={submitSearch} advancedOpen={advancedOpen} onToggleAdvanced={() => setAdvancedOpen((value) => !value)} advancedCount={advancedCount} categories={categories} categoryId={query.categoryId ?? ""} status={query.status ?? ""} hasFilters={hasFilters} onFilterChange={updateFilter} onClear={() => setSearchParams(new URLSearchParams())} />
        <CatalogFeedback categoryError={categoryError} entryError={entryError} actionError={actionError} notice={notice} fetching={fetching} hasDisplayed={Boolean(shown)} busyId={busyId} needsReconcile={needsReconcile} onRetryCategories={retryCategories} onRetryEntries={retryEntries} />
        <CatalogResults displayed={displayed} pageSize={query.pageSize} returnTo={returnTo} fetching={fetching} busy={actionsDisabled} olderResults={olderResults} hasFilters={hasFilters} onPageSize={(value) => updateFilter("pageSize", value)} onPage={changePage} onClear={() => setSearchParams(new URLSearchParams())} onDelete={setEntryToDelete} />
        {entryToDelete && <div className="dialog-backdrop"><dialog ref={deleteDialogRef} className="confirm-dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); if (!actionInProgress.current) setEntryToDelete(null); }}><h2 id="delete-title">Eliminar entrada archivada</h2><p id="delete-description">Se eliminará definitivamente “{entryToDelete.brandName}”. Confirma solo si deseas retirar esta entrada.</p><div className="confirm-dialog__actions"><button ref={cancelDeleteRef} className="button button--secondary" type="button" disabled={Boolean(busyId)} onClick={() => setEntryToDelete(null)} aria-label="Cancelar eliminación">Cancelar</button><button className="button button--danger" type="button" disabled={Boolean(busyId)} onClick={() => { void deleteEntry(entryToDelete); }} aria-label="Confirmar eliminación">Eliminar entrada</button></div></dialog></div>}
      </main>
    </div>
  );
}
