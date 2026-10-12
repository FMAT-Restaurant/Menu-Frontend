import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MenuOffer, MenuRepository, Page } from "../../application/catalog";
import { OffersPage } from "./OffersPage";

const offer: MenuOffer = {
  id: "offer-1", entryId: "entry-1", entryName: "Hamburguesa Hawaiana", presentationTag: "Individual",
  basePrice: 180, status: "ACTIVE", image: { id: "image-1", url: "https://images.example/offer.jpg" }, slotCount: 2,
};
const inactive: MenuOffer = { ...offer, id: "offer-2", presentationTag: "Combo", status: "INACTIVE", slotCount: 1 };
const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE" as const, categoryIds: [] };

function makeRepository(items = [offer, inactive]): jest.Mocked<Pick<MenuRepository, "getEntry" | "listOffers" | "setOfferStatus" | "deleteInactiveOffer">> {
  return {
    getEntry: jest.fn().mockResolvedValue(entry),
    listOffers: jest.fn().mockResolvedValue({ data: items, meta: { page: 1, pageSize: 12, total: items.length, totalPages: 1 } }),
    setOfferStatus: jest.fn().mockResolvedValue(undefined),
    deleteInactiveOffer: jest.fn().mockResolvedValue(undefined),
  };
}

function renderPage(repository: ReturnType<typeof makeRepository>, path = "/entries/entry-1/offers", state?: unknown) {
  render(<MemoryRouter initialEntries={[{ pathname: path, state }]}><Routes>
    <Route path="/entries/:entryId/offers" element={<OffersPage repository={repository} />} />
  </Routes></MemoryRouter>);
}

test("lists offers with identity, price without assumed currency, slots and publication context", async () => {
  const repository = makeRepository();
  renderPage(repository, "/entries/entry-1/offers", { returnTo: "/?q=hawai&status=ACTIVE" });

  expect(await screen.findByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/?q=hawai&status=ACTIVE");
  expect(screen.getByRole("heading", { name: "Individual" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Combo" })).toBeVisible();
  expect(screen.getAllByText("180")).toHaveLength(2);
  expect(screen.getByText("2 slots")).toBeVisible();
  expect(screen.getByText(/solo se publica si la entrada está activa/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Eliminar oferta Individual" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Editar oferta Combo" })).toHaveAttribute("href", "/entries/entry-1/offers/offer-2/edit");
  expect(repository.listOffers).toHaveBeenCalledWith("entry-1", 1, 12, expect.any(AbortSignal));
});

test("shows creation from the empty state and keeps V1 navigation safe", async () => {
  renderPage(makeRepository([]), "/entries/entry-1/offers", { returnTo: "//evil.example/path" });
  expect(await screen.findByText("Esta entrada aún no tiene ofertas.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Crear primera oferta" })).toHaveAttribute("href", "/entries/entry-1/offers/new");
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
});

test("changes offer status and refreshes without changing the entry", async () => {
  const repository = makeRepository();
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Inactivar oferta Individual" }));
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledWith("offer-1", "INACTIVE"));
  await waitFor(() => expect(repository.listOffers).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole("button", { name: "Activar oferta Combo" }));
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledWith("offer-2", "ACTIVE"));
});

test("blocks activation without slots and never offers deletion of an active offer", async () => {
  renderPage(makeRepository([{ ...inactive, slotCount: 0 }, offer]));
  await screen.findByRole("heading", { name: "Combo" });
  expect(screen.getByRole("button", { name: "Activar oferta Combo" })).toBeDisabled();
  expect(screen.getByText(/Agrega una composición válida/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Eliminar oferta Individual" })).not.toBeInTheDocument();
});

test("confirms deletion only for an inactive offer", async () => {
  const repository = makeRepository();
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  expect(repository.deleteInactiveOffer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar oferta" }));
  await waitFor(() => expect(repository.deleteInactiveOffer).toHaveBeenCalledWith("offer-2"));
  await waitFor(() => expect(repository.listOffers).toHaveBeenCalledTimes(2));
});

test("paginates the collection for the current entry", async () => {
  const repository = makeRepository([offer]);
  repository.listOffers.mockImplementation(async (_id, page): Promise<Page<MenuOffer>> => ({
    data: page === 1 ? [offer] : [inactive], meta: { page, pageSize: 12, total: 13, totalPages: 2 },
  }));
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(await screen.findByRole("heading", { name: "Combo" })).toBeVisible();
  expect(repository.listOffers).toHaveBeenLastCalledWith("entry-1", 2, 12, expect.any(AbortSignal));
});

test("reports loading and mutation failures with retry", async () => {
  const repository = makeRepository();
  repository.getEntry.mockRejectedValueOnce(new Error("offline"));
  repository.setOfferStatus.mockRejectedValueOnce(new Error("invalid composition"));
  renderPage(repository);
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Activar oferta Combo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cambiar el estado");
});
