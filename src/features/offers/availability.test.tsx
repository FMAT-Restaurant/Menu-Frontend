import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MenuEntry, MenuOffer, MenuRepository } from "../../application/catalog";
import { PermissionProvider } from "../../shared/permissions";
import { ALL_MENU_PERMISSIONS, permissionToken } from "../../shared/permissions.test-helper";
import { EntryCard } from "../catalog/EntryCard";
import { CatalogConsultationPage } from "../consultation/CatalogConsultationPage";
import { EntryFormPage } from "../entries/EntryFormPage";
import { OfferCard } from "./OfferCard";
import { OfferFormPage } from "./OfferFormPage";
import { OffersPage } from "./OffersPage";
import { SlotCard, type SlotDraft } from "./SlotCard";
import { SlotOptionItem } from "./SlotOptionItem";

describe("Availability and orderability presentation (FE-11)", () => {
  test("SlotOptionItem presents unavailable recipe and inventory options with reasons independently of status (RF-DISP-01.CA1..CA3)", () => {
    const { rerender } = render(
      <SlotOptionItem
        option={{
          optionId: "opt-rec",
          displayName: "Pastel de tres leches",
          status: "ACTIVE",
          isAvailable: false,
          sourceType: "RECIPE",
          recipeId: "rec-1",
          recipeName: "Pastel",
        }}
        optionIndex={0}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleStatus={jest.fn()}
      />,
    );

    const item = screen.getByTestId("slot-option-0");
    expect(item).toHaveClass("slot-option-item--unavailable");
    expect(item).toHaveAttribute("data-option-available", "false");
    expect(screen.getByText("Activa")).toBeVisible();
    expect(screen.getByText("No disponible")).toBeVisible();
    expect(screen.getByText("Receta sin disponibilidad en Inventario.")).toBeVisible();

    rerender(
      <SlotOptionItem
        option={{
          optionId: "opt-inv",
          displayName: "Refresco lata",
          status: "INACTIVE",
          isAvailable: false,
          sourceType: "INVENTORY_ITEM",
          inventoryItemId: "inv-1",
          quantity: 1,
          unit: "pza",
        }}
        optionIndex={0}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleStatus={jest.fn()}
      />,
    );

    expect(screen.getByText("Inactiva")).toBeVisible();
    expect(screen.getByText("No disponible")).toBeVisible();
    expect(screen.getByText("Insumo sin disponibilidad en Inventario.")).toBeVisible();

    rerender(
      <SlotOptionItem
        option={{
          optionId: "opt-inv-ok",
          displayName: "Agua mineral",
          status: "INACTIVE",
          isAvailable: true,
          sourceType: "INVENTORY_ITEM",
          inventoryItemId: "inv-2",
          quantity: 1,
          unit: "pza",
        }}
        optionIndex={0}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleStatus={jest.fn()}
      />,
    );

    expect(screen.getByText("Inactiva")).toBeVisible();
    expect(screen.getByText("Disponible")).toBeVisible();
    expect(screen.queryByText(/sin disponibilidad en Inventario/)).not.toBeInTheDocument();
  });

  test("SlotCard propagates active option availability to the selection group (RF-DISP-02)", () => {
    const baseSlot: SlotDraft = {
      slotId: "slot-1",
      name: "Plato principal",
      quantity: 1,
      course: "plato fuerte",
      isAvailable: true,
      options: [
        { optionId: "opt-1", displayName: "Milanesa", status: "ACTIVE", isAvailable: true, sourceType: "RECIPE", recipeId: "r1" },
        { optionId: "opt-2", displayName: "Pescado", status: "ACTIVE", isAvailable: false, sourceType: "RECIPE", recipeId: "r2" },
      ],
    };

    const { rerender } = render(
      <SlotCard
        slot={baseSlot}
        slotIndex={0}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onAddOption={jest.fn()}
        onEditOption={jest.fn()}
        onDeleteOption={jest.fn()}
        onToggleOptionStatus={jest.fn()}
      />,
    );

    const card = screen.getByTestId("slot-card-0");
    expect(within(card).getAllByText("Disponible")[0]).toBeVisible();
    expect(screen.queryByText(/Grupo no disponible/)).not.toBeInTheDocument();

    // If the only available option becomes INACTIVE, the slot becomes unavailable
    rerender(
      <SlotCard
        slot={{
          ...baseSlot,
          options: [
            { ...baseSlot.options[0], status: "INACTIVE" },
            baseSlot.options[1],
          ],
        }}
        slotIndex={0}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onAddOption={jest.fn()}
        onEditOption={jest.fn()}
        onDeleteOption={jest.fn()}
        onToggleOptionStatus={jest.fn()}
      />,
    );

    expect(card).toHaveClass("slot-card--unavailable");
    expect(screen.getByText("Grupo no disponible: ninguna de sus opciones activas tiene disponibilidad en Inventario.")).toBeVisible();
  });

  test("EntryCard and OfferCard indicate availability and non-orderable reasons (RF-DISP-03, RF-DISP-04, RF-DISP-05)", () => {
    const activeUnavailableEntry: MenuEntry = {
      id: "e-1",
      brandName: "Limonada",
      description: "Natural",
      status: "ACTIVE",
      image: null,
      categories: [],
      offerCount: 1,
      isAvailable: false,
    };
    const activeAvailableOffer: MenuOffer = {
      id: "o-1",
      entryId: "e-1",
      entryName: "Limonada",
      presentationTag: "Vaso",
      basePrice: 45,
      status: "ACTIVE",
      image: null,
      slotCount: 1,
      isAvailable: true,
    };

    const { rerender } = render(
      <MemoryRouter>
        <EntryCard entry={activeUnavailableEntry} busy={false} returnTo="/" onDelete={jest.fn()} />
        <OfferCard
          offer={activeAvailableOffer}
          entryStatus="ARCHIVED"
          entryAvailable={false}
          busy={false}
          returnTo="/offers"
          catalogReturnTo="/"
          onStatusChange={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("No ordenable · Sin ofertas activas disponibles")).toBeVisible();
    expect(screen.getByText("No ordenable · Entrada archivada")).toBeVisible();

    rerender(
      <MemoryRouter>
        <EntryCard entry={{ ...activeUnavailableEntry, isAvailable: true }} busy={false} returnTo="/" onDelete={jest.fn()} />
        <OfferCard
          offer={activeAvailableOffer}
          entryStatus="ACTIVE"
          entryAvailable={true}
          busy={false}
          returnTo="/offers"
          catalogReturnTo="/"
          onStatusChange={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Ordenable")).toHaveLength(2);
  });

  test("OffersPage, EntryFormPage and OfferFormPage surface server availability and propagate option status toggles", async () => {
    const repository = {
      listCategories: jest.fn().mockResolvedValue([]),
      getEntry: jest.fn().mockResolvedValue({
        id: "entry-1",
        brandName: "Hamburguesa",
        description: "Clásica",
        status: "ACTIVE",
        categoryIds: [],
        image: null,
        isAvailable: true,
        etag: '"rev-1-a"',
      }),
      listOffers: jest.fn().mockResolvedValue({
        data: [{
          id: "offer-1",
          entryId: "entry-1",
          entryName: "Hamburguesa",
          presentationTag: "Individual",
          basePrice: 120,
          status: "ACTIVE",
          image: null,
          slotCount: 1,
          isAvailable: false,
        }],
        meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
      }),
      getOffer: jest.fn().mockResolvedValue({
        data: {
          id: "offer-1",
          entryId: "entry-1",
          presentationTag: "Individual",
          basePrice: 120,
          status: "ACTIVE",
          isAvailable: true,
          image: null,
          composition: {
            slots: [{
              slotId: "slot-1",
              name: "Principal",
              quantity: 1,
              course: "plato fuerte",
              isAvailable: true,
              options: [{
                optionId: "opt-1",
                displayName: "Carne",
                status: "ACTIVE",
                isAvailable: true,
                sourceType: "RECIPE",
                recipeId: "rec-1",
              }],
            }],
          },
        },
        etag: '"rev-1-abc"',
      }),
      uploadEntryImage: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      setOfferStatus: jest.fn(),
      deleteInactiveOffer: jest.fn(),
      listRecipes: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } }),
      listInventoryItems: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }),
    } as unknown as MenuRepository;

    const { unmount } = render(
      <PermissionProvider token={permissionToken(ALL_MENU_PERMISSIONS)}>
        <MemoryRouter initialEntries={["/entries/entry-1/offers"]}>
          <Routes>
            <Route path="/entries/:entryId/offers" element={<OffersPage repository={repository} />} />
          </Routes>
        </MemoryRouter>
      </PermissionProvider>,
    );

    expect(await screen.findByText("No ordenable · Sin disponibilidad")).toBeVisible();
    expect(screen.getByText(/Disponibilidad:/)).toBeVisible();
    unmount();

    const editEntryView = render(
      <PermissionProvider token={permissionToken(ALL_MENU_PERMISSIONS)}>
        <MemoryRouter initialEntries={["/entries/entry-1/edit"]}>
          <Routes>
            <Route path="/entries/:entryId/edit" element={<EntryFormPage repository={repository} />} />
          </Routes>
        </MemoryRouter>
      </PermissionProvider>,
    );
    expect(await screen.findByText(/Disponibilidad derivada:/)).toBeVisible();
    editEntryView.unmount();

    render(
      <PermissionProvider token={permissionToken(ALL_MENU_PERMISSIONS)}>
        <MemoryRouter initialEntries={["/entries/entry-1/offers/offer-1/edit"]}>
          <Routes>
            <Route path="/entries/:entryId/offers/:offerId/edit" element={<OfferFormPage repository={repository} />} />
          </Routes>
        </MemoryRouter>
      </PermissionProvider>,
    );

    const summary = await screen.findByLabelText("Disponibilidad derivada de la oferta");
    expect(within(summary).getByText("Disponible")).toBeVisible();
    expect(within(summary).getByText("Ordenable")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de Carne" }));
    expect(within(summary).getByText("No disponible")).toBeVisible();
    expect(within(summary).getByText("No ordenable · Sin disponibilidad")).toBeVisible();
  });

  test("CatalogConsultationPage marks unavailable entries, offers, slots and options disabled and non-orderable", async () => {
    const repository = {
      getMenuCatalog: jest.fn().mockResolvedValue({
        data: [
          {
            id: "e-ok",
            brandName: "Torta Disponible",
            description: "Lista para ordenar",
            image: null,
            categoryIds: ["c-1"],
            isAvailable: true,
            offers: [{
              id: "o-ok",
              presentationTag: "Sencilla",
              basePrice: 75,
              image: null,
              isAvailable: true,
              composition: {
                slots: [{
                  slotId: "s-ok",
                  name: "Relleno",
                  quantity: 1,
                  isAvailable: true,
                  options: [{ optionId: "op-ok", displayName: "Jamón", isAvailable: true }],
                }],
              },
            }],
          },
          {
            id: "e-no",
            brandName: "Limonada Agotada",
            description: "Temporalmente agotada",
            image: null,
            categoryIds: ["c-1"],
            isAvailable: false,
            offers: [{
              id: "o-no",
              presentationTag: "Vaso",
              basePrice: 35,
              image: null,
              isAvailable: false,
              composition: {
                slots: [{
                  slotId: "s-no",
                  name: "Bebida",
                  quantity: 1,
                  isAvailable: false,
                  options: [{ optionId: "op-no", displayName: "Jugo natural", isAvailable: false }],
                }],
              },
            }],
          },
        ],
        meta: { page: 1, pageSize: 24, total: 2, totalPages: 1 },
      }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue({
        data: [{ id: "c-1", name: "Menú del día", entryCount: 2 }],
        uncategorized: { entryCount: 0 },
      }),
    } as unknown as MenuRepository;

    render(
      <PermissionProvider token={permissionToken(["menu:catalog:read"])}>
        <MemoryRouter>
          <CatalogConsultationPage repository={repository} />
        </MemoryRouter>
      </PermissionProvider>,
    );

    const availableCard = (await screen.findByRole("heading", { name: "Torta Disponible" })).closest("article")!;
    const unavailableCard = screen.getByRole("heading", { name: "Limonada Agotada" }).closest("article")!;

    expect(availableCard).not.toHaveAttribute("aria-disabled");
    expect(within(availableCard).getByText("Ordenable")).toBeVisible();

    expect(unavailableCard).toHaveAttribute("aria-disabled", "true");
    expect(within(unavailableCard).getAllByText("No ordenable").length).toBeGreaterThan(0);
    expect(within(unavailableCard).getByText(/Sin existencias en Inventario/)).toBeVisible();
  });
});
