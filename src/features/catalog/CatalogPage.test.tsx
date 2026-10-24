import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

type CatalogRepository = Pick<
  MenuRepository,
  "listEntries" | "listCategories" | "deleteArchivedEntry"
>;

function repository(total = 1): jest.Mocked<CatalogRepository> {
  return {
    listEntries: jest.fn().mockResolvedValue({
      data: total ? entries : [],
      meta: { page: 1, pageSize: 12, total, totalPages: total ? 1 : 0 },
    }),
    listCategories: jest.fn().mockResolvedValue([
      { id: "category-1", name: "Hamburguesas", description: "", entryCount: 1 },
    ]),
    deleteArchivedEntry: jest.fn().mockResolvedValue(undefined),
  };
}

function LocationViewer() {
  const location = useLocation();
  return <div data-testid="catalog-location">{location.pathname + location.search}</div>;
}

function renderPage(api: CatalogRepository, url = "/") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <CatalogPage repository={api} />
              <LocationViewer />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

test("shows administrative identity, classification and navigation without claiming publication", async () => {
  const api = repository();
  renderPage(api);

  expect(await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();
  const card = within(screen.getByRole("article"));
  expect(screen.getByText("Carne, queso y piña")).toBeVisible();
  expect(card.getByText("Hamburguesas")).toBeVisible();
  expect(card.getByText("Ofertas:")).toHaveTextContent("Ofertas: 2");
  expect(card.getAllByText("Activa", { exact: true })).toHaveLength(2);
  expect(screen.queryByText(/publicada/i)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Editar Hamburguesa Hawaiana" })).toHaveAttribute("href", "/entries/entry-1/edit");
  expect(screen.getByRole("link", { name: "Ver ofertas de Hamburguesa Hawaiana" })).toHaveAttribute("href", "/entries/entry-1/offers");
  expect(card.getByRole("button", { name: "Eliminar definitivamente Hamburguesa Hawaiana" })).toBeDisabled();
  expect(card.getAllByRole("button")).toHaveLength(1);
  expect(card.getByText("Ver ofertas", { exact: true })).toBeVisible();
  expect(screen.getByRole("link", { name: "Nueva entrada" })).toHaveAttribute("href", "/entries/new");
  expect(screen.getByRole("link", { name: "Categorías" })).toHaveAttribute("href", "/categories");
  expect(screen.getByRole("link", { name: /Biblioteca de recetas/ })).toHaveAttribute("href", "/recipes");
});

test("encodes special characters in entry ID for both card routes (C09)", async () => {
  const api = repository();
  const specialIdEntry = {
    ...entries[0],
    id: "item/special?query=1#hash and spaces",
    brandName: "Entrada Especial",
  };
  api.listEntries.mockResolvedValueOnce({
    data: [specialIdEntry],
    meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
  });
  renderPage(api);

  expect(await screen.findByRole("heading", { name: "Entrada Especial" })).toBeVisible();
  const expectedId = encodeURIComponent("item/special?query=1#hash and spaces");
  expect(screen.getByRole("link", { name: "Editar Entrada Especial" })).toHaveAttribute("href", `/entries/${expectedId}/edit`);
  expect(screen.getByRole("link", { name: "Ver ofertas de Entrada Especial" })).toHaveAttribute("href", `/entries/${expectedId}/offers`);
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

test("uses the page metadata returned by the server for pagination, renders page 2 card and active state (C10)", async () => {
  const api = repository();
  const entryPage2 = {
    ...entries[0],
    id: "entry-2",
    brandName: "Hamburguesa BBQ",
    description: "Doble carne y salsa BBQ",
  };
  api.listEntries
    .mockResolvedValueOnce({
      data: entries,
      meta: { page: 1, pageSize: 6, total: 13, totalPages: 3 },
    })
    .mockResolvedValueOnce({
      data: [entryPage2],
      meta: { page: 2, pageSize: 6, total: 13, totalPages: 3 },
    });
  renderPage(api, "/?pageSize=6");

  expect(await screen.findByText("Mostrando 1–1 de 13 entradas")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Siguiente página" }));

  await waitFor(() => expect(api.listEntries).toHaveBeenLastCalledWith({ page: 2, pageSize: 6 }, expect.any(AbortSignal)));
  expect(await screen.findByRole("heading", { name: "Hamburguesa BBQ" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Hamburguesa Hawaiana" })).not.toBeInTheDocument();

  // Active page verification
  const page2Button = screen.getByRole("button", { name: "2" });
  expect(page2Button).toHaveAttribute("aria-current", "page");

  // Exact URL verification
  await waitFor(() => {
    const loc = screen.getByTestId("catalog-location").textContent;
    expect(loc).toContain("page=2");
    expect(loc).toContain("pageSize=6");
  });
});

test("shows only edit and delete actions without changing status from the catalog", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  expect(screen.getByRole("link", { name: "Editar Hamburguesa Hawaiana" })).toHaveAttribute("href", "/entries/entry-1/edit");
  expect(screen.getByRole("button", { name: "Eliminar definitivamente Hamburguesa Hawaiana" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: /Archivar|Inactivar|Desarchivar|Activar/ })).not.toBeInTheDocument();
  expect(api.deleteArchivedEntry).not.toHaveBeenCalled();
});

test("confirms deletion only for archived entries", async () => {
  const api = repository();
  api.listEntries.mockResolvedValue({
    data: [{ ...entries[0], status: "ARCHIVED" }],
    meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
  });
  renderPage(api, "/?status=ARCHIVED");
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

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

test("directs status changes to the edit form for inactive entries", async () => {
  const api = repository();
  api.listEntries.mockResolvedValue({
    data: [{ ...entries[0], status: "INACTIVE" }],
    meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
  });
  renderPage(api);
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  expect(screen.getByRole("link", { name: "Editar Hamburguesa Hawaiana" })).toHaveAttribute("href", "/entries/entry-1/edit");
  expect(screen.getByRole("button", { name: "Eliminar definitivamente Hamburguesa Hawaiana" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Activar Hamburguesa Hawaiana" })).not.toBeInTheDocument();
});

test("keeps delete confirmation dialog open with actionable recovery when deletion fails (C06, C11)", async () => {
  const api = repository();
  api.listEntries.mockResolvedValue({ data: [{ ...entries[0], status: "ARCHIVED" }], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } });
  api.deleteArchivedEntry.mockRejectedValue({ response: { status: 412 } });
  renderPage(api);
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente Hamburguesa Hawaiana" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar entrada archivada" });
  expect(dialog).toBeVisible();

  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar eliminación" }));

  // C06 / C11: Message and recovery button must be inside active dialog
  const alert = await within(dialog).findByRole("alert");
  expect(alert).toHaveTextContent("La entrada cambió desde que la abriste");
  expect(within(dialog).getByRole("button", { name: "Actualizar lista" })).toBeVisible();
  // Delete button must be disabled when reconcile is required
  expect(within(dialog).getByRole("button", { name: "Confirmar eliminación" })).toBeDisabled();

  // Cancel closes cleanly
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar eliminación" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();
});

test("keeps the entry list usable if the category filter fails to load", async () => {
  const api = repository();
  api.listCategories.mockRejectedValue(new Error("Network"));
  renderPage(api);

  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las categorías");
  expect(await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar categorías" }));
  await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
});

test("opens V5 with the current V1 search and filters available for return navigation", async () => {
  const api = repository();
  function CategoryDestination() {
    const location = useLocation();
    return <p>{(location.state as { returnTo: string }).returnTo}</p>;
  }
  render(
    <MemoryRouter initialEntries={["/?q=pizza&status=ACTIVE"]}>
      <Routes>
        <Route path="/" element={<CatalogPage repository={api} />} />
        <Route path="/categories" element={<CategoryDestination />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Hamburguesa Hawaiana" });

  fireEvent.click(screen.getByRole("link", { name: "Categorías" }));

  expect(screen.getByText("/?q=pizza&status=ACTIVE")).toBeVisible();
});
