import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import type { MenuOffer, MenuOfferDetail, MenuRepository, Page } from "../../application/catalog";
import { OffersPage } from "./OffersPage";

const offer: MenuOffer = {
  id: "offer-1", entryId: "entry-1", entryName: "Hamburguesa Hawaiana", presentationTag: "Individual",
  basePrice: 180, status: "ACTIVE", image: { id: "image-1", url: "https://images.example/offer.jpg" }, slotCount: 2,
};
const inactive: MenuOffer = { ...offer, id: "offer-2", presentationTag: "Combo", status: "INACTIVE", slotCount: 1 };
const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE" as const, categoryIds: [] };

function makeRepository(items = [offer, inactive]): jest.Mocked<Pick<MenuRepository, "getEntry" | "listOffers" | "getOffer" | "setOfferStatus" | "deleteInactiveOffer">> {
  return {
    getEntry: jest.fn().mockResolvedValue(entry),
    listOffers: jest.fn().mockResolvedValue({ data: items, meta: { page: 1, pageSize: 12, total: items.length, totalPages: 1 } }),
    getOffer: jest.fn().mockImplementation((id: string) => Promise.resolve({
      data: {
        id,
        entryId: "entry-1",
        presentationTag: id === "offer-1" ? "Individual" : "Combo",
        basePrice: 180,
        status: id === "offer-1" ? "ACTIVE" : "INACTIVE",
        image: null,
        composition: { slots: [] },
      },
      etag: '"offer-rev-1"',
    })),
    setOfferStatus: jest.fn().mockResolvedValue({
      id: "offer-1",
      entryId: "entry-1",
      presentationTag: "Individual",
      basePrice: 180,
      status: "INACTIVE",
      image: null,
      composition: { slots: [] },
    }),
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
  const updatedOffer: MenuOffer = { ...offer, status: "INACTIVE" };
  repository.listOffers
    .mockResolvedValueOnce({ data: [offer, inactive], meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 } })
    .mockResolvedValueOnce({ data: [updatedOffer, inactive], meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 } });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" }));
  await waitFor(() =>
    expect(repository.setOfferStatus).toHaveBeenCalledWith(
      "offer-1",
      { presentationTag: "Individual", status: "INACTIVE" },
      '"offer-rev-1"',
      expect.any(String),
    ),
  );
  // O29: mock changes list and tests assert final card state and DOM
  const updatedBtn = await screen.findByRole("button", { name: "Cambiar estado de oferta Individual: Inactiva" });
  expect(updatedBtn).toHaveClass("offer-card__status-control--inactive");
  expect(updatedBtn).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText("Oferta inactivada.")).toBeVisible();
  await waitFor(() => expect(repository.listOffers).toHaveBeenCalledTimes(2));
  expect(repository.getEntry).toHaveBeenCalledTimes(1);
});

test("retrying a failed status change uses exact same draft, etag, and key without another getOffer query", async () => {
  const repository = makeRepository();
  repository.setOfferStatus.mockRejectedValueOnce({ code: "ERR_NETWORK" });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  const button = screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" });
  fireEvent.click(button);

  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
  expect(repository.getOffer).toHaveBeenCalledTimes(1);
  expect(repository.setOfferStatus).toHaveBeenCalledTimes(1);
  const firstCall = repository.setOfferStatus.mock.calls[0];

  // Click again to retry the same mutation
  fireEvent.click(button);
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(2));
  const secondCall = repository.setOfferStatus.mock.calls[1];

  expect(repository.getOffer).toHaveBeenCalledTimes(1); // NO second getOffer!
  expect(secondCall[0]).toBe(firstCall[0]); // same offerId
  expect(secondCall[1]).toEqual(firstCall[1]); // same draft
  expect(secondCall[2]).toBe(firstCall[2]); // same etag
  expect(secondCall[3]).toBe(firstCall[3]); // same idempotencyKey
});

test("handles status PATCH 409 IDEMPOTENCY_IN_PROGRESS and KEY_REUSED with distinct recoveries", async () => {
  const repository = makeRepository();
  repository.setOfferStatus.mockRejectedValueOnce({
    response: {
      status: 409,
      data: {
        error: {
          message: "La solicitud sigue en proceso.",
          details: { code: "IDEMPOTENCY_IN_PROGRESS" },
        },
      },
      headers: { "retry-after": "5" },
    },
  });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Individual" });
  const button = screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" });
  fireEvent.click(button);

  expect(await screen.findByRole("alert")).toHaveTextContent("sigue en proceso");
  expect(screen.getByRole("button", { name: "Reintentar cambio de estado" })).toBeVisible();
  expect(repository.getOffer).toHaveBeenCalledTimes(1);
  expect(repository.setOfferStatus).toHaveBeenCalledTimes(1);
  const firstKey = repository.setOfferStatus.mock.calls[0][3];

  // Retry-After blocks sending until the server's deadline; reaching it never sends automatically.
  expect(screen.getByRole("button", { name: "Reintentar cambio de estado" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar cambio de estado" }));
  expect(repository.setOfferStatus).toHaveBeenCalledTimes(1);
  const clock = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 6000);
  await waitFor(() => expect(screen.getByRole("button", { name: "Reintentar cambio de estado" })).toBeEnabled());
  expect(repository.setOfferStatus).toHaveBeenCalledTimes(1);
  clock.mockRestore();
  // Keep time beyond the deadline while explicitly retrying.
  const retryClock = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 6000);
  fireEvent.click(screen.getByRole("button", { name: "Reintentar cambio de estado" }));
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(2));
  expect(repository.getOffer).toHaveBeenCalledTimes(1); // No new getOffer
  retryClock.mockRestore();
  expect(repository.setOfferStatus.mock.calls[1][3]).toBe(firstKey); // Preserved idempotency key

  // Now simulate KEY_REUSED
  repository.setOfferStatus.mockRejectedValueOnce({
    response: {
      status: 409,
      data: {
        error: {
          message: "La clave de idempotencia ya fue utilizada.",
          details: { code: "IDEMPOTENCY_KEY_REUSED" },
        },
      },
    },
  });
  fireEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent("ya fue utilizada");

  // Next attempt starts fresh with a new key and new getOffer
  fireEvent.click(button);
  await waitFor(() => expect(repository.getOffer).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(4));
  const newKey = repository.setOfferStatus.mock.calls[3][3];
  expect(newKey).not.toBe(firstKey);
});

test("confirms deletion only for an inactive offer", async () => {
  const repository = makeRepository();
  repository.listOffers
    .mockResolvedValueOnce({ data: [offer, inactive], meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 } })
    .mockResolvedValueOnce({ data: [offer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  expect(repository.deleteInactiveOffer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar oferta" }));
  await waitFor(() => expect(repository.deleteInactiveOffer).toHaveBeenCalledWith("offer-2"));
  // O29: mock changes list and test asserts actual removal from DOM
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Combo" })).not.toBeInTheDocument());
  expect(screen.getByText("Oferta eliminada.")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Individual" })).toBeVisible();
  expect(repository.listOffers).toHaveBeenCalledTimes(2);
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
  let finishMutation: ((value: MenuOfferDetail) => void) | undefined;
  repository.setOfferStatus.mockImplementation(() => new Promise((resolve) => { finishMutation = resolve; }));
  renderWithNavigation(repository);
  await screen.findByRole("heading", { name: "Individual" });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" }));
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByText("Página 2 de 2");
  await act(async () => {
    finishMutation?.({ ...offer, presentationTag: offer.presentationTag ?? "", status: "INACTIVE", composition: { slots: [] } });
    await Promise.resolve();
  });
  expect(await screen.findByRole("heading", { name: "Combo" })).toBeVisible();
  expect(screen.queryByText("Oferta inactivada.")).not.toBeInTheDocument();
  expect(repository.listOffers).toHaveBeenCalledTimes(2);
});

test("late completion and finally of mutation A does not unlock or publish to context B", async () => {
  const repository = makeRepository();
  const page1Offer: MenuOffer = { ...offer, id: "offer-p1", presentationTag: "Oferta P1" };
  const page2Offer: MenuOffer = { ...inactive, id: "offer-p2", presentationTag: "Oferta P2", slotCount: 1 };
  let finishMutationA: ((value: MenuOfferDetail) => void) | undefined;
  let finishMutationB: ((value: MenuOfferDetail) => void) | undefined;
  repository.listOffers.mockImplementation(async (_id, page): Promise<Page<MenuOffer>> => page === 1
    ? { data: [page1Offer], meta: { page: 1, pageSize: 12, total: 13, totalPages: 2 } }
    : { data: [page2Offer], meta: { page: 2, pageSize: 12, total: 13, totalPages: 2 } });
  repository.setOfferStatus
    .mockImplementationOnce(() => new Promise((resolve) => { finishMutationA = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { finishMutationB = resolve; }));

  renderWithNavigation(repository);
  await screen.findByRole("heading", { name: "Oferta P1" });

  // Start mutation A on page 1
  fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de oferta Oferta P1: Activa" }));
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(1));

  // Navigate to page 2 (Context B)
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByRole("heading", { name: "Oferta P2" });
  expect(screen.getByText("Página 2 de 2")).toBeVisible();

  // Start mutation B on page 2
  const page2StatusBtn = screen.getByRole("button", { name: "Cambiar estado de oferta Oferta P2: Inactiva" });
  fireEvent.click(page2StatusBtn);
  await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(2));
  // B is now locked/busy
  expect(page2StatusBtn).toBeDisabled();

  // Now resolve mutation A (its promise resolves and its finally executes)
  await act(async () => {
    finishMutationA?.({ ...page1Offer, presentationTag: "Oferta P1", status: "INACTIVE", composition: { slots: [] } });
    await Promise.resolve();
  });

  // O23: B MUST still be locked! A's finally did not clear busyId or locks of B!
  expect(page2StatusBtn).toBeDisabled();
  expect(screen.queryByText("Oferta inactivada.")).not.toBeInTheDocument();

  // Now finish mutation B
  await act(async () => {
    finishMutationB?.({ ...page2Offer, presentationTag: "Oferta P2", status: "ACTIVE", composition: { slots: [] } });
    await Promise.resolve();
  });

  // B finishes and unlocks cleanly
  await waitFor(() => expect(page2StatusBtn).not.toBeDisabled());
  expect(screen.getByText("Oferta activada.")).toBeVisible();
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

test("keeps existing results visible when refreshing offers fails and blocks mutations on retained cards", async () => {
  const repository = makeRepository([offer]);
  repository.listOffers.mockResolvedValueOnce({
    data: [offer],
    meta: { page: 1, pageSize: 12, total: 13, totalPages: 2 },
  });
  renderWithNavigation(repository);
  await screen.findByRole("heading", { name: "Individual" });
  const statusBtn = screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" });
  expect(statusBtn).not.toBeDisabled();

  // Navigate to page 2, but page 2 refresh fails
  repository.listOffers.mockRejectedValueOnce({ isAxiosError: true, code: "ERR_NETWORK" });
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));

  // O22: Previous cards remain visible, but locked against mutations
  expect(await screen.findByRole("alert")).toHaveTextContent("La información anterior se conserva");
  expect(screen.getByRole("heading", { name: "Individual" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Cambiar estado de oferta Individual: Activa" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Eliminar oferta Individual" })).toBeDisabled();

  // O27: Recovery with fresh data unlocks cards
  const page2Offer = { ...inactive, id: "offer-p2", presentationTag: "Combo Página 2" };
  repository.listOffers.mockResolvedValueOnce({
    data: [page2Offer],
    meta: { page: 2, pageSize: 12, total: 13, totalPages: 2 },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reintentar ofertas" }));

  expect(await screen.findByRole("heading", { name: "Combo Página 2" })).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cambiar estado de oferta Combo Página 2: Inactiva" })).not.toBeDisabled();
});

test("distinguishes a missing entry from a network failure", async () => {
  const repository = makeRepository();
  repository.getEntry.mockRejectedValueOnce({ response: { status: 404 } });
  renderPage(repository);
  expect(await screen.findByRole("alert")).toHaveTextContent("La entrada solicitada ya no existe");
  expect(await screen.findByRole("heading", { name: "Individual" })).toBeVisible();
});

test("retains the delete dialog after a failed delete and permits retry via dialog recovery", async () => {
  const repository = makeRepository();
  repository.deleteInactiveOffer.mockRejectedValueOnce({ response: { status: 412 } });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar oferta" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Los datos cambiaron");

  // O26: Single alert inside active dialog, not on inert background
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  // O24: Delete button disabled, "Actualizar lista" button available inside dialog
  expect(within(dialog).getByRole("button", { name: "Eliminar oferta" })).toBeDisabled();
  const reconcileBtn = within(dialog).getByRole("button", { name: "Actualizar lista" });
  expect(reconcileBtn).toBeVisible();

  // Reconcile inside dialog returns updated list where Combo is still present
  repository.listOffers.mockResolvedValueOnce({ data: [offer, inactive], meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 } });
  fireEvent.click(reconcileBtn);
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "Eliminar oferta" })).not.toBeDisabled());

  // User retries delete; this time it succeeds and list is reconciled without Combo
  repository.listOffers.mockResolvedValueOnce({ data: [offer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar oferta" }));
  await waitFor(() => expect(repository.deleteInactiveOffer).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByRole("heading", { name: "Combo" })).not.toBeInTheDocument();
  expect(screen.getByText("Oferta eliminada.")).toBeVisible();
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

test("does not retry a delete automatically after a timeout and offers dialog reconciliation", async () => {
  const repository = makeRepository();
  repository.deleteInactiveOffer.mockRejectedValueOnce({ code: "ECONNABORTED" });
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  fireEvent.click(screen.getByRole("button", { name: "Eliminar oferta Combo" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar oferta" }));

  expect(await within(dialog).findByRole("alert")).toHaveTextContent("agotó el tiempo de espera");
  expect(repository.deleteInactiveOffer).toHaveBeenCalledTimes(1);
  // O24: "Eliminar oferta" disabled after uncertain delete; "Actualizar lista" inside dialog
  expect(within(dialog).getByRole("button", { name: "Eliminar oferta" })).toBeDisabled();
  const reconcileBtn = within(dialog).getByRole("button", { name: "Actualizar lista" });
  expect(reconcileBtn).toBeVisible();

  // Backend actually completed the delete: reconcile returns list without Combo
  repository.listOffers.mockResolvedValueOnce({ data: [offer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } });
  fireEvent.click(reconcileBtn);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByRole("heading", { name: "Combo" })).not.toBeInTheDocument();
  expect(screen.getByText("Oferta eliminada.")).toBeVisible();
});

test("closes delete dialog on Cancel button click without mutating and restores focus", async () => {
  const repository = makeRepository();
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  const trigger = screen.getByRole("button", { name: "Eliminar oferta Combo" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  expect(dialog).toBeInTheDocument();
  const cancelBtn = within(dialog).getByRole("button", { name: "Cancelar" });
  expect(cancelBtn).toHaveFocus();
  fireEvent.click(cancelBtn);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(repository.deleteInactiveOffer).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});

test("closes delete dialog on Escape key without mutating and restores focus", async () => {
  const repository = makeRepository();
  renderPage(repository);
  await screen.findByRole("heading", { name: "Combo" });
  const trigger = screen.getByRole("button", { name: "Eliminar oferta Combo" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Eliminar oferta inactiva" });
  expect(dialog).toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(repository.deleteInactiveOffer).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});
