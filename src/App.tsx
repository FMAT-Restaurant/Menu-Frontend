import axios from "axios";
import { lazy, Suspense, useEffect, useState } from "react";
import { createBrowserRouter, createRoutesFromElements, Link, Navigate, Outlet, Route, RouterProvider } from "react-router-dom";
import { EditGuardProvider } from "./shared/editGuard";
import { createRouteTransitionTracker, RouteContext } from "./shared/RouteContext";
import { createMenuApi } from "./api/menuApi";
import type { MenuRepository } from "./application/catalog";
import "./styles.css";

export interface ShellUser {
  id: string;
  userType: "ADMIN" | "STAFF";
  staffId?: string;
  email?: string;
  displayName: string;
  roleLabel?: string;
  roles?: string[];
  permissions: string[];
}

export interface FederatedModuleProps {
  token?: string;
  currentUser?: ShellUser;
  theme?: "light" | "dark";
}

export function hasPermission(user: ShellUser | undefined, requiredPermission: string): boolean {
  return !!user && (user.userType === "ADMIN" || !!user.permissions?.includes("*") || !!user.permissions?.includes(requiredPermission));
}

function getStoredSession(): { accessToken?: string; user?: ShellUser } | null {
  try {
    const raw = localStorage.getItem("fmat_restaurant_auth_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const CatalogPage = lazy(() => import("./features/catalog/CatalogPage").then(({ CatalogPage }) => ({ default: CatalogPage })));
const CategoryPage = lazy(() => import("./features/categories/CategoryPage").then(({ CategoryPage }) => ({ default: CategoryPage })));
const EntryFormPage = lazy(() => import("./features/entries/EntryFormPage").then(({ EntryFormPage }) => ({ default: EntryFormPage })));
const OffersPage = lazy(() => import("./features/offers/OffersPage").then(({ OffersPage }) => ({ default: OffersPage })));
const OfferFormPage = lazy(() => import("./features/offers/OfferFormPage").then(({ OfferFormPage }) => ({ default: OfferFormPage })));
const RecipePage = lazy(() => import("./features/recipes/RecipePage").then(({ RecipePage }) => ({ default: RecipePage })));

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

// Configuración en runtime: el contenedor (/runtime-config.js) o el Shell definen window.MENU_CONFIG.
// Sin configuración se usan rutas relativas al mismo origen.
const menuBaseUrl = window.MENU_CONFIG?.apiBaseUrl || "/api/v1/menu";
const inventoryBaseUrl = window.MENU_CONFIG?.inventoryApiBaseUrl || "/api/v1";

function createDefaultRepository(token?: string): MenuRepository {
  // `stripPrefix` evita duplicar `/menu` cuando la base ya termina en `/api/v1/menu`.
  const makeClient = (baseURL: string, stripPrefix?: string) => {
    const client = axios.create({ baseURL });
    client.interceptors.request.use(config => {
      if (stripPrefix && config.url?.startsWith(`${stripPrefix}/`) && baseURL.replace(/\/$/, "").endsWith(stripPrefix)) {
        config.url = config.url.slice(stripPrefix.length);
      }
      const activeToken = token ?? getStoredSession()?.accessToken;
      if (activeToken) config.headers.set("Authorization", `Bearer ${activeToken}`);
      return config;
    });
    return client;
  };
  return createMenuApi(
    makeClient(menuBaseUrl, "/menu"),
    makeClient(inventoryBaseUrl),
  );
}

const defaultRepository = createDefaultRepository();

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

export function App({ repository, token, currentUser, theme }: Readonly<FederatedModuleProps & { repository?: MenuRepository }> = {}) {
  const activeUser = currentUser ?? getStoredSession()?.user;
  const activeToken = token ?? getStoredSession()?.accessToken;
  const isFederated = token !== undefined || currentUser !== undefined || theme !== undefined;
  const [router, setRouter] = useState<ReturnType<typeof createBrowserRouter> | null>(null);
  useEffect(() => {
    // Router construction attaches history listeners. Own it in an effect so a
    // StrictMode replay disposes the discarded instance before creating another.
    const transitions = createRouteTransitionTracker();
    const effectiveRepository = repository ?? (activeToken ? createDefaultRepository(activeToken) : defaultRepository);
    const basename = isFederated && /^\/menu(?:\/|$)/.test(window.location.pathname) ? "/menu" : undefined;
    const ownedRouter = createBrowserRouter(createMenuRoutes(effectiveRepository, transitions), { basename });
    transitions.observe(ownedRouter.state.location.pathname);
    const unsubscribe = ownedRouter.subscribe(state => transitions.observe(state.location.pathname));
    setRouter(ownedRouter);
    return () => { unsubscribe(); ownedRouter.dispose(); };
  }, [repository, activeToken, isFederated]);
  return router ? <div data-theme={theme} data-menu-user-id={activeUser?.id}><RouterProvider router={router} /></div> : null;
}

export default App;
