import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
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
  render(<MemoryRouter initialEntries={[{ pathname: path.split("?")[0], search: path.includes("?") ? `?${path.split("?")[1]}` : "", state }]}><Routes>
    <Route path="/entries/:entryId/offers" element={<OffersPage repository={repository} />} />
  </Routes></MemoryRouter>);
}

function renderWithPage(repository: ReturnType<typeof makeRepository>, page: number) {
  function PageRoute() {
    const navigate = useNavigate();
    return <><button type="button" onClick={() => navigate(`/entries/entry-1/offers?page=${page}`)}>Open page</button><OffersPage repository={repository} /></>;
  }
  render(<MemoryRouter initialEntries={["/entries/entry-1/offers"]}><Routes>
    <Route path="/entries/:entryId/offers" element={<PageRoute />} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Open page" }));
}

function renderWithNavigation(repository: ReturnType<typeof makeRepository>) {
  function PageRoute() {
    const navigate = useNavigate();
    return <><button type="button" onClick={() => navigate("/entries/entry-1/offers?page=2")}>Go to page 2</button><OffersPage repository={repository} /></>;
  }
  render(<MemoryRouter initialEntries={["/entries/entry-1/offers"]}><Routes>
    <Route path="/entries/:entryId/offers" element={<PageRoute />} />
  </Routes></MemoryRouter>);
}

test("matches the offer card mockup with inline status and one footer action", async () => {
  const repository = makeRepository();
  renderPage(repository, "/entries/entry-1/offers", { returnTo: "/?q=hawai&status=ACTIVE" });

  expect(await screen.findByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/?q=hawai&status=ACTIVE");
  expect(screen.getByRole("heading", { name: "Individual" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Combo" })).toBeVisible();
  expect(screen.getAllByText("$ 180")).toHaveLength(2);
  expect(screen.getAllByText(/Grupos de composici/)).toHaveLength(2);
  expect(screen.getByRole("heading", { name: "Individual" }).closest(".offer-card")?.querySelector(".offer-card__composition strong")).toHaveTextContent("2");
  expect(screen.getByText(/solo se publica si la entrada está activa/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Eliminar oferta Individual" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Eliminar oferta Individual" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" })).toHaveClass("offer-card__status-control--active");
  expect(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("link", { name: "Abrir oferta Combo para editar" })).toHaveAttribute("href", "/entries/entry-1/offers/offer-2/edit");
  expect(screen.getByRole("button", { name: "Cambiar estado de oferta Combo: Inactiva" })).toHaveClass("offer-card__status-control--inactive");
  expect(document.querySelectorAll(".offer-card__delete")).toHaveLength(2);
  expect(repository.listOffers).toHaveBeenCalledWith("entry-1", 1, 12, expect.any(AbortSignal));
  expect(repository.getEntry).toHaveBeenCalledTimes(1);
});

test("shows creation from the empty state and keeps V1 navigation safe", async () => {
  renderPage(makeRepository([]), "/entries/entry-1/offers", { returnTo: "//evil.example/path" });
  expect(await screen.findByText("No hay ofertas configuradas.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Crear primera oferta" })).toHaveAttribute("href", "/entries/entry-1/offers/new");
  expect(screen.queryByRole("link", { name: "Nueva oferta" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
});

test("falls back to the catalog for malformed and external return locations", async () => {
  const repository = makeRepository();
  renderPage(repository, "/entries/entry-1/offers", { returnTo: "https://evil.example/path" });
  expect(await screen.findByRole("heading", { name: "Individual" })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
});

test("shows composition groups and keeps delete available in the card footer", async () => {
  renderPage(makeRepository([{ ...inactive, slotCount: 0 }, offer]));
  await screen.findByRole("heading", { name: "Combo" });
  expect(screen.getAllByText(/Grupos de composici/)).toHaveLength(2);
  expect(screen.getByRole("heading", { name: "Combo" }).closest(".offer-card")?.querySelector(".offer-card__composition strong")).toHaveTextContent("0");
  expect(screen.getByText(/Agrega una composición válida/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Eliminar oferta Individual" })).toBeVisible();
});

test("changes offer status from its inline status control and refreshes only offers", async () => {
  const repository = makeRepository();
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" }));
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledWith("offer-1", "INACTIVE"));
  await waitFor(() => expect(repository.listOffers).toHaveBeenCalledTimes(2));
  expect(repository.getEntry).toHaveBeenCalledTimes(1);
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
  expect(repository.getEntry).toHaveBeenCalledTimes(1);
});

test("does not show a previous entry while a different entry is loading", async () => {
  const repository = makeRepository();
  const nextEntry = { ...entry, id: "entry-2", brandName: "Otra entrada" };
  const nextOffer = { ...offer, id: "offer-3", entryId: "entry-2", entryName: "Otra entrada", presentationTag: "Nueva oferta" };
  repository.getEntry.mockImplementation((id) => id === "entry-2"
    ? new Promise((resolve) => setTimeout(() => resolve(nextEntry), 40))
    : Promise.resolve(entry));
  repository.listOffers.mockImplementation((id) => id === "entry-2"
    ? new Promise((resolve) => setTimeout(() => resolve({ data: [nextOffer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } }), 40))
    : Promise.resolve({ data: [offer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } }));
  function PageRoute() {
    const navigate = useNavigate();
    return <><button type="button" onClick={() => navigate("/entries/entry-2/offers")}>Open another entry</button><OffersPage repository={repository} /></>;
  }
  render(<MemoryRouter initialEntries={["/entries/entry-1/offers"]}><Routes>
    <Route path="/entries/:entryId/offers" element={<PageRoute />} />
  </Routes></MemoryRouter>);

  expect(await screen.findByRole("heading", { name: "Individual" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Open another entry" }));

  expect(screen.queryByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Individual" })).not.toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Ofertas de Otra entrada" })).toBeVisible();
  expect(await screen.findByRole("heading", { name: "Nueva oferta" })).toBeVisible();
});

test("labels retained cards with their actual page while the next page loads", async () => {
  const repository = makeRepository([offer]);
  let finishSecondPage: ((result: Page<MenuOffer>) => void) | undefined;
  repository.listOffers.mockImplementation((_id, page) => page === 1
    ? Promise.resolve({ data: [offer], meta: { page: 1, pageSize: 12, total: 13, totalPages: 2 } })
    : new Promise((resolve) => { finishSecondPage = resolve; }));
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(await screen.findByText("Actualizando ofertas…")).toBeVisible();
  expect(screen.getByText("Página 1 de 2")).toBeVisible();
  expect(screen.getByText("Mostrando 1–1 de 13 ofertas")).toBeVisible();
  finishSecondPage?.({ data: [inactive], meta: { page: 2, pageSize: 12, total: 13, totalPages: 2 } });
  expect(await screen.findByRole("heading", { name: "Combo" })).toBeVisible();
  expect(screen.getByText("Página 2 de 2")).toBeVisible();
});

test("ignores a mutation response after the view changes page", async () => {
  const repository = makeRepository();
  repository.listOffers.mockImplementation(async (_id, page): Promise<Page<MenuOffer>> => page === 1
    ? { data: [offer], meta: { page: 1, pageSize: 12, total: 13, totalPages: 2 } }
    : { data: [inactive], meta: { page: 2, pageSize: 12, total: 13, totalPages: 2 } });
  let finishMutation: (() => void) | undefined;
  repository.setOfferStatus.mockImplementation(() => new Promise((resolve) => { finishMutation = resolve; }));
  renderWithNavigation(repository);
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByText("Página 2 de 2");
  finishMutation?.();
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole("heading", { name: "Combo" })).toBeVisible();
  expect(screen.queryByText("Oferta inactivada.")).not.toBeInTheDocument();
  expect(repository.listOffers).toHaveBeenCalledTimes(2);
});

test("reconciles an invalid page using server metadata and does not refetch the entry", async () => {
  const repository = makeRepository([inactive]);
  repository.listOffers.mockImplementation(async (_id, page): Promise<Page<MenuOffer>> => page === 1
    ? { data: [offer], meta: { page, pageSize: 12, total: 1, totalPages: 1 } }
    : { data: [inactive], meta: { page, pageSize: 12, total: 1, totalPages: 1 } });
  renderWithPage(repository, 5);
  await screen.findByRole("heading", { name: "Individual" });
  await waitFor(() => expect(repository.listOffers).toHaveBeenLastCalledWith("entry-1", 1, 12, expect.any(AbortSignal)));
  expect(repository.getEntry).toHaveBeenCalledTimes(1);
});

test("clears an out-of-range page when the server returns no offers", async () => {
  const repository = makeRepository([]);
  repository.listOffers.mockImplementation(async (_id, page): Promise<Page<MenuOffer>> => ({
    data: [], meta: { page, pageSize: 12, total: 0, totalPages: 0 },
  }));
  renderWithPage(repository, 2);
  expect(await screen.findByText("No hay ofertas configuradas.")).toBeVisible();
  await waitFor(() => expect(repository.listOffers).toHaveBeenLastCalledWith("entry-1", 1, 12, expect.any(AbortSignal)));
});

test("reports a specific entry error and retries only that request", async () => {
  const repository = makeRepository();
  repository.getEntry.mockRejectedValueOnce({ isAxiosError: true, code: "ERR_NETWORK" });
  renderPage(repository);
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar entrada" }));
  await screen.findByRole("heading", { name: "Individual" });
  expect(repository.listOffers).toHaveBeenCalledTimes(1);
  expect(repository.getEntry).toHaveBeenCalledTimes(2);
});

test("keeps existing results visible when refreshing offers fails", async () => {
  const repository = makeRepository();
  repository.listOffers.mockRejectedValueOnce({ isAxiosError: true, code: "ERR_NETWORK" });
  renderPage(repository);
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar ofertas" }));
  expect(await screen.findByRole("heading", { name: "Individual" })).toBeVisible();
});

test("distinguishes a missing entry from a network failure", async () => {
  const repository = makeRepository();
  repository.getEntry.mockRejectedValueOnce({ response: { status: 404 } });
  renderPage(repository);
  expect(await screen.findByRole("alert")).toHaveTextContent("La entrada solicitada ya no existe");
  expect(await screen.findByRole("heading", { name: "Individual" })).toBeVisible();
});

test("retains the delete dialog after a failed delete and permits retry", async () => {
  const repository = makeRepository();
  repository.deleteInactiveOffer.mockRejectedValueOnce({ response: { status: 412 } });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar oferta" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Los datos cambiaron");
  expect(screen.getByRole("dialog", { name: "Eliminar oferta inactiva" })).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar oferta" }));
  await waitFor(() => expect(repository.deleteInactiveOffer).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(repository.listOffers).toHaveBeenCalledTimes(2));
});

test("distinguishes mutation success from a failed list refresh", async () => {
  const repository = makeRepository();
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  repository.listOffers.mockRejectedValueOnce({ response: { status: 503 } });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" }));
  expect(await screen.findByText("Oferta inactivada, pero no se pudo actualizar la lista.")).toBeVisible();
  expect(await screen.findByRole("alert")).toHaveTextContent("temporalmente indisponible");
  expect(repository.setOfferStatus).toHaveBeenCalledTimes(1);
});

test("does not retry a mutation automatically after a timeout", async () => {
  const repository = makeRepository();
  repository.deleteInactiveOffer.mockRejectedValueOnce({ code: "ECONNABORTED" });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar oferta" }));
  expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("agotó el tiempo de espera");
  expect(repository.deleteInactiveOffer).toHaveBeenCalledTimes(1);
  expect(repository.listOffers).toHaveBeenCalledTimes(1);
});

test("allows cancel and Escape before a delete request starts", async () => {
  const repository = makeRepository();
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  const trigger = screen.getByRole("button", { name: "Eliminar oferta Combo" });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(repository.deleteInactiveOffer).not.toHaveBeenCalled();
});
