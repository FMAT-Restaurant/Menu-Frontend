import axios from "axios";
import { lazy, Suspense, useEffect, useState } from "react";
import { createBrowserRouter, createRoutesFromElements, Link, Navigate, Outlet, Route, RouterProvider } from "react-router-dom";
import { EditGuardProvider } from "./shared/editGuard";
import { createRouteTransitionTracker, RouteContext } from "./shared/RouteContext";
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
      <main className="menu-page menu-page--message not-found-page__content">
        <header className="task-header">
          <div className="task-header__content">
            <h1 data-route-heading tabIndex={-1}>Página no encontrada</h1>
            <p className="task-header__intro">La ruta solicitada no existe o fue movida. Verifica la dirección o regresa al catálogo de entradas.</p>
          </div>
        </header>
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

export function createMenuRoutes(repository: MenuRepository = defaultRepository, transitions?: ReturnType<typeof createRouteTransitionTracker>) {
  return createRoutesFromElements(
    <Route element={<div className="menu-module" data-menu-module><EditGuardProvider><RouteContext transitions={transitions} /><Suspense fallback={<div className="app-shell loading-shell" role="status" aria-live="polite"><p>Cargando página…</p></div>}><Outlet /></Suspense></EditGuardProvider></div>}>
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
    </Route>,
  );
}

export function App({ repository = defaultRepository }: Readonly<{ repository?: MenuRepository }> = {}) {
  const [router, setRouter] = useState<ReturnType<typeof createBrowserRouter> | null>(null);
  useEffect(() => {
    // Router construction attaches history listeners. Own it in an effect so a
    // StrictMode replay disposes the discarded instance before creating another.
    const transitions = createRouteTransitionTracker();
    const ownedRouter = createBrowserRouter(createMenuRoutes(repository, transitions));
    transitions.observe(ownedRouter.state.location.pathname);
    const unsubscribe = ownedRouter.subscribe(state => transitions.observe(state.location.pathname));
    setRouter(ownedRouter);
    return () => { unsubscribe(); ownedRouter.dispose(); };
  }, [repository]);
  return router ? <RouterProvider router={router} /> : <div className="menu-module" data-menu-module><p role="status">Cargando página…</p></div>;
}
