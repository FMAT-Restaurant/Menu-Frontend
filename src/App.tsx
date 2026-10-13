import axios from "axios";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { createMenuApi } from "./api/menuApi";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { CategoryPage } from "./features/categories/CategoryPage";
import { EntryFormPage } from "./features/entries/EntryFormPage";
import { OffersPage } from "./features/offers/OffersPage";
import { RecipePage } from "./features/recipes/RecipePage";
import type { MenuRepository } from "./application/catalog";

declare global {
  interface Window {
    MENU_CONFIG?: { apiBaseUrl: string };
  }
}

const defaultRepository = createMenuApi(axios.create({
  baseURL: window.MENU_CONFIG?.apiBaseUrl || "/api/v1",
}));

function UpcomingOfferForm() {
  const { entryId } = useParams();
  const location = useLocation();
  const offersPath = `/entries/${encodeURIComponent(entryId ?? "")}/offers`;
  const requestedReturn = location.state && typeof location.state === "object" && "returnTo" in location.state && typeof location.state.returnTo === "string"
    ? location.state.returnTo
    : offersPath;
  const returnTo = requestedReturn === offersPath || requestedReturn.startsWith(`${offersPath}?`) ? requestedReturn : offersPath;
  const requestedCatalogReturn = location.state && typeof location.state === "object" && "catalogReturnTo" in location.state && typeof location.state.catalogReturnTo === "string"
    ? location.state.catalogReturnTo
    : "/";
  const catalogReturnTo = requestedCatalogReturn.startsWith("/") && !requestedCatalogReturn.startsWith("//") ? requestedCatalogReturn : "/";
  return (
    <main className="upcoming-view">
      <Link to={returnTo} state={{ returnTo: catalogReturnTo }} className="back-link">← Volver a ofertas</Link>
      <p className="eyebrow">Administración / Menú / Ofertas</p>
      <h1>Formulario de oferta</h1>
      <p>La creación y edición de ofertas se implementará en V4.</p>
    </main>
  );
}

export function App({ repository = defaultRepository }: Readonly<{ repository?: MenuRepository }> = {}) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CatalogPage repository={repository} />} />
        <Route path="/menu" element={<Navigate to="/" replace />} />
        <Route path="/entries/new" element={<EntryFormPage repository={repository} />} />
        <Route path="/entries/:entryId/edit" element={<EntryFormPage repository={repository} />} />
        <Route path="/entries/:entryId/offers" element={<OffersPage repository={repository} />} />
        <Route path="/entries/:entryId/offers/new" element={<UpcomingOfferForm />} />
        <Route path="/entries/:entryId/offers/:offerId/edit" element={<UpcomingOfferForm />} />
        <Route path="/categories" element={<CategoryPage repository={repository} />} />
        <Route path="/recipes" element={<RecipePage repository={repository} />} />
      </Routes>
    </BrowserRouter>
  );
}
