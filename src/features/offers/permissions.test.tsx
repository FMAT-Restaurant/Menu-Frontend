import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MenuRepository } from "../../application/catalog";
import { PermissionProvider } from "../../shared/permissions";
import { permissionToken } from "../../shared/permissions.test-helper";
import { OffersPage } from "./OffersPage";
import { OfferFormPage } from "./OfferFormPage";

const entry = { id: "entry-1", brandName: "Plato", description: "", status: "ACTIVE" as const, categoryIds: [] };
const offers = [{ id: "offer-1", entryId: "entry-1", entryName: "Plato", presentationTag: "Individual", basePrice: 100, status: "ACTIVE" as const, image: null, slotCount: 1 }];
const repository = {
  getEntry: jest.fn().mockResolvedValue(entry),
  listOffers: jest.fn().mockResolvedValue({ data: offers, meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } }),
  getOffer: jest.fn(),
  setOfferStatus: jest.fn(),
  deleteInactiveOffer: jest.fn(),
} as unknown as MenuRepository;

function renderWithPermissions(ui: React.ReactNode, permissions: string[]) {
  return render(<PermissionProvider token={permissionToken(permissions)}>{ui}</PermissionProvider>);
}

function renderOffers(permissions: string[]) {
  return renderWithPermissions(<MemoryRouter initialEntries={["/entries/entry-1/offers"]}><Routes>
    <Route path="/entries/:entryId/offers" element={<OffersPage repository={repository} />} />
  </Routes></MemoryRouter>, permissions);
}

describe("offer permissions", () => {
  beforeEach(() => jest.clearAllMocks());

  test("denies offer listing without read permission and makes no repository calls", async () => {
    renderOffers([]);

    expect(screen.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
    expect(repository.getEntry).not.toHaveBeenCalled();
    expect(repository.listOffers).not.toHaveBeenCalled();
  });

  test("read-only users see offers without management or status controls", async () => {
    renderOffers(["menu:offers:read"]);

    expect(await screen.findByText("Individual")).toBeVisible();
    expect(screen.queryByRole("link", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cambiar estado de oferta/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Eliminar oferta/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Nueva oferta/ })).not.toBeInTheDocument();
  });

  test("status permission exposes status control while write actions remain hidden", async () => {
    renderOffers(["menu:offers:read", "menu:offers:status"]);

    expect(await screen.findByRole("button", { name: "Cambiar estado de oferta Individual: Activa" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Eliminar oferta/ })).not.toBeInTheDocument();
  });

  test("blocks form access without offers:write before fetching entry or offer", () => {
    renderWithPermissions(<MemoryRouter initialEntries={["/entries/entry-1/offers/new"]}><Routes>
      <Route path="/entries/:entryId/offers/new" element={<OfferFormPage repository={repository} />} />
    </Routes></MemoryRouter>, ["menu:offers:read"]);

    expect(screen.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
    expect(repository.getEntry).not.toHaveBeenCalled();
    expect(repository.getOffer).not.toHaveBeenCalled();
  });
});
