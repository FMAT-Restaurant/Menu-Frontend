import { render, screen } from "@testing-library/react";
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

function renderPage(permissions: string[]) {
  const repository = {
    getMenuCatalog: jest.fn().mockResolvedValue(page),
    listMenuCatalogCategories: jest.fn().mockResolvedValue({ data: [{ id: "cat-1", name: "Tortas", entryCount: 1 }], uncategorized: { entryCount: 0 } }),
  } as unknown as MenuRepository;
  render(<PermissionProvider token={permissionToken(permissions)}><MemoryRouter><CatalogConsultationPage repository={repository} /></MemoryRouter></PermissionProvider>);
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
});
