import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type {
  CatalogViewCategories,
  CatalogViewEntry,
  Page,
} from "../../application/catalog";
import { createDemoRepository } from "../../demo/repository";
import { PermissionProvider } from "../../shared/permissions";
import { permissionToken } from "../../shared/permissions.test-helper";
import { PrintableMenuPage, type PrintableMenuRepository } from "./PrintableMenuPage";
import { buildPrintableMenuSections } from "./printableMenuModel";

const sampleCategories: CatalogViewCategories = {
  data: [
    { id: "cat-postres", name: "Postres", description: "Cierres dulces", entryCount: 1 },
    { id: "cat-bebidas", name: "Bebidas", description: "Frías y calientes", entryCount: 2 },
    { id: "cat-vacia", name: "Ensaladas", description: "Frescas", entryCount: 0 },
    { id: "cat-combos", name: "Especiales", entryCount: 1 },
  ],
  uncategorized: { entryCount: 1 },
};

const sampleEntries: CatalogViewEntry[] = [
  {
    id: "entry-sin-ofertas",
    brandName: "Agua Simple",
    description: "Sin ofertas activas",
    image: null,
    categoryIds: ["cat-bebidas"],
    isAvailable: false,
    offers: [],
  },
  {
    id: "entry-zumo",
    brandName: "Zumo de Naranja",
    description: "Recién exprimido",
    image: { id: "img-zumo", url: "/img/zumo.png", thumbnailUrl: "/img/zumo-t.png" },
    categoryIds: ["cat-bebidas"],
    isAvailable: false,
    offers: [
      {
        id: "off-zumo-jarra",
        presentationTag: "Jarra 1 L",
        basePrice: 95,
        image: { id: "img-jarra", url: "/img/jarra.png", thumbnailUrl: "/img/jarra-t.png" },
        isAvailable: false,
        composition: {
          slots: [
            {
              slotId: "slot-hidden-1",
              name: "Grupo secreto que no va en carta",
              quantity: 1,
              course: "bebida",
              isAvailable: false,
              options: [
                {
                  optionId: "opt-hidden-1",
                  displayName: "Opción interna secreta",
                  isAvailable: false,
                },
              ],
            },
          ],
        },
      },
      {
        id: "off-zumo-copa",
        presentationTag: "Copa 350 ml",
        basePrice: 42,
        image: null,
        isAvailable: true,
        composition: { slots: [] },
      },
    ],
  },
  {
    id: "entry-cafe",
    brandName: "Café de Olla",
    description: "Con canela y piloncillo",
    image: null,
    categoryIds: ["cat-bebidas", "cat-combos"],
    isAvailable: true,
    offers: [
      {
        id: "off-cafe-taza",
        presentationTag: "Taza tradicional",
        basePrice: 35,
        image: null,
        isAvailable: true,
        composition: { slots: [] },
      },
    ],
  },
  {
    id: "entry-flan",
    brandName: "Flan Napolitano",
    description: "Horneado en casa",
    image: null,
    categoryIds: ["cat-postres"],
    isAvailable: true,
    offers: [
      {
        id: "off-flan-rebanada",
        presentationTag: "Rebanada",
        basePrice: 55,
        image: null,
        isAvailable: true,
        composition: { slots: [] },
      },
    ],
  },
  {
    id: "entry-pan",
    brandName: "Pan Artesanal",
    description: "Pieza del día",
    image: null,
    categoryIds: [],
    isAvailable: true,
    offers: [
      {
        id: "off-pan-pieza",
        presentationTag: "Canasta individual",
        basePrice: 28,
        image: null,
        isAvailable: true,
        composition: { slots: [] },
      },
    ],
  },
];

function createMockPrintableRepository(
  entries: CatalogViewEntry[] = sampleEntries,
  categories: CatalogViewCategories = sampleCategories,
): jest.Mocked<PrintableMenuRepository> {
  return {
    getMenuCatalog: jest.fn().mockResolvedValue({
      data: entries,
      meta: { page: 1, pageSize: 100, total: entries.length, totalPages: 1 },
    } satisfies Page<CatalogViewEntry>),
    listMenuCatalogCategories: jest.fn().mockResolvedValue(categories),
  };
}

describe("PrintableMenuPage & printableMenuModel (FE-15)", () => {
  test("denies access without menu:catalog:print and does not query the catalog (RF-CONS-06.CA1)", () => {
    const repository = createMockPrintableRepository();

    render(
      <PermissionProvider token={permissionToken(["menu:catalog:read"])}>
        <MemoryRouter initialEntries={["/carta"]}>
          <PrintableMenuPage repository={repository} />
        </MemoryRouter>
      </PermissionProvider>,
    );

    expect(screen.getByRole("heading", { name: "Sin acceso", level: 1 })).toBeVisible();
    expect(repository.getMenuCatalog).not.toHaveBeenCalled();
    expect(repository.listMenuCatalogCategories).not.toHaveBeenCalled();
  });

  test("renders header metadata, commercial data, omits availability and composition, and organizes by category (RF-CONS-07, RF-CONS-08)", async () => {
    const repository = createMockPrintableRepository();
    const fixedDate = new Date("2026-11-27T18:00:00.000Z");

    render(
      <PermissionProvider token={permissionToken(["menu:catalog:print"])}>
        <MemoryRouter initialEntries={[{ pathname: "/carta", state: { returnTo: "/?page=2" } }]}>
          <PrintableMenuPage repository={repository} now={() => fixedDate} />
        </MemoryRouter>
      </PermissionProvider>,
    );

    // Header (RF-CONS-07.CA6)
    expect(await screen.findByRole("heading", { name: "Carta del menú", level: 1 })).toBeVisible();
    const metaList = screen.getByLabelText("Datos de generación de la carta");
    expect(metaList).toHaveTextContent("FMAT Restaurant");
    expect(metaList).toHaveTextContent("MXN");
    expect(metaList.querySelector("time")).toHaveAttribute("dateTime", fixedDate.toISOString());

    // Back link preserves contextual returnTo
    expect(screen.getByRole("link", { name: /Volver al catálogo/ })).toHaveAttribute(
      "href",
      "/?page=2",
    );

    // Category sections in alphabetical order, omitting empty "Ensaladas", and "Sin categoría" last (RF-CONS-08.CA1, CA2, CA3)
    const sectionHeadingNodes = await screen.findAllByRole("heading", { level: 2 });
    const sectionHeadings = sectionHeadingNodes.map((el) => el.textContent);
    expect(sectionHeadings).toEqual(["Bebidas", "Especiales", "Postres", "Sin categoría"]);
    expect(screen.queryByRole("heading", { name: "Ensaladas" })).not.toBeInTheDocument();

    // Entries without active offers are excluded (RF-CONS-07.CA1)
    expect(screen.queryByRole("heading", { name: "Agua Simple" })).not.toBeInTheDocument();

    // Within "Bebidas", entries are alphabetical: "Café de Olla" then "Zumo de Naranja" (RF-CONS-08.CA4)
    const bebidasSection = screen.getByRole("region", { name: "Bebidas" });
    const bebidasEntryHeadings = within(bebidasSection)
      .getAllByRole("heading", { level: 3 })
      .map((el) => el.textContent);
    expect(bebidasEntryHeadings).toEqual(["Café de Olla", "Zumo de Naranja"]);

    // Multi-category entry ("Café de Olla") appears in both "Bebidas" and "Especiales" (RF-CONS-08.CA5)
    const especialesSection = screen.getByRole("region", { name: "Especiales" });
    expect(within(especialesSection).getByRole("heading", { name: "Café de Olla" })).toBeVisible();

    // Unavailable entry/offer ("Zumo de Naranja" / "Jarra 1 L") IS included without availability labels (RF-CONS-07.CA2)
    expect(screen.queryByText(/No disponible/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Disponible/i)).not.toBeInTheDocument();

    // Entry commercial name, description, image, and offers ordered alphabetically by presentationTag with price and image (RF-CONS-07.CA3, CA4; RF-CONS-08.CA6)
    expect(within(bebidasSection).getByRole("img", { name: "Zumo de Naranja" })).toHaveAttribute(
      "src",
      "/img/zumo.png",
    );
    expect(within(bebidasSection).getByText("Recién exprimido")).toBeVisible();
    const zumoOffersList = within(bebidasSection).getByRole("list", {
      name: "Ofertas de Zumo de Naranja",
    });
    const zumoOfferItems = within(zumoOffersList).getAllByRole("listitem");
    expect(zumoOfferItems[0]).toHaveTextContent("Copa 350 ml");
    expect(zumoOfferItems[0]).toHaveTextContent(/42\.00/);
    expect(zumoOfferItems[1]).toHaveTextContent("Jarra 1 L");
    expect(zumoOfferItems[1]).toHaveTextContent(/95\.00/);
    expect(
      within(zumoOffersList).getByRole("img", { name: "Zumo de Naranja — Jarra 1 L" }),
    ).toHaveAttribute("src", "/img/jarra.png");

    // Composition (slots and options) is never shown (RF-CONS-07.CA5)
    expect(screen.queryByText("Grupo secreto que no va en carta")).not.toBeInTheDocument();
    expect(screen.queryByText("Opción interna secreta")).not.toBeInTheDocument();
  });

  test("triggers window.print, regenerates fresh on demand across multiple catalog pages without mutating data (RF-CONS-06.CA2…CA4)", async () => {
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
    let tick = 0;
    const dates = [
      new Date("2026-11-27T12:00:00.000Z"),
      new Date("2026-11-27T12:00:01.000Z"),
      new Date("2026-11-27T13:30:00.000Z"),
      new Date("2026-11-27T13:30:01.000Z"),
    ];
    const repository: jest.Mocked<PrintableMenuRepository> = {
      getMenuCatalog: jest.fn().mockImplementation(({ page }: { page: number }) =>
        Promise.resolve({
          data: page === 1 ? [sampleEntries[1]] : [sampleEntries[3]],
          meta: { page, pageSize: 100, total: 2, totalPages: 2 },
        }),
      ),
      listMenuCatalogCategories: jest.fn().mockResolvedValue(sampleCategories),
    };

    try {
      render(
        <PermissionProvider token={permissionToken(["menu:catalog:print"])}>
          <MemoryRouter initialEntries={["/carta"]}>
            <PrintableMenuPage
              repository={repository}
              now={() => dates[Math.min(tick++, dates.length - 1)]}
            />
          </MemoryRouter>
        </PermissionProvider>,
      );

      expect(await screen.findByRole("heading", { name: "Zumo de Naranja" })).toBeVisible();
      expect(screen.getByRole("heading", { name: "Flan Napolitano" })).toBeVisible();
      expect(repository.getMenuCatalog).toHaveBeenCalledTimes(2);

      // omits "Sin categoría" when no uncategorized entries exist (RF-CONS-08.CA2)
      expect(screen.queryByRole("heading", { name: "Sin categoría" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Imprimir carta" }));
      expect(printSpy).toHaveBeenCalledTimes(1);

      // Re-generate on demand ("Actualizar carta") fetches fresh state and updates timestamp
      fireEvent.click(screen.getByRole("button", { name: "Actualizar carta" }));
      await waitFor(() => expect(repository.getMenuCatalog).toHaveBeenCalledTimes(4));
      expect(
        screen.getByLabelText("Datos de generación de la carta").querySelector("time"),
      ).toHaveAttribute("dateTime", "2026-11-27T13:30:01.000Z");
    } finally {
      printSpy.mockRestore();
    }
  });

  test("excludes INACTIVE and ARCHIVED entries and INACTIVE offers when backed by DemoRepository (RF-CONS-07.CA1)", async () => {
    const demoRepository = createDemoRepository();

    render(
      <PermissionProvider token={permissionToken(["menu:catalog:print"])}>
        <MemoryRouter initialEntries={["/carta"]}>
          <PrintableMenuPage repository={demoRepository} />
        </MemoryRouter>
      </PermissionProvider>,
    );

    // Active entries with active offers appear (even "Limonada natural" which has isAvailable: false in demo!)
    expect(await screen.findByRole("heading", { name: "Hamburguesa clásica" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Limonada natural" })).toBeVisible();

    // INACTIVE ("Brownie de chocolate") and ARCHIVED ("Especial de temporada") entries do NOT appear
    expect(screen.queryByRole("heading", { name: "Brownie de chocolate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Especial de temporada" })).not.toBeInTheDocument();

    // INACTIVE offer ("Combo con bebida") of active entry does NOT appear, only ACTIVE ("Individual")
    expect(screen.getByText("Individual")).toBeVisible();
    expect(screen.queryByText("Combo con bebida")).not.toBeInTheDocument();
  });

  test("handles transient failure with retry and empty publishable catalog state", async () => {
    const repository: jest.Mocked<PrintableMenuRepository> = {
      getMenuCatalog: jest
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue({
          data: [sampleEntries[0]], // active entry without active offers -> 0 sections
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        }),
      listMenuCatalogCategories: jest.fn().mockResolvedValue(sampleCategories),
    };

    render(
      <PermissionProvider token={permissionToken(["menu:catalog:print"])}>
        <MemoryRouter initialEntries={["/carta"]}>
          <PrintableMenuPage repository={repository} />
        </MemoryRouter>
      </PermissionProvider>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudo generar la carta imprimible.");
    expect(screen.getByRole("button", { name: "Imprimir carta" })).toBeDisabled();

    fireEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("heading", { name: "Carta sin entradas publicables" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Imprimir carta" })).toBeDisabled();
    expect(buildPrintableMenuSections([], sampleCategories)).toEqual([]);
  });
});
