import { useTaskDialog } from "../../shared/useTaskDialog";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { EntryQuery, EntryStatus, MenuCategory, MenuEntry, MenuRepository, Page } from "../../application/catalog";
import { cachedEntries, entryQueryKey, invalidateCatalogCategories, invalidateCatalogEntries, rememberEntries } from "../../application/catalogCache";
import { loadEntryCategories } from "../../application/entryCategories";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogResults, type DisplayedPage } from "./CatalogResults";
import { catalogErrorKind, catalogErrorMessage, type CatalogErrorKind } from "./catalogError";
import "./styles.css";

const pageSizes = new Set([6, 12, 24]);
const statuses: EntryStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

export type CatalogRepository = Pick<MenuRepository, "listEntries" | "listCategories" | "deleteArchivedEntry">;
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
  dialogOpen: boolean;
  onRetryCategories(): void;
  onRetryEntries(): void;
}

function CatalogFeedback(props: Readonly<CatalogFeedbackProps>) {
  return <>
    {props.categoryError && <div className="feedback feedback--error catalog-feedback" role="alert">No se pudieron cargar las categorías. El listado sigue disponible. <button type="button" onClick={props.onRetryCategories}>Reintentar categorías</button></div>}
    {props.entryError && <div className="feedback feedback--error catalog-feedback" role="alert">{props.entryError.message} <button type="button" onClick={props.onRetryEntries}>Reintentar entradas</button></div>}
    {!props.dialogOpen && props.actionError && <div className="feedback feedback--error catalog-feedback" role="alert">{props.actionError.message} {(props.actionError.kind === "conflict" || props.needsReconcile) && <button type="button" onClick={props.onRetryEntries}>Actualizar lista</button>}</div>}
    {props.notice && <output className="feedback feedback--success">{props.notice}</output>}
    {props.fetching && <output className="catalog-updating">{props.hasDisplayed ? "Actualizando entradas…" : "Cargando entradas…"}</output>}
    {props.busyId && <output className="catalog-updating">Actualizando entrada…</output>}
  </>;
}

export function CatalogPage({ repository }: Readonly<{ repository: CatalogRepository }>) {
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

  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setDraftSearch(query.q ?? "");
  }, [query.q]);

  useEffect(() => {
    setActionError(null);
    setNotice("");
  }, [key]);

  useEffect(() => () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
  }, []);

  useTaskDialog(deleteDialogRef, Boolean(entryToDelete), cancelDeleteRef);

  useEffect(() => {
    if (!entryToDelete) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !actionInProgress.current) closeDeleteDialog();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [entryToDelete]);

  useEffect(() => {
    const controller = new AbortController();
    setCategoryError(false);
    loadEntryCategories(repository, controller.signal, categoryRetry > 0)
      .then((loaded) => {
        if (!controller.signal.aborted) {
          setCategories(loaded);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !(error instanceof DOMException && error.name === "AbortError")) {
          setCategoryError(true);
        }
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

  function updateFilter(name: "categoryId" | "status" | "q" | "pageSize", value: string) {
    const next = new URLSearchParams(paramsRef.current);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    setSearchParams(next);
  }

  function submitSearch() {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    if (draftSearch.trim() !== (query.q ?? "")) updateFilter("q", draftSearch.trim());
  }

  function changeSearch(value: string) {
    setDraftSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim() !== (query.q ?? "")) {
      searchTimer.current = setTimeout(() => updateFilter("q", value.trim()), 300);
    }
  }

  function clearFilters() {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setDraftSearch("");
    setSearchParams(new URLSearchParams());
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(paramsRef.current);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
  }

  function closeDeleteDialog() {
    if (actionInProgress.current) return;
    setEntryToDelete(null);
    setActionError(null);
    setNeedsReconcile(false);
  }

  function retryEntries() {
    setEntryToDelete(null);
    setActionError(null);
    setNeedsReconcile(false);
    invalidateCatalogEntries(repository);
    setEntryRetry((current) => current + 1);
  }

  function retryCategories() {
    setCategoryRetry((current) => current + 1);
  }

  async function reconcileFromDialog() {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setBusyId(entryToDelete?.id ?? "reconcile");
    try {
      invalidateCatalogEntries(repository);
      const { key: latestKey, query: latestQuery } = currentQuery.current;
      const updated = await repository.listEntries(latestQuery);
      if (latestKey === currentQuery.current.key) {
        const corrected = validPage(updated, latestQuery.page);
        if (corrected !== latestQuery.page) {
          const correctedQuery = { ...latestQuery, page: corrected };
          const correctedResult = await repository.listEntries(correctedQuery);
          if (latestKey === currentQuery.current.key) {
            rememberEntries(repository, correctedQuery, correctedResult);
            setDisplayed({ key: entryQueryKey(correctedQuery), query: correctedQuery, result: correctedResult });
            changePage(corrected);
          }
        } else {
          rememberEntries(repository, latestQuery, updated);
          setDisplayed({ key: latestKey, query: latestQuery, result: updated });
        }
      }
      const entryStillExists = updated.data.some((e) => e.id === entryToDelete?.id);
      if (!entryStillExists) {
        setNotice("Entrada eliminada.");
        setEntryToDelete(null);
        setActionError(null);
        setNeedsReconcile(false);
      } else {
        setNeedsReconcile(false);
        setActionError(null);
      }
    } catch {
      setActionError({ kind: "temporary", message: "No se pudo actualizar la lista. Vuelve a intentarlo." });
    } finally {
      actionInProgress.current = false;
      setBusyId(null);
    }
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
        if (latestKey !== currentQuery.current.key) {
          setEntryToDelete(null);
          setActionError(null);
          setNeedsReconcile(false);
          return;
        }
        const corrected = validPage(updated, latestQuery.page);
        if (corrected !== latestQuery.page) {
          const correctedQuery = { ...latestQuery, page: corrected };
          const correctedResult = await repository.listEntries(correctedQuery);
          if (latestKey !== currentQuery.current.key) {
            setEntryToDelete(null);
            setActionError(null);
            setNeedsReconcile(false);
            return;
          }
          rememberEntries(repository, correctedQuery, correctedResult);
          setDisplayed({ key: entryQueryKey(correctedQuery), query: correctedQuery, result: correctedResult });
          changePage(corrected);
        } else {
          rememberEntries(repository, latestQuery, updated);
          setDisplayed({ key: latestKey, query: latestQuery, result: updated });
        }
        setNeedsReconcile(false);
        if (latestKey === currentQuery.current.key) {
          setNotice("Entrada eliminada.");
        }
        setEntryToDelete(null);
        setActionError(null);
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
  const hasFilters = Boolean(draftSearch.trim() || query.q || query.categoryId || query.status);
  const advancedCount = Number(Boolean(query.categoryId)) + Number(Boolean(query.status));
  const returnTo = location.pathname + location.search;

  return (
    <div className="app-shell">
      <main className="menu-page catalog-page">
        <header className="task-header catalog-header">
          <div className="task-header__row">
            <div className="task-header__content">
              <h1 data-route-heading tabIndex={-1}>Entradas del menú</h1>
            </div>
            <div className="task-header__actions catalog-header__actions">
              <Link className="button button--secondary" to="/recipes" state={{ returnTo: location.pathname + location.search }}>Biblioteca de recetas</Link>
              <Link className="button button--secondary" to="/categories" state={{ returnTo: location.pathname + location.search }}>Categorías</Link>
              <Link className="button button--primary" to="/entries/new" state={{ returnTo: location.pathname + location.search }}>Nueva entrada</Link>
            </div>
          </div>
        </header>
        <CatalogFilters search={draftSearch} onSearchChange={changeSearch} onSearch={submitSearch} advancedOpen={advancedOpen} onToggleAdvanced={() => setAdvancedOpen((value) => !value)} advancedCount={advancedCount} categories={categories} categoryId={query.categoryId ?? ""} status={query.status ?? ""} hasFilters={hasFilters} onFilterChange={updateFilter} onClear={clearFilters} />
        <CatalogFeedback categoryError={categoryError} entryError={entryError} actionError={actionError} notice={notice} fetching={fetching} hasDisplayed={Boolean(shown)} busyId={busyId} needsReconcile={needsReconcile} dialogOpen={Boolean(entryToDelete)} onRetryCategories={retryCategories} onRetryEntries={retryEntries} />
        <CatalogResults displayed={displayed} pageSize={query.pageSize} returnTo={returnTo} fetching={fetching} busy={actionsDisabled} olderResults={olderResults} hasFilters={hasFilters} onPageSize={(value) => updateFilter("pageSize", value)} onPage={changePage} onClear={clearFilters} onDelete={setEntryToDelete} />
        {entryToDelete && (
          <div className="dialog-backdrop">
            <dialog
              ref={deleteDialogRef}
              className="confirm-dialog menu-task-dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
              aria-describedby="delete-description"
              onCancel={(event) => {
                event.preventDefault();
                if (!actionInProgress.current) closeDeleteDialog();
              }}
            >
              <h2 id="delete-title">Eliminar entrada archivada</h2>
              <p id="delete-description">Se eliminará definitivamente “{entryToDelete.brandName}”. Confirma solo si deseas retirar esta entrada.</p>
              {actionError && (
                <div className="feedback feedback--error dialog-feedback" role="alert">
                  {actionError.message}{" "}
                  {(actionError.kind === "conflict" || needsReconcile) && (
                    <button type="button" onClick={() => { void reconcileFromDialog(); }}>
                      Actualizar lista
                    </button>
                  )}
                </div>
              )}
              <div className="confirm-dialog__actions">
                <button
                  ref={cancelDeleteRef}
                  className="button button--secondary"
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={closeDeleteDialog}
                  aria-label="Cancelar eliminación"
                >
                  Cancelar
                </button>
                <button
                  className="button button--danger"
                  type="button"
                  disabled={Boolean(busyId) || needsReconcile}
                  onClick={() => { void deleteEntry(entryToDelete); }}
                  aria-label="Confirmar eliminación"
                >
                  Eliminar entrada
                </button>
              </div>
            </dialog>
          </div>
        )}
      </main>
    </div>
  );
}
