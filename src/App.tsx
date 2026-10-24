import axios from "axios";
import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { createMenuApi } from "./api/menuApi";
import type { MenuRepository } from "./application/catalog";

const CatalogPage = lazy(() =>
  import("./features/catalog/CatalogPage").then((m) => ({ default: m.CatalogPage })),
);
const CategoryPage = lazy(() =>
  import("./features/categories/CategoryPage").then((m) => ({ default: m.CategoryPage })),
);
const EntryFormPage = lazy(() =>
  import("./features/entries/EntryFormPage").then((m) => ({ default: m.EntryFormPage })),
);
const OffersPage = lazy(() =>
  import("./features/offers/OffersPage").then((m) => ({ default: m.OffersPage })),
);
const OfferFormPage = lazy(() =>
  import("./features/offers/OfferFormPage").then((m) => ({ default: m.OfferFormPage })),
);
const RecipePage = lazy(() =>
  import("./features/recipes/RecipePage").then((m) => ({ default: m.RecipePage })),
);

export function NotFoundPage() {
  return (
    <div className="app-shell not-found-page">
      <nav className="global-nav" aria-label="Navegación principal">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            F
          </span>
          <span>
            FMAT <strong>Restaurant</strong>
          </span>
        </Link>
        <span className="global-nav__section">Administración del menú</span>
      </nav>
      <main
        className="not-found-page__content"
        style={{
          padding: "3rem 1.5rem",
          maxWidth: "600px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Página no encontrada</h1>
        <p
          style={{
            color: "var(--color-text-muted, #64748b)",
            marginBottom: "2rem",
          }}
        >
          La ruta solicitada no existe o fue movida. Verifica la dirección o regresa al catálogo de entradas.
        </p>
        <Link to="/" className="button button--primary">
          Volver al catálogo
        </Link>
      </main>
    </div>
  );
}

declare global {
  interface Window {
    MENU_CONFIG?: { apiBaseUrl?: string; inventoryApiBaseUrl?: string };
  }
}

const menuBaseUrl = window.MENU_CONFIG?.apiBaseUrl || "/api/v1";
const inventoryBaseUrl = window.MENU_CONFIG?.inventoryApiBaseUrl || menuBaseUrl;

const defaultRepository = createMenuApi(
  axios.create({
    baseURL: menuBaseUrl,
  }),
  axios.create({
    baseURL: inventoryBaseUrl,
  }),
);

export function App({ repository = defaultRepository }: Readonly<{ repository?: MenuRepository }> = {}) {
  return (
    <BrowserRouter>
      <div className="menu-module" data-menu-module>
        <Suspense
          fallback={
            <div
              className="app-shell loading-shell"
              role="status"
              aria-live="polite"
              style={{ padding: "2rem", textAlign: "center" }}
            >
              <p>Cargando página…</p>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<CatalogPage repository={repository} />} />
            <Route path="/menu" element={<Navigate to="/" replace />} />
            <Route path="/entries/new" element={<EntryFormPage repository={repository} />} />
            <Route path="/entries/:entryId/edit" element={<EntryFormPage repository={repository} />} />
            <Route path="/entries/:entryId/offers" element={<OffersPage repository={repository} />} />
            <Route path="/entries/:entryId/offers/new" element={<OfferFormPage repository={repository} />} />
            <Route path="/entries/:entryId/offers/:offerId/edit" element={<OfferFormPage repository={repository} />} />
            <Route path="/categories" element={<CategoryPage repository={repository} />} />
            <Route path="/recipes" element={<RecipePage repository={repository} />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
