import axios from "axios";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { createMenuApi } from "./api/menuApi";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { CategoryPage } from "./features/categories/CategoryPage";
import { EntryFormPage } from "./features/entries/EntryFormPage";
import { OffersPage } from "./features/offers/OffersPage";
import { OfferFormPage } from "./features/offers/OfferFormPage";
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

export function App({ repository = defaultRepository }: Readonly<{ repository?: MenuRepository }> = {}) {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
