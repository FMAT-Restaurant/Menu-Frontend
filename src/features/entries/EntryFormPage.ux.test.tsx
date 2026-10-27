import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MenuEntryDetail } from "../../application/catalog";
import { createControllableIndexedDbHarness, createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import { EntryFormPage, type EntryFormRepository } from "./EntryFormPage";

const current: MenuEntryDetail = {
  id: "ux07-entry", brandName: "Entrada vigente", description: "Descripción conservada", status: "INACTIVE",
  categoryIds: ["ux07-category"], imageRef: "ux07-image", etag: '"ux07-v1"',
};

function repository(): jest.Mocked<EntryFormRepository> {
  return {
    listCategories: jest.fn().mockResolvedValue([{ id: "ux07-category", name: "Principales" }]),
    getEntry: jest.fn().mockResolvedValue(current),
    uploadEntryImage: jest.fn(), createEntry: jest.fn(), updateEntry: jest.fn(),
  };
}

function renderEditor(api: EntryFormRepository) {
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: createControllableIndexedDbHarness().factory });
  return render(<MemoryRouter initialEntries={[{ pathname: "/entries/ux07-entry/edit", state: { returnTo: "/?q=vigente&page=2" } }]}>
    <Routes>
      <Route path="/entries/:entryId/edit" element={<EntryFormPage repository={api} storage={storage} />} />
      <Route path="/" element={<h1>Catálogo restaurado</h1>} />
    </Routes>
  </MemoryRouter>);
}

test("an entry HTTP 404 presents a useful missing state instead of a disabled creation form or retry", async () => {
  const api = repository();
  api.getEntry.mockRejectedValue({ response: { status: 404, data: { error: { message: "Entrada eliminada" } } } });
  renderEditor(api);
  expect(await screen.findByRole("heading", { name: "Entrada no encontrada" })).toBeVisible();
  expect(screen.getByRole("alert", { name: "Entrada no encontrada" })).toHaveTextContent("La entrada solicitada ya no existe.");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Guardar|Reintentar entrada/ })).not.toBeInTheDocument();
  const catalog = screen.getByRole("link", { name: "Volver al catálogo" });
  expect(catalog).toHaveAttribute("href", "/?q=vigente&page=2");
  fireEvent.click(catalog);
  expect(await screen.findByRole("heading", { name: "Catálogo restaurado" })).toBeVisible();
  expect(api.createEntry).not.toHaveBeenCalled();
  expect(api.updateEntry).not.toHaveBeenCalled();
  expect(api.getEntry).toHaveBeenCalledTimes(1);
});

test("a temporary load failure retries the entry and retains the independently loaded categories", async () => {
  const api = repository();
  api.getEntry.mockRejectedValueOnce({ response: { status: 503, data: {} } });
  renderEditor(api);
  fireEvent.click(await screen.findByRole("button", { name: "Reintentar entrada" }));
  expect(await screen.findByDisplayValue(current.brandName)).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Entrada no encontrada" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1 categoría seleccionada" })).toBeEnabled();
  expect(api.getEntry).toHaveBeenCalledTimes(2);
  expect(api.listCategories).toHaveBeenCalledTimes(1);
});

test("late categories preserve the entry identity draft, assigned identity and existing image reference", async () => {
  const api = repository();
  let finish: (categories: Awaited<ReturnType<EntryFormRepository["listCategories"]>>) => void = () => {};
  api.listCategories.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  renderEditor(api);
  const name = await screen.findByDisplayValue(current.brandName);
  fireEvent.change(name, { target: { value: "Edición mientras llegan categorías" } });
  expect(screen.getByText("Cargando categorías…")).toBeVisible();
  expect(screen.getByText("Imagen actual conservada · referencia ux07-image")).toBeVisible();
  expect(screen.getByRole("button", { name: "Retirar categoría Categoría ya asignada (ux07-category)" })).toBeVisible();
  await act(async () => { finish([{ id: "ux07-category", name: "Principales" }]); });
  expect(name).toHaveValue("Edición mientras llegan categorías");
  expect(screen.getByRole("button", { name: "Retirar categoría Principales" })).toBeVisible();
  expect(screen.getByText("Imagen actual conservada · referencia ux07-image")).toBeVisible();
  expect(api.getEntry).toHaveBeenCalledTimes(1);
  expect(api.listCategories).toHaveBeenCalledTimes(1);
  expect(api.uploadEntryImage).not.toHaveBeenCalled();
});
