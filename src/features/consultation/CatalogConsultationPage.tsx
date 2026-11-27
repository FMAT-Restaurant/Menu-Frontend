import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { CatalogViewCategories, CatalogViewEntry, MenuRepository, Page } from "../../application/catalog";
import { formatMoney } from "../../shared/formatMoney";
import { Icon } from "../../shared/Icon";
import { usePermission } from "../../shared/permissions";
import { ConsultationFilters } from "./ConsultationFilters";
import "./styles.css";

const pageSize = 24;
const searchDebounceMs = 250;

interface VisibleGroup {
  id: string;
  name: string;
  entries: CatalogViewEntry[];
}

interface DisplayedCatalog {
  result: Page<CatalogViewEntry>;
  query: string;
  categoryId: string;
}

function pageNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function courseLabel(course?: string) {
  if (!course) return "";
  return course.charAt(0).toLocaleUpperCase("es-MX") + course.slice(1);
}

function availabilityLabel(isAvailable: boolean) {
  return isAvailable ? "Disponible" : "No disponible";
}

function buildVisibleGroups(categories: CatalogViewCategories | null, displayed: DisplayedCatalog | null): VisibleGroup[] {
  if (!categories || !displayed) return [];
  const entries = displayed.result.data;
  if (displayed.categoryId === "__uncategorized__") {
    const uncategorized = entries.filter((entry) => entry.categoryIds.length === 0);
    return uncategorized.length > 0 ? [{ id: "__uncategorized__", name: "Sin categoría", entries: uncategorized }] : [];
  }
  if (displayed.categoryId) {
    const selected = categories.data.find((category) => category.id === displayed.categoryId);
    if (!selected) return [];
    const matching = entries.filter((entry) => entry.categoryIds.includes(selected.id));
    return matching.length > 0 ? [{ id: selected.id, name: selected.name, entries: matching }] : [];
  }
  const groups = categories.data
    .map((category) => ({
      id: category.id,
      name: category.name,
      entries: entries.filter((entry) => entry.categoryIds.includes(category.id)),
    }))
    .filter((group) => group.entries.length > 0);
  const uncategorized = entries.filter((entry) => entry.categoryIds.length === 0);
  if (uncategorized.length > 0) {
    groups.push({ id: "__uncategorized__", name: "Sin categoría", entries: uncategorized });
  }
  return groups;
}

function EntryCard({ entry }: Readonly<{ entry: CatalogViewEntry }>) {
  return <article className={`consultation-entry${entry.isAvailable ? "" : " consultation-entry--unavailable"}`}>
    {entry.image && <img className="consultation-entry__image" src={entry.image.url} alt={entry.brandName} loading="lazy" />}
    <div className="consultation-entry__body">
      <div className="consultation-entry__heading">
        <h3>{entry.brandName}</h3>
        {!entry.isAvailable && <span className="availability-badge" aria-label={availabilityLabel(false)}>No disponible</span>}
      </div>
      {entry.description && <p>{entry.description}</p>}
      {entry.offers.length === 0 ? <p className="consultation-entry__empty">Sin ofertas disponibles.</p> : <ul className="consultation-offers">
        {entry.offers.map((offer) => <li className={`consultation-offer${offer.isAvailable ? "" : " consultation-offer--unavailable"}`} key={offer.id}>
          <div className="consultation-offer__heading">
            {offer.image && <img src={offer.image.url} alt="" loading="lazy" />}
            <h4>{offer.presentationTag}</h4>
            <strong>{formatMoney(offer.basePrice)}</strong>
            {!offer.isAvailable && <span className="availability-badge" aria-label={availabilityLabel(false)}>No disponible</span>}
          </div>
          <ul className="consultation-slots" aria-label={`Composición de ${offer.presentationTag}`}>
            {offer.composition.slots.map((slot) => <li className={slot.isAvailable ? "" : "consultation-slot--unavailable"} key={slot.slotId}>
              <span>{slot.name}{slot.course ? ` · ${courseLabel(slot.course)}` : ""}{slot.quantity > 1 ? ` × ${slot.quantity}` : ""}</span>
              {!slot.isAvailable && <span className="availability-badge">No disponible</span>}
              <ul>{slot.options.map((option) => <li className={option.isAvailable ? "" : "consultation-option--unavailable"} key={option.optionId}>
                {option.displayName}{!option.isAvailable && <span className="availability-badge"> (No disponible)</span>}
              </li>)}</ul>
            </li>)}
          </ul>
        </li>)}
      </ul>}
    </div>
  </article>;
}

function ConsultationEmptyState({ hasAppliedFilters, onClear }: Readonly<{ hasAppliedFilters: boolean; onClear(): void }>) {
  const description = hasAppliedFilters
    ? "Prueba con otra búsqueda o categoría."
    : "Aún no hay entradas disponibles en el menú.";
  return (
    <section className="empty-state">
      <span className="empty-state__icon" aria-hidden="true"><Icon name="search" /></span>
      <h2>No hay resultados</h2>
      <p>{description}</p>
      {hasAppliedFilters && (
        <button type="button" className="button button--primary" onClick={onClear}>
          Ver todo el menú
        </button>
      )}
    </section>
  );
}

export function CatalogConsultationPage({ repository }: Readonly<{ repository: MenuRepository }>) {
  const canReadCatalog = usePermission("menu:catalog:read");
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const categoryId = (searchParams.get("categoryId") ?? "").trim();
  const page = pageNumber(searchParams.get("page"));
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;

  const [draftSearch, setDraftSearch] = useState(query);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayed, setDisplayed] = useState<DisplayedCatalog | null>(null);
  const [categories, setCategories] = useState<CatalogViewCategories | null>(null);
  const categoriesRef = useRef<CatalogViewCategories | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  const visibleGroups = useMemo(() => buildVisibleGroups(categories, displayed), [categories, displayed]);
  const activeCount = Number(Boolean(query)) + Number(Boolean(categoryId));
  const hasFilters = Boolean(draftSearch.trim() || query || categoryId);
  const hasAppliedFilters = Boolean(displayed?.query || displayed?.categoryId);

  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setDraftSearch((current) => (current.trim() === query ? current : query));
  }, [query]);

  useEffect(() => () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!canReadCatalog) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      repository.getMenuCatalog({ q: query || undefined, categoryId: categoryId || undefined, page, pageSize }, controller.signal),
      categoriesRef.current ? Promise.resolve(categoriesRef.current) : repository.listMenuCatalogCategories(controller.signal),
    ]).then(([catalog, categoryList]) => {
      if (controller.signal.aborted) return;
      setDisplayed({ result: catalog, query, categoryId });
      setCategories(categoryList);
      categoriesRef.current = categoryList;
    }).catch(() => {
      if (!controller.signal.aborted) setError("No se pudo cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [canReadCatalog, repository, query, categoryId, page, retry]);

  if (!canReadCatalog) {
    return <main className="app-shell menu-page menu-page--message"><h1 data-route-heading tabIndex={-1}>Sin acceso</h1><p>No tienes permiso para consultar el catálogo.</p></main>;
  }

  function updateFilter(name: "q" | "categoryId", value: string) {
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
    const trimmed = draftSearch.trim();
    if (trimmed !== query || page > 1) {
      updateFilter("q", trimmed);
    }
  }

  function changeSearch(value: string) {
    setDraftSearch(value);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      if (query) updateFilter("q", "");
      return;
    }
    if (trimmed !== query) {
      searchTimer.current = setTimeout(() => updateFilter("q", trimmed), searchDebounceMs);
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
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setSearchParams(next);
  }

  const totalPages = displayed?.result.meta.totalPages ?? 0;

  return <div className="app-shell">
    <main className="menu-page consultation-page">
      <header className="task-header">
        <div className="task-header__content">
          <p className="eyebrow">FMAT Restaurant</p>
          <h1 data-route-heading tabIndex={-1}>Menú</h1>
          <p className="task-header__intro">Consulta las entradas, presentaciones y composición disponibles.</p>
        </div>
      </header>
      <ConsultationFilters
        search={draftSearch}
        onSearchChange={changeSearch}
        onSearch={submitSearch}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={(value) => updateFilter("categoryId", value)}
        hasFilters={hasFilters}
        activeCount={activeCount}
        onClear={clearFilters}
      />
      {error && <div role="alert" className="feedback feedback--error">{error}<button type="button" onClick={() => { categoriesRef.current = null; setCategories(null); setRetry((value) => value + 1); }}>Reintentar</button></div>}
      {loading && !displayed && <p role="status" className="feedback">Cargando catálogo…</p>}
      {loading && displayed && <output className="consultation-updating">Actualizando catálogo…</output>}
      <div className="consultation-results" aria-busy={loading}>
        {!loading && !error && displayed && visibleGroups.length === 0 && (
          <ConsultationEmptyState hasAppliedFilters={hasAppliedFilters} onClear={clearFilters} />
        )}
        {!error && visibleGroups.map((group) => <section className="consultation-group" key={group.id} aria-labelledby={`group-${group.id}`}>
          <h2 id={`group-${group.id}`}>{group.name}</h2>
          <div className="consultation-grid">{group.entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}</div>
        </section>)}
      </div>
      {!error && totalPages > 1 && <nav className="pagination" aria-label="Páginas del catálogo">
        <button className="button button--secondary" type="button" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}>Anterior</button>
        <span aria-live="polite">Página {page} de {totalPages}</span>
        <button className="button button--secondary" type="button" disabled={loading || page >= totalPages} onClick={() => changePage(page + 1)}>Siguiente</button>
      </nav>}
    </main>
  </div>;
}
