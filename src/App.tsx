import axios from "axios";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { createMenuApi } from "./api/menuApi";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { CategoryPage } from "./features/categories/CategoryPage";
import { EntryFormPage } from "./features/entries/EntryFormPage";
import type { MenuRepository } from "./application/catalog";

declare global {
  interface Window {
    MENU_CONFIG?: { apiBaseUrl: string };
  }
}

const defaultRepository = createMenuApi(axios.create({
  baseURL: window.MENU_CONFIG?.apiBaseUrl || "/api/v1",
}));

function UpcomingView({ title }: Readonly<{ title: string }>) {
  return (
    <main className="upcoming-view">
      <Link to="/" className="back-link">← Volver a entradas</Link>
      <p className="eyebrow">Administración / Menú</p>
      <h1>{title}</h1>
      <p>Esta vista se implementará en su tarea correspondiente.</p>
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
        <Route path="/entries/:entryId/offers" element={<UpcomingView title="Ofertas de entrada" />} />
        <Route path="/categories" element={<CategoryPage repository={repository} />} />
        <Route path="/recipes" element={<UpcomingView title="Biblioteca de recetas" />} />
      </Routes>
    </BrowserRouter>
  );
}
