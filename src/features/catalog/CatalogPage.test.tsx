import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuRepository } from "../../application/catalog";
import { CatalogPage } from "./CatalogPage";

const entries = [{
  id: "entry-1",
  brandName: "Hamburguesa Hawaiana",
  description: "Carne, queso y piña",
  status: "ACTIVE" as const,
  image: { id: "image-1", url: "https://images.example/1", thumbnailUrl: "https://images.example/thumb-1" },
  categories: [{ id: "category-1", name: "Hamburguesas" }],
  offerCount: 2,
}];

function repository(total = 1): jest.Mocked<MenuRepository> {
  return {
    listEntries: jest.fn().mockResolvedValue({
      data: total ? entries : [],
      meta: { page: 1, pageSize: 12, total, totalPages: total ? 1 : 0 },
    }),
    listCategories: jest.fn().mockResolvedValue([
      { id: "category-1", name: "Hamburguesas", description: "", entryCount: 1 },
    ]),
    setEntryStatus: jest.fn().mockResolvedValue(undefined),
    deleteArchivedEntry: jest.fn().mockResolvedValue(undefined),
  };
}

function renderPage(api: MenuRepository, url = "/") {
  render(<MemoryRouter initialEntries={[url]}><CatalogPage repository={api} /></MemoryRouter>);
}

test("shows administrative identity, classification and navigation without claiming publication", async () => {
  const api = repository();
  renderPage(api);

  expect(await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();
  const card = within(screen.getByRole("article"));
  expect(screen.getByText("Carne, queso y piña")).toBeVisible();
  expect(card.getByText("Hamburguesas")).toBeVisible();
  expect(card.getByText("2 ofertas")).toBeVisible();
  expect(card.getByText("Activa", { exact: true })).toBeVisible();
  expect(screen.queryByText(/publicada/i)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Editar Hamburguesa Hawaiana" })).toHaveAttribute("href", "/entries/entry-1/edit");
  expect(screen.getByRole("link", { name: "Ver ofertas de Hamburguesa Hawaiana" })).toHaveAttribute("href", "/entries/entry-1/offers");
  expect(screen.getByRole("link", { name: "Nueva entrada" })).toHaveAttribute("href", "/entries/new");
  expect(screen.getByRole("link", { name: "Categorías" })).toHaveAttribute("href", "/categories");
  expect(screen.getByRole("link", { name: "Biblioteca de recetas" })).toHaveAttribute("href", "/recipes");
});

test("sends search and filters to the administrative API and resets the page", async () => {
  const api = repository();
  renderPage(api, "/?page=3");
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar entradas" }), { target: { value: "piña" } });
  fireEvent.submit(screen.getByRole("search"));
  fireEvent.change(screen.getByRole("combobox", { name: "Categoría" }), { target: { value: "category-1" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "ACTIVE" } });

  await waitFor(() => expect(api.listEntries).toHaveBeenLastCalledWith({
    q: "piña", categoryId: "category-1", status: "ACTIVE", page: 1, pageSize: 12,
  }, expect.any(AbortSignal)));
});

test("explains an empty filtered result and restores the list when filters are cleared", async () => {
  const api = repository(0);
  renderPage(api, "/?q=imposible&status=ARCHIVED");

  expect(await screen.findByText("No hay coincidencias para esta consulta.")).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Limpiar filtros" })[1]);

  await waitFor(() => expect(api.listEntries).toHaveBeenLastCalledWith({ page: 1, pageSize: 12 }, expect.any(AbortSignal)));
});

test("uses the page metadata returned by the server for pagination", async () => {
  const api = repository();
  api.listEntries.mockResolvedValue({
    data: entries,
    meta: { page: 1, pageSize: 6, total: 13, totalPages: 3 },
  });
  renderPage(api, "/?pageSize=6");

  expect(await screen.findByText("Mostrando 1–1 de 13 entradas")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Siguiente página" }));

  await waitFor(() => expect(api.listEntries).toHaveBeenLastCalledWith({ page: 2, pageSize: 6 }, expect.any(AbortSignal)));
});

test("archives an active entry and asks the server to refresh the administrative list", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  fireEvent.click(screen.getByRole("button", { name: "Archivar Hamburguesa Hawaiana" }));

  await waitFor(() => expect(api.setEntryStatus).toHaveBeenCalledWith("entry-1", "ARCHIVED"));
  await waitFor(() => expect(api.listEntries).toHaveBeenCalledTimes(2));
  expect(api.deleteArchivedEntry).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Eliminar definitivamente Hamburguesa Hawaiana" })).not.toBeInTheDocument();
});

test("offers explicit unarchive to INACTIVE and deletion only for archived entries", async () => {
  const api = repository();
  api.listEntries.mockResolvedValue({
    data: [{ ...entries[0], status: "ARCHIVED" }],
    meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
  });
  renderPage(api, "/?status=ARCHIVED");
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  fireEvent.click(screen.getByRole("button", { name: "Desarchivar Hamburguesa Hawaiana" }));
  await waitFor(() => expect(api.setEntryStatus).toHaveBeenCalledWith("entry-1", "INACTIVE"));

  fireEvent.click(await screen.findByRole("button", { name: "Eliminar definitivamente Hamburguesa Hawaiana" }));
  expect(screen.getByRole("dialog", { name: "Eliminar entrada archivada" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Cancelar eliminación" })).toHaveFocus();
  expect(api.deleteArchivedEntry).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(api.deleteArchivedEntry).not.toHaveBeenCalled();

  fireEvent.click(await screen.findByRole("button", { name: "Eliminar definitivamente Hamburguesa Hawaiana" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
  await waitFor(() => expect(api.deleteArchivedEntry).toHaveBeenCalledWith("entry-1"));
});

test("keeps activation unavailable until Back validates active offers", async () => {
  const api = repository();
  api.listEntries.mockResolvedValue({
    data: [{ ...entries[0], status: "INACTIVE" }],
    meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
  });
  renderPage(api);
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  expect(screen.getByRole("button", { name: "Activar Hamburguesa Hawaiana" })).toBeDisabled();
  expect(screen.getByText("Activación pendiente de validación de ofertas en Back.")).toBeVisible();
  expect(api.setEntryStatus).not.toHaveBeenCalled();
});

test("keeps the entries visible when a status update fails", async () => {
  const api = repository();
  api.setEntryStatus.mockRejectedValue(new Error("Conflict"));
  renderPage(api);
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  fireEvent.click(screen.getByRole("button", { name: "Inactivar Hamburguesa Hawaiana" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cambiar el estado");
  expect(screen.getByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();
});

test("keeps the entry list usable if the category filter fails to load", async () => {
  const api = repository();
  api.listCategories.mockRejectedValue(new Error("Network"));
  renderPage(api);

  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las categorías");
  expect(await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
});
