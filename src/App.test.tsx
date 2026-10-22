import { render, screen } from "@testing-library/react";
import { App } from "./App";
import type { MenuRepository } from "./application/catalog";

test("opens the administrative catalog at the application root", async () => {
  render(<App />);

  expect(await screen.findByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
  expect(screen.getByRole("searchbox", { name: "Buscar entradas" })).toBeVisible();
});

test("opens recipe library from its V6 route", async () => {
  window.history.pushState({}, "", "/recipes");
  render(<App />);

  expect(await screen.findByRole("heading", { name: "Biblioteca de recetas", level: 1 })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/");
  window.history.replaceState({}, "", "/");
});


function unprepared(method: keyof MenuRepository) {
  return jest.fn(() => Promise.reject(new Error(`Unprepared MenuRepository.${method} call`)));
}

function createRepository(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    listEntries: unprepared("listEntries"),
    listCategories: unprepared("listCategories"),
    getCategory: unprepared("getCategory"),
    createCategory: unprepared("createCategory"),
    updateCategory: unprepared("updateCategory"),
    setEntryStatus: unprepared("setEntryStatus"),
    deleteArchivedEntry: unprepared("deleteArchivedEntry"),
    getEntry: unprepared("getEntry"),
    uploadEntryImage: unprepared("uploadEntryImage"),
    createEntry: unprepared("createEntry"),
    updateEntry: unprepared("updateEntry"),
    listOffers: unprepared("listOffers"),
    getOffer: unprepared("getOffer"),
    createOffer: unprepared("createOffer"),
    updateOffer: unprepared("updateOffer"),
    setOfferStatus: unprepared("setOfferStatus"),
    deleteInactiveOffer: unprepared("deleteInactiveOffer"),
    listRecipes: unprepared("listRecipes"),
    getRecipe: unprepared("getRecipe"),
    createRecipe: unprepared("createRecipe"),
    updateRecipe: unprepared("updateRecipe"),
    deleteRecipe: unprepared("deleteRecipe"),
    listInventoryItems: unprepared("listInventoryItems"),
    ...overrides,
  };
}

test("opens the implemented offers page for an entry", async () => {
  const repository = createRepository({
    getEntry: jest.fn().mockResolvedValue({
      id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "ACTIVE", categoryIds: [],
    }),
    listOffers: jest.fn().mockResolvedValue({
      data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
    }),
  });
  window.history.pushState({}, "", "/entries/entry-1/offers");
  render(<App repository={repository} />);

  expect(await screen.findByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana", level: 1 })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
  window.history.replaceState({}, "", "/");
});

test("opens the T24 entry form routes", async () => {
  const repository = createRepository({
    listCategories: jest.fn().mockResolvedValue([]),
    getEntry: jest.fn().mockResolvedValue({
      id: "entry-1", brandName: "Bowl", description: "Con arroz", status: "INACTIVE", categoryIds: [],
    }),
  });

  for (const [path, title] of [["/entries/new", "Nueva entrada"], ["/entries/entry-1/edit", "Editar entrada"]]) {
    window.history.pushState({}, "", path);
    const { unmount } = render(<App repository={repository} />);
    expect(await screen.findByRole("heading", { name: title, level: 1 })).toBeVisible();
    await screen.findByRole("button", { name: "Cancelar" });
    unmount();
  }
  window.history.replaceState({}, "", "/");
});

test("returns from the V4 offer placeholder to the originating offer page", () => {
  const returnTo = "/entries/entry-1/offers?page=3";
  window.history.pushState({ usr: { returnTo }, key: "return-context", idx: 1 }, "", "/entries/entry-1/offers/offer-1/edit");
  render(<App />);

  expect(screen.getByRole("link", { name: /Volver a ofertas/ })).toHaveAttribute("href", returnTo);
  window.history.replaceState({}, "", "/");
});

test("opens category administration from its V5 route", () => {
  window.history.pushState({}, "", "/categories");
  render(<App />);

  expect(screen.getByRole("heading", { name: "Catálogo de categorías", level: 1 })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/");
  window.history.replaceState({}, "", "/");
});
