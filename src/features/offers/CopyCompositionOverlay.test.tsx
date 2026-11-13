import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { MenuOffer, MenuOfferDetail, Page, VersionedResource } from "../../application/catalog";
import { CopyCompositionOverlay } from "./CopyCompositionOverlay";

const mockOffers: MenuOffer[] = [
  {
    id: "offer-1",
    entryId: "entry-1",
    entryName: "Hamburguesa Clásica",
    presentationTag: "Individual",
    basePrice: 120,
    status: "ACTIVE",
    image: null,
    slotCount: 2,
  },
  {
    id: "offer-2",
    entryId: "entry-2",
    entryName: "Pizza Suprema",
    presentationTag: "Familiar",
    basePrice: 280,
    status: "ACTIVE",
    image: null,
    slotCount: 1,
  },
  {
    id: "offer-current",
    entryId: "entry-1",
    entryName: "Hamburguesa Clásica",
    presentationTag: "Combo",
    basePrice: 180,
    status: "INACTIVE",
    image: null,
    slotCount: 3,
  },
];

const mockSourceDetail: VersionedResource<MenuOfferDetail> = {
  data: {
    id: "offer-2",
    entryId: "entry-2",
    presentationTag: "Familiar",
    basePrice: 280,
    status: "ACTIVE",
    image: null,
    composition: {
      slots: [
        {
          slotId: "slot-src-1",
          name: "Ingrediente adicional",
          quantity: 2,
          course: "plato fuerte",
          status: "ACTIVE",
          options: [
            {
              optionId: "opt-src-1",
              displayName: "Queso extra",
              status: "ACTIVE",
              sourceType: "INVENTORY_ITEM",
              inventoryItemId: "inv-cheese",
              quantity: 50,
              unit: "g",
            },
            {
              optionId: "opt-src-2",
              displayName: "Salsa BBQ artesanal",
              status: "INACTIVE",
              sourceType: "RECIPE",
              recipeId: "rec-bbq",
            },
          ],
        },
      ],
    },
  },
  etag: '"offer-2-v1"',
};

interface MockOverlayRepository {
  listOffers: jest.Mock;
  getOffer: jest.Mock;
}

function createMockRepository(overrides?: Partial<MockOverlayRepository>): MockOverlayRepository {
  return {
    listOffers: jest.fn().mockImplementation(async (_entryId, _page, _pageSize, _signal, excludeOfferId): Promise<Page<MenuOffer>> => {
      const filtered = mockOffers.filter((o) => o.id !== excludeOfferId);
      return {
        data: filtered,
        meta: { page: 1, pageSize: 100, total: filtered.length, totalPages: 1 },
      };
    }),
    getOffer: jest.fn().mockResolvedValue(mockSourceDetail),
    ...overrides,
  };
}

describe("CopyCompositionOverlay (V8)", () => {
  test("renders C19 header, C28 selection table and C30 offer rows excluding destination offer", async () => {
    const repository = createMockRepository();
    const handleCopy = jest.fn();
    const handleClose = jest.fn();

    render(
      <CopyCompositionOverlay
        repository={repository}
        excludeOfferId="offer-current"
        onCopyComposition={handleCopy}
        onClose={handleClose}
      />
    );

    expect(screen.getByText("Cargando ofertas disponibles…")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Copiar composición desde otra oferta", level: 2 })).toBeVisible();
    expect(screen.getByRole("button", { name: "[ X Cancelar ]" })).toBeVisible();

    const table = await screen.findByRole("table", { name: "Ofertas candidatas para copia" });
    expect(table).toBeVisible();

    expect(screen.getByText("Hamburguesa Clásica")).toBeVisible();
    expect(screen.getByText("Individual")).toBeVisible();
    expect(screen.getByText("$ 120")).toBeVisible();

    expect(screen.getByText("Pizza Suprema")).toBeVisible();
    expect(screen.getByText("Familiar")).toBeVisible();
    expect(screen.getByText("$ 280")).toBeVisible();

    // Destination offer (offer-current with Combo tag) must not appear
    expect(screen.queryByText("Combo")).not.toBeInTheDocument();

    expect(repository.listOffers).toHaveBeenCalledWith(undefined, 1, 100, expect.any(AbortSignal), "offer-current");
  });

  test("renders fallback 'Sin etiqueta' when presentation tag is not provided", async () => {
    const repository = createMockRepository({
      listOffers: jest.fn().mockResolvedValue({
        data: [
          {
            id: "offer-no-tag",
            entryId: "entry-3",
            entryName: "Bebida Refrescante",
            presentationTag: null,
            basePrice: 45,
            status: "ACTIVE",
            image: null,
            slotCount: 1,
          },
        ],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      }),
    });

    render(
      <CopyCompositionOverlay
        repository={repository}
        onCopyComposition={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(await screen.findByText("Bebida Refrescante")).toBeVisible();
    expect(screen.getByText("Sin etiqueta")).toBeVisible();
    expect(screen.getByText("$ 45")).toBeVisible();
  });

  test("renders empty state when catalog has no other candidate offers", async () => {
    const repository = createMockRepository({
      listOffers: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      }),
    });

    render(
      <CopyCompositionOverlay
        repository={repository}
        onCopyComposition={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(await screen.findByRole("heading", { name: "No hay otras ofertas para copiar composición.", level: 3 })).toBeVisible();
    expect(screen.getByText("No se encontraron ofertas en el catálogo disponibles como fuente de copia.")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("renders error feedback and retries when listing offers fails", async () => {
    const repository = createMockRepository({
      listOffers: jest
        .fn()
        .mockRejectedValueOnce(new Error("Network failure"))
        .mockResolvedValueOnce({
          data: [mockOffers[0]],
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        }),
    });

    render(
      <CopyCompositionOverlay
        repository={repository}
        onCopyComposition={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(await screen.findByText("No se pudieron cargar las ofertas.")).toBeVisible();
    const retryBtn = screen.getByRole("button", { name: "Reintentar" });

    fireEvent.click(retryBtn);

    expect(await screen.findByText("Hamburguesa Clásica")).toBeVisible();
    expect(repository.listOffers).toHaveBeenCalledTimes(2);
  });

  test("cancelling closes the overlay without triggering copy", async () => {
    const repository = createMockRepository();
    const handleCopy = jest.fn();
    const handleClose = jest.fn();

    render(
      <CopyCompositionOverlay
        repository={repository}
        onCopyComposition={handleCopy}
        onClose={handleClose}
      />
    );

    await screen.findByText("Pizza Suprema");
    const cancelBtn = screen.getByRole("button", { name: "[ X Cancelar ]" });

    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleCopy).not.toHaveBeenCalled();
  });

  test("clicking copy queries GET /menu/offers/{offerId} and invokes onCopyComposition with retrieved detail", async () => {
    const repository = createMockRepository();
    const handleCopy = jest.fn();
    const handleClose = jest.fn();

    render(
      <CopyCompositionOverlay
        repository={repository}
        excludeOfferId="offer-current"
        onCopyComposition={handleCopy}
        onClose={handleClose}
      />
    );

    await screen.findByText("Pizza Suprema");
    const copyPizzaBtn = screen.getByRole("button", { name: "Copiar composición de Pizza Suprema Familiar" });

    fireEvent.click(copyPizzaBtn);

    await waitFor(() => {
      expect(repository.getOffer).toHaveBeenCalledWith("offer-2");
      expect(handleCopy).toHaveBeenCalledWith(mockSourceDetail.data);
    });
    expect(handleClose).not.toHaveBeenCalled();
  });

  test("displays error feedback and stays open if getOffer fails during copy", async () => {
    const repository = createMockRepository({
      getOffer: jest.fn().mockRejectedValue(new Error("Failed to load offer composition")),
    });
    const handleCopy = jest.fn();
    const handleClose = jest.fn();

    render(
      <CopyCompositionOverlay
        repository={repository}
        onCopyComposition={handleCopy}
        onClose={handleClose}
      />
    );

    await screen.findByText("Pizza Suprema");
    const copyPizzaBtn = screen.getByRole("button", { name: "Copiar composición de Pizza Suprema Familiar" });

    fireEvent.click(copyPizzaBtn);

    expect(await screen.findByText("No se pudo obtener la composición de la oferta seleccionada.")).toBeVisible();
    expect(handleCopy).not.toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();
  });
});
