import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuRepository } from "../../application/catalog";
import { createDemoRepository } from "../../demo/repository";
import { PermissionProvider } from "../../shared/permissions";
import { CatalogConsultationPage } from "./CatalogConsultationPage";

const page = {
  data: [{
    id: "entry-1", brandName: "Torta", description: "Con queso", image: null, categoryIds: ["cat-1"], isAvailable: true,
    offers: [{ id: "offer-1", presentationTag: "Individual", basePrice: 85, image: null, isAvailable: false,
      composition: { slots: [{ slotId: "slot-1", name: "Plato", quantity: 1, course: "plato fuerte" as const, isAvailable: false,
        options: [{ optionId: "option-1", displayName: "Milanesa", isAvailable: false }],
      }] },
    }],
  }],
  meta: { page: 1, pageSize: 24, total: 1, totalPages: 1 },
};

function permissionToken(permissions: readonly string[]) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions })}.signature`;
}

function renderWithRepository(repository: MenuRepository, permissions = ["menu:catalog:read"], initialPath = "/") {
  render(
    <PermissionProvider token={permissionToken(permissions)}>
      <MemoryRouter initialEntries={[initialPath]}>
        <CatalogConsultationPage repository={repository} />
      </MemoryRouter>
    </PermissionProvider>,
  );
  return repository;
}

function renderPage(permissions: string[], initialPath = "/") {
  const repository = {
    getMenuCatalog: jest.fn().mockResolvedValue(page),
    listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [{ id: "cat-1", name: "Tortas", entryCount: 1 }], uncategorized: { entryCount: 0 } }),
  } as unknown as MenuRepository;
  return renderWithRepository(repository, permissions, initialPath);
}

describe("CatalogConsultationPage", () => {
  test("shows category, entry, price and unavailable composition without management controls", async () => {
    const repository = renderPage(["menu:catalog:read"]);

    expect(await screen.findByRole("heading", { name: "Tortas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Torta" })).toBeVisible();
    expect(screen.getByText(/85\.00/)).toBeVisible();
    expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
    expect(screen.getByRole("search")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Editar|Eliminar|Crear/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Editar|Administrar/ })).not.toBeInTheDocument();
    expect(repository.getMenuCatalog).toHaveBeenCalledWith({ page: 1, pageSize: 24 }, expect.any(AbortSignal));
  });

  test("denies access when the catalog permission is missing", () => {
    renderPage([]);

    expect(screen.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
  });

  test("applies the search and category filters and resets pagination", async () => {
    const repository = renderPage(["menu:catalog:read"], "/?page=3");
    const search = screen.getByRole("searchbox", { name: /Buscar en el men/i });
    fireEvent.change(search, { target: { value: "torta" } });
    await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { q: "torta", page: 1, pageSize: 24 }, expect.any(AbortSignal),
    ));
  });

  test("submits SearchField immediately and clears search text with the SearchField clear button", async () => {
    const repository = renderPage(["menu:catalog:read"], "/?page=2");
    await screen.findByRole("heading", { name: "Torta" });

    const search = screen.getByRole("searchbox", { name: "Buscar en el menú" });
    fireEvent.change(search, { target: { value: "  milanesa  " } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));

    await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { q: "milanesa", page: 1, pageSize: 24 }, expect.any(AbortSignal),
    ));
    expect(screen.getByText("1 activo")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Borrar texto de búsqueda" }));
    expect(search).toHaveValue("");
    await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { page: 1, pageSize: 24 }, expect.any(AbortSignal),
    ));
  });

  test("clearing filters before the search debounce fires never restores a stale query", async () => {
    const repository = renderPage(["menu:catalog:read"]);
    await screen.findByRole("heading", { name: "Torta" });

    const search = screen.getByRole("searchbox", { name: "Buscar en el menú" });
    fireEvent.change(search, { target: { value: "temporal" } });

    const clearButton = screen.getByRole("button", { name: "Limpiar filtros" });
    expect(clearButton).toBeEnabled();
    fireEvent.click(clearButton);
    expect(search).toHaveValue("");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(repository.getMenuCatalog).not.toHaveBeenCalledWith(
      expect.objectContaining({ q: "temporal" }),
      expect.any(AbortSignal),
    );
  });

  test("filters entries by visible name and respects active visibility rules (RF-CONS-03.CA1, CA4)", async () => {
    renderWithRepository(createDemoRepository());

    expect(await screen.findByRole("heading", { name: "Hamburguesa clásica" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Limonada natural" })).toBeVisible();

    const search = screen.getByRole("searchbox", { name: "Buscar en el menú" });
    fireEvent.change(search, { target: { value: "Limonada" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Hamburguesa clásica" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Limonada natural" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Bebidas" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Platos fuertes" })).not.toBeInTheDocument();

    // Inactive ("Brownie de chocolate") and archived ("Especial de temporada") entries stay hidden on search (RF-CONS-03.CA4)
    fireEvent.change(search, { target: { value: "Brownie" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByRole("heading", { name: "No hay resultados" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Brownie de chocolate" })).not.toBeInTheDocument();
  });

  test("loads a selected category from the URL and normalizes an invalid page", async () => {
    const repository = renderPage(["menu:catalog:read"], "/?categoryId=cat-1&page=0");
    expect(await screen.findByRole("heading", { name: "Tortas" })).toBeVisible();
    expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { categoryId: "cat-1", page: 1, pageSize: 24 }, expect.any(AbortSignal),
    );
  });

  test("applies a category filter and clears the page parameter", async () => {
    const repository = renderPage(["menu:catalog:read"], "/?page=2");
    const category = await screen.findByRole("combobox", { name: /Categor/i });
    await screen.findByRole("option", { name: /Tortas/ });
    fireEvent.change(category, { target: { value: "cat-1" } });
    await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { categoryId: "cat-1", page: 1, pageSize: 24 }, expect.any(AbortSignal),
    ));
  });

  test("filtering by category renders only that category even for multi-category entries and shows empty state when empty (RF-CONS-03.CA2)", async () => {
    const sharedEntry = {
      ...page.data[0],
      id: "entry-shared",
      brandName: "Combo Especial",
      categoryIds: ["cat-1", "cat-2"],
    };
    const repository = {
      getMenuCatalog: jest.fn().mockImplementation(async (query: { categoryId?: string }) => {
        if (query.categoryId === "cat-empty") {
          return { data: [], meta: { page: 1, pageSize: 24, total: 0, totalPages: 0 } };
        }
        return { data: [sharedEntry], meta: { page: 1, pageSize: 24, total: 1, totalPages: 1 } };
      }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({
        data: [
          { id: "cat-1", name: "Tortas", entryCount: 1 },
          { id: "cat-2", name: "Promociones", entryCount: 1 },
          { id: "cat-empty", name: "Postres", entryCount: 0 },
        ],
        uncategorized: { entryCount: 0 },
      }),
    } as unknown as MenuRepository;

    renderWithRepository(repository);
    expect(await screen.findByRole("heading", { name: "Tortas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Promociones" })).toBeVisible();

    const category = screen.getByRole("combobox", { name: "Categoría" });
    fireEvent.change(category, { target: { value: "cat-1" } });

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Promociones" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Tortas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Combo Especial" })).toBeVisible();

    fireEvent.change(category, { target: { value: "cat-empty" } });
    expect(await screen.findByRole("heading", { name: "No hay resultados" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Ver todo el menú" }));
    expect(await screen.findByRole("heading", { name: "Promociones" })).toBeVisible();
    expect(category).toHaveValue("");
  });

  test("filters uncategorized entries only when selecting Sin categoría (RF-CONS-03.CA2b)", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockResolvedValue({
        data: [{ ...page.data[0], id: "plain", brandName: "Agua", categoryIds: [], offers: [] }],
        meta: { page: 1, pageSize: 24, total: 1, totalPages: 1 },
      }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({
        data: [{ id: "cat-1", name: "Tortas", entryCount: 1 }],
        uncategorized: { entryCount: 1 },
      }),
    } as unknown as MenuRepository;

    renderWithRepository(repository, ["menu:catalog:read"], "/?q=agua&categoryId=__uncategorized__");

    expect(await screen.findByRole("heading", { name: "Sin categoría" })).toBeVisible();
    expect(screen.getByText("2 activos")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Tortas" })).not.toBeInTheDocument();
    expect(repository.getMenuCatalog).toHaveBeenCalledWith(
      { q: "agua", categoryId: "__uncategorized__", page: 1, pageSize: 24 },
      expect.any(AbortSignal),
    );
  });

  test("moves through catalog pages", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockResolvedValue({ ...page, meta: { ...page.meta, totalPages: 3 } }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [{ id: "cat-1", name: "Tortas", entryCount: 1 }], uncategorized: { entryCount: 0 } }),
    } as unknown as MenuRepository;
    renderWithRepository(repository);
    fireEvent.click(await screen.findByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { page: 2, pageSize: 24 }, expect.any(AbortSignal),
    ));
  });

  test("returns to the previous catalog page", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockResolvedValue({ ...page, meta: { ...page.meta, page: 2, totalPages: 3 } }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [{ id: "cat-1", name: "Tortas", entryCount: 1 }], uncategorized: { entryCount: 0 } }),
    } as unknown as MenuRepository;
    renderWithRepository(repository, ["menu:catalog:read"], "/?page=2");
    fireEvent.click(await screen.findByRole("button", { name: "Anterior" }));
    await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { page: 1, pageSize: 24 }, expect.any(AbortSignal),
    ));
  });

  test("shows empty results and recovers after a failed request", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({
        data: [], meta: { page: 1, pageSize: 24, total: 0, totalPages: 0 },
      }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [], uncategorized: { entryCount: 0 } }),
    } as unknown as MenuRepository;
    renderWithRepository(repository);

    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "No hay resultados" })).toBeVisible();
    expect(repository.getMenuCatalog).toHaveBeenCalledTimes(2);
  });

  test("renders uncategorized entries, images and entries without offers", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockResolvedValue({
        data: [{ ...page.data[0], id: "plain", brandName: "Agua", image: { url: "/agua.png" }, categoryIds: [], offers: [] }],
        meta: { page: 1, pageSize: 24, total: 1, totalPages: 1 },
      }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [], uncategorized: { entryCount: 1 } }),
    } as unknown as MenuRepository;
    renderWithRepository(repository);

    expect(await screen.findByRole("heading", { name: "Sin categoría" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Agua" })).toHaveAttribute("src", "/agua.png");
    expect(screen.getByText("Sin ofertas disponibles.")).toBeVisible();
  });
});
