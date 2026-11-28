import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CatalogViewCategories, CatalogViewEntry, MenuRepository } from "../../application/catalog";
import { isGlobalAuthError } from "../../api/globalAuthErrors";
import { formatMoney } from "../../shared/formatMoney";
import { Icon } from "../../shared/Icon";
import { usePermission } from "../../shared/permissions";
import {
  buildPrintableMenuSections,
  formatPrintableGenerationDate,
  loadAllPrintableCatalogEntries,
  PRINTABLE_MENU_CURRENCY,
  PRINTABLE_MENU_NAME,
  type PrintableMenuEntry,
  type PrintableMenuSection,
} from "./printableMenuModel";
import "./styles.css";

export type PrintableMenuRepository = Pick<
  MenuRepository,
  "getMenuCatalog" | "listMenuCatalogCategories"
>;

export interface PrintableMenuPageProps {
  repository: PrintableMenuRepository;
  now?: () => Date;
}

function PrintableEntryItem({
  sectionId,
  entry,
}: Readonly<{
  sectionId: string;
  entry: PrintableMenuEntry;
}>) {
  const headingId = `carta-entry-${sectionId}-${entry.id}`;
  return (
    <article className="carta-entry" aria-labelledby={headingId}>
      <div className="carta-entry__main">
        {entry.image && (
          <img
            className="carta-entry__image"
            src={entry.image.url}
            alt={entry.brandName}
          />
        )}
        <div className="carta-entry__info">
          <h3 id={headingId} className="carta-entry__name">
            {entry.brandName}
          </h3>
          {entry.description && (
            <p className="carta-entry__description">{entry.description}</p>
          )}
        </div>
      </div>

      <ul className="carta-offers" aria-label={`Ofertas de ${entry.brandName}`}>
        {entry.offers.map((offer) => (
          <li key={offer.id} className="carta-offer">
            {offer.image && (
              <img
                className="carta-offer__image"
                src={offer.image.url}
                alt={`${entry.brandName} — ${offer.presentationTag}`}
              />
            )}
            <span className="carta-offer__tag">{offer.presentationTag}</span>
            <span className="carta-offer__leader" aria-hidden="true" />
            <strong className="carta-offer__price">{formatMoney(offer.basePrice)}</strong>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PrintableSectionBlock({ section }: Readonly<{ section: PrintableMenuSection }>) {
  const sectionHeadingId = `carta-section-${section.id}`;
  return (
    <section className="carta-section" aria-labelledby={sectionHeadingId}>
      <header className="carta-section__header">
        <h2 id={sectionHeadingId} className="carta-section__title">
          {section.name}
        </h2>
        {section.description && (
          <p className="carta-section__description">{section.description}</p>
        )}
      </header>
      <div className="carta-entries">
        {section.entries.map((entry) => (
          <PrintableEntryItem key={entry.id} sectionId={section.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

export function PrintableMenuPage({
  repository,
  now = () => new Date(),
}: Readonly<PrintableMenuPageProps>) {
  const canPrint = usePermission("menu:catalog:print");
  const location = useLocation();
  const returnTo =
    typeof location.state?.returnTo === "string" && /^\/(?:\?.*)?$/.test(location.state.returnTo)
      ? location.state.returnTo
      : "/";

  const [entries, setEntries] = useState<CatalogViewEntry[] | null>(null);
  const [categories, setCategories] = useState<CatalogViewCategories | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date>(() => now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generationCount, setGenerationCount] = useState(0);

  useEffect(() => {
    if (!canPrint) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setGeneratedAt(now());

    Promise.all([
      loadAllPrintableCatalogEntries(repository, controller.signal),
      repository.listMenuCatalogCategories(controller.signal),
    ])
      .then(([loadedEntries, loadedCategories]) => {
        if (controller.signal.aborted) return;
        setEntries(loadedEntries);
        setCategories(loadedCategories);
        setGeneratedAt(now());
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setEntries(null);
        setCategories(null);
        setError(
          isGlobalAuthError(loadError)
            ? ""
            : "No se pudo generar la carta imprimible. Comprueba tu conexión e inténtalo de nuevo.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [canPrint, repository, generationCount]);

  const sections = useMemo(() => {
    if (!entries || !categories) return [];
    return buildPrintableMenuSections(entries, categories);
  }, [entries, categories]);

  if (!canPrint) {
    return (
      <main className="app-shell menu-page menu-page--message">
        <h1 data-route-heading tabIndex={-1}>
          Sin acceso
        </h1>
        <p>No tienes permiso para generar la carta imprimible.</p>
      </main>
    );
  }

  function handleRegenerate() {
    setGenerationCount((count) => count + 1);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="app-shell carta-shell">
      <main className="menu-page carta-page">
        <div className="carta-toolbar" role="region" aria-label="Acciones de la carta">
          <Link className="back-link carta-toolbar__back" to={returnTo}>
            <Icon name="arrow-left" /> Volver al catálogo
          </Link>
          <div className="carta-toolbar__actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={loading}
              onClick={handleRegenerate}
            >
              Actualizar carta
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={loading || Boolean(error) || sections.length === 0}
              onClick={handlePrint}
            >
              Imprimir carta
            </button>
          </div>
        </div>

        <article className="carta-document" aria-labelledby="carta-title" aria-busy={loading}>
          <header className="carta-document__header">
            <div className="carta-document__brand">
              <p className="eyebrow carta-document__eyebrow">{PRINTABLE_MENU_NAME}</p>
              <h1 id="carta-title" data-route-heading tabIndex={-1}>
                Carta del menú
              </h1>
            </div>
            <dl className="carta-document__meta" aria-label="Datos de generación de la carta">
              <div>
                <dt>Menú</dt>
                <dd>{PRINTABLE_MENU_NAME}</dd>
              </div>
              <div>
                <dt>Fecha de generación</dt>
                <dd>
                  <time dateTime={generatedAt.toISOString()}>
                    {formatPrintableGenerationDate(generatedAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Moneda</dt>
                <dd>{PRINTABLE_MENU_CURRENCY}</dd>
              </div>
            </dl>
          </header>

          {error && (
            <div role="alert" className="feedback feedback--error carta-feedback">
              {error}{" "}
              <button type="button" onClick={handleRegenerate}>
                Reintentar
              </button>
            </div>
          )}

          {loading && (
            <p role="status" className="feedback carta-feedback">
              Generando carta imprimible…
            </p>
          )}

          {!loading && !error && sections.length === 0 && (
            <section className="empty-state carta-empty">
              <h2>Carta sin entradas publicables</h2>
              <p>No hay entradas activas con ofertas activas para incluir en la carta.</p>
            </section>
          )}

          {!loading && !error && sections.length > 0 && (
            <div className="carta-sections">
              {sections.map((section) => (
                <PrintableSectionBlock key={section.id} section={section} />
              ))}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
