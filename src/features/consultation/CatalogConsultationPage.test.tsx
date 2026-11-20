import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuRepository } from "../../application/catalog";
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

function renderPage(permissions: string[], initialPath = "/") {
  const repository = {
    getMenuCatalog: jest.fn().mockResolvedValue(page),
    listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [{ id: "cat-1", name: "Tortas", entryCount: 1 }], uncategorized: { entryCount: 0 } }),
  } as unknown as MenuRepository;
  render(<PermissionProvider token={permissionToken(permissions)}><MemoryRouter initialEntries={[initialPath]}><CatalogConsultationPage repository={repository} /></MemoryRouter></PermissionProvider>);
  return repository;
}

describe("CatalogConsultationPage", () => {
  test("shows category, entry, price and unavailable composition without management controls", async () => {
    const repository = renderPage(["menu:catalog:read"]);

    expect(await screen.findByRole("heading", { name: "Tortas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Torta" })).toBeVisible();
    expect(screen.getByText(/85\.00/)).toBeVisible();
    expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
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

  test("loads a selected category from the URL and normalizes an invalid page", async () => {
    const repository = renderPage(["menu:catalog:read"], "/?categoryId=cat-1&page=0");
    expect(await screen.findByRole("heading", { name: "Tortas" })).toBeVisible();
    expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { categoryId: "cat-1", page: 1, pageSize: 24 }, expect.any(AbortSignal),
    );
  });

  test("moves through catalog pages", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockResolvedValue({ ...page, meta: { ...page.meta, totalPages: 3 } }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [{ id: "cat-1", name: "Tortas", entryCount: 1 }], uncategorized: { entryCount: 0 } }),
    } as unknown as MenuRepository;
    render(<PermissionProvider token={permissionToken(["menu:catalog:read"])}><MemoryRouter><CatalogConsultationPage repository={repository} /></MemoryRouter></PermissionProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenLastCalledWith(
      { page: 2, pageSize: 24 }, expect.any(AbortSignal),
    ));
  });

  test("shows empty results and recovers after a failed request", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({
        data: [], meta: { page: 1, pageSize: 24, total: 0, totalPages: 0 },
      }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [], uncategorized: { entryCount: 0 } }),
    } as unknown as MenuRepository;
    render(<PermissionProvider token={permissionToken(["menu:catalog:read"])}><MemoryRouter><CatalogConsultationPage repository={repository} /></MemoryRouter></PermissionProvider>);

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
    render(<PermissionProvider token={permissionToken(["menu:catalog:read"])}><MemoryRouter><CatalogConsultationPage repository={repository} /></MemoryRouter></PermissionProvider>);

    expect(await screen.findByRole("heading", { name: "Sin categoría" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Agua" })).toHaveAttribute("src", "/agua.png");
    expect(screen.getByText("Sin ofertas disponibles.")).toBeVisible();
  });
});
