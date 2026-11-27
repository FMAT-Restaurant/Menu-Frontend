import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { CatalogViewCategories, CatalogViewEntry, MenuRepository, Page } from "../../application/catalog";
import { formatMoney } from "../../shared/formatMoney";
import { usePermission } from "../../shared/permissions";
import "./styles.css";

const pageSize = 24;

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

function EntryCard({ entry }: Readonly<{ entry: CatalogViewEntry }>) {
  return <article
    className={`consultation-entry${entry.isAvailable ? "" : " consultation-entry--unavailable"}`}
    aria-disabled={!entry.isAvailable || undefined}
  >
    {entry.image && <img className="consultation-entry__image" src={entry.image.url} alt={entry.brandName} loading="lazy" />}
    <div className="consultation-entry__body">
      <div className="consultation-entry__heading">
        <h3>{entry.brandName}</h3>
        {!entry.isAvailable && (
          <>
            <span className="availability-badge" aria-label={availabilityLabel(false)}>No disponible</span>
            <span className="availability-badge availability-badge--not-orderable">No ordenable</span>
          </>
        )}
      </div>
      {entry.description && <p>{entry.description}</p>}
      {entry.offers.length === 0 ? <p className="consultation-entry__empty">Sin ofertas disponibles.</p> : <ul className="consultation-offers">
        {entry.offers.map(offer => {
          const offerOrderable = entry.isAvailable && offer.isAvailable;
          return <li
            className={`consultation-offer${offer.isAvailable ? "" : " consultation-offer--unavailable"}`}
            aria-disabled={!offerOrderable || undefined}
            key={offer.id}
          >
            <div className="consultation-offer__heading">
              {offer.image && <img src={offer.image.url} alt="" loading="lazy" />}
              <h4>{offer.presentationTag}</h4>
              <strong>{formatMoney(offer.basePrice)}</strong>
              {offerOrderable ? (
                <span className="orderable-pill orderable-pill--yes">Ordenable</span>
              ) : (
                <>
                  {!offer.isAvailable && <span className="availability-badge" aria-label={availabilityLabel(false)}>No disponible</span>}
                  <span className="availability-badge availability-badge--not-orderable">No ordenable</span>
                </>
              )}
            </div>
            <ul className="consultation-slots" aria-label={`Composición de ${offer.presentationTag}`}>
              {offer.composition.slots.map(slot => <li
                className={!slot.isAvailable ? "consultation-slot--unavailable" : ""}
                aria-disabled={!slot.isAvailable || undefined}
                key={slot.slotId}
              >
                <span>{slot.name}{slot.course ? ` · ${courseLabel(slot.course)}` : ""}{slot.quantity > 1 ? ` × ${slot.quantity}` : ""}</span>
                {!slot.isAvailable && <span className="availability-badge">No disponible</span>}
                <ul>{slot.options.map(option => <li
                  className={!option.isAvailable ? "consultation-option--unavailable" : ""}
                  aria-disabled={!option.isAvailable || undefined}
                  key={option.optionId}
                >
                  <span>{option.displayName}</span>
                  {!option.isAvailable && (
                    <>
                      {" "}
                      <span className="availability-badge">No disponible</span>
                      <span className="consultation-option__reason"> · Sin existencias en Inventario</span>
                    </>
                  )}
                </li>)}</ul>
              </li>)}
            </ul>
          </li>;
        })}
      </ul>}
    </div>
  </article>;
}

export function CatalogConsultationPage({ repository }: Readonly<{ repository: MenuRepository }>) {
  const canReadCatalog = usePermission("menu:catalog:read");
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const page = pageNumber(searchParams.get("page"));
  const [result, setResult] = useState<Page<CatalogViewEntry> | null>(null);
  const [categories, setCategories] = useState<CatalogViewCategories | null>(null);
  const categoriesRef = useRef<CatalogViewCategories | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const visibleGroups = useMemo(() => {
    if (!categories || !result) return [];
    const groups = categories.data.map(category => ({
      id: category.id,
      name: category.name,
      entries: result.data.filter(entry => entry.categoryIds.includes(category.id)),
    })).filter(group => group.entries.length > 0);
    const uncategorized = result.data.filter(entry => entry.categoryIds.length === 0);
    if (uncategorized.length) groups.push({ id: "__uncategorized__", name: "Sin categoría", entries: uncategorized });
    return groups;
  }, [categories, result]);

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
      setResult(catalog);
      setCategories(categoryList);
      categoriesRef.current = categoryList;
    }).catch(() => {
      if (!controller.signal.aborted) setError("No se pudo cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [canReadCatalog, repository, query, categoryId, page, retry]);

  if (!canReadCatalog) return <main className="app-shell menu-page menu-page--message"><h1 data-route-heading tabIndex={-1}>Sin acceso</h1><p>No tienes permiso para consultar el catálogo.</p></main>;

  function updateFilter(name: "q" | "categoryId", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value); else next.delete(name);
    next.delete("page");
    setSearchParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set("page", String(nextPage)); else next.delete("page");
    setSearchParams(next);
  }

  return <div className="app-shell">
    <main className="menu-page consultation-page">
      <header className="task-header">
        <div className="task-header__content">
          <p className="eyebrow">FMAT Restaurant</p>
          <h1 data-route-heading tabIndex={-1}>Menú</h1>
          <p className="task-header__intro">Consulta las entradas, presentaciones y composición disponibles.</p>
        </div>
      </header>
      <section className="consultation-filters" aria-label="Filtros del catálogo">
        <label>Buscar en el menú<input type="search" value={query} onChange={event => updateFilter("q", event.target.value)} placeholder="Nombre, descripción o categoría" /></label>
        <label>Categoría<select value={categoryId} onChange={event => updateFilter("categoryId", event.target.value)}>
          <option value="">Todas las categorías</option>
          {categories?.data.map(category => <option key={category.id} value={category.id}>{category.name} ({category.entryCount})</option>)}
          <option value="__uncategorized__">Sin categoría ({categories?.uncategorized.entryCount ?? 0})</option>
        </select></label>
      </section>
      {error && <div role="alert" className="feedback feedback--error">{error}<button type="button" onClick={() => { categoriesRef.current = null; setCategories(null); setRetry(value => value + 1); }}>Reintentar</button></div>}
      {loading && <p role="status" className="feedback">Cargando catálogo…</p>}
      {!loading && !error && result?.data.length === 0 && <section className="empty-state"><h2>No hay resultados</h2><p>Prueba con otra búsqueda o categoría.</p></section>}
      {!loading && !error && visibleGroups.map(group => <section className="consultation-group" key={group.id} aria-labelledby={`group-${group.id}`}>
        <h2 id={`group-${group.id}`}>{group.name}</h2>
        <div className="consultation-grid">{group.entries.map(entry => <EntryCard key={entry.id} entry={entry} />)}</div>
      </section>)}
      {result && result.meta.totalPages > 1 && <nav className="pagination" aria-label="Páginas del catálogo">
        <button className="button button--secondary" type="button" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}>Anterior</button>
        <span aria-live="polite">Página {page} de {result.meta.totalPages}</span>
        <button className="button button--secondary" type="button" disabled={loading || page >= result.meta.totalPages} onClick={() => changePage(page + 1)}>Siguiente</button>
      </nav>}
    </main>
  </div>;
}
