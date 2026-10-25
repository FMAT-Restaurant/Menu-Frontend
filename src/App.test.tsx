import "./shared/dataRouter.test-helper";
import { cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { App } from "./App";
import type {
  MenuEntry,
  MenuEntryDetail,
  MenuOfferDetail,
  MenuRepository,
  Page,
} from "./application/catalog";

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
    uploadImage: unprepared("uploadImage"),
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

describe("App routing and lazy loading (T15)", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  test("StrictMode owns one live router and disposes its history listeners on unmount", async () => {
    window.history.replaceState({}, "", "/router-lifecycle");
    const repository = createRepository();
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const add = window.addEventListener;
    const remove = window.removeEventListener;
    const addSpy = jest.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "popstate" || type === "pagehide") {
        const entries = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
        entries.add(listener); listeners.set(type, entries);
      }
      add.call(window, type, listener, options);
    });
    const removeSpy = jest.spyOn(window, "removeEventListener").mockImplementation((type, listener, options) => {
      listeners.get(type)?.delete(listener);
      remove.call(window, type, listener, options);
    });
    const view = render(<StrictMode><App repository={repository} /></StrictMode>);
    try {
      await screen.findByRole("heading", { name: "Página no encontrada" });
      expect(listeners.get("popstate")?.size).toBe(1);
      expect(listeners.get("pagehide")?.size).toBe(1);
      const registrations = addSpy.mock.calls.filter(([type]) => type === "popstate" || type === "pagehide").length;
      view.rerender(<StrictMode><App repository={repository} /></StrictMode>);
      expect(addSpy.mock.calls.filter(([type]) => type === "popstate" || type === "pagehide")).toHaveLength(registrations);
      view.unmount();
      expect(listeners.get("popstate")?.size).toBe(0);
      expect(listeners.get("pagehide")?.size).toBe(0);
    } finally {
      view.unmount();
      addSpy.mockRestore(); removeSpy.mockRestore();
    }
  });

  test("opens the administrative catalog at the application root", async () => {
    const repository = createRepository({
      listEntries: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      } as Page<MenuEntry>),
      listCategories: jest.fn().mockResolvedValue([]),
    });

    render(<App repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Buscar entradas" })).toBeVisible();
  });

  test("redirects alias /menu to the administrative catalog root", async () => {
    const repository = createRepository({
      listEntries: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      } as Page<MenuEntry>),
      listCategories: jest.fn().mockResolvedValue([]),
    });

    window.history.pushState({}, "", "/menu");
    render(<App repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
    expect(window.location.pathname).toBe("/");
  });

  test("opens recipe library from its V6 route", async () => {
    const repository = createRepository({
      listRecipes: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      }),
      listInventoryItems: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
      }),
    });

    window.history.pushState({}, "", "/recipes");
    render(<App repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Biblioteca de recetas", level: 1 })).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/");
  });

  test("opens category administration from its V5 route", async () => {
    const repository = createRepository({
      listCategories: jest.fn().mockResolvedValue([]),
    });

    window.history.pushState({}, "", "/categories");
    render(<App repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Catálogo de categorías", level: 1 })).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/");
  });

  test("opens the offers page for an entry", async () => {
    const repository = createRepository({
      getEntry: jest.fn().mockResolvedValue({
        id: "entry-1",
        brandName: "Hamburguesa Hawaiana",
        description: "Con piña",
        status: "ACTIVE",
        categoryIds: [],
      } as MenuEntryDetail),
      listOffers: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      }),
    });

    window.history.pushState({}, "", "/entries/entry-1/offers");
    render(<App repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana", level: 1 })).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
  });

  test("opens the entry form routes for creation and editing", async () => {
    const repository = createRepository({
      listCategories: jest.fn().mockResolvedValue([]),
      getEntry: jest.fn().mockResolvedValue({
        id: "entry-1",
        brandName: "Bowl",
        description: "Con arroz",
        status: "INACTIVE",
        categoryIds: [],
      } as MenuEntryDetail),
    });

    for (const [path, title] of [
      ["/entries/new", "Nueva entrada"],
      ["/entries/entry-1/edit", "Editar entrada"],
    ]) {
      window.history.pushState({}, "", path);
      const { unmount } = render(<App repository={repository} />);
      expect(await screen.findByRole("heading", { name: title, level: 1 })).toBeVisible();
      await screen.findByRole("button", { name: "Cancelar" });
      unmount();
    }
  });

  test("opens offer edit form and respects contextual returnTo link", async () => {
    const returnTo = "/entries/entry-1/offers?page=3";
    const repository = createRepository({
      getEntry: jest.fn().mockResolvedValue({
        id: "entry-1",
        brandName: "Hamburguesa Gourmet",
        description: "Carne angus",
        status: "ACTIVE",
        categoryIds: [],
      } as MenuEntryDetail),
      getOffer: jest.fn().mockResolvedValue({
        data: {
          id: "offer-1",
          entryId: "entry-1",
          presentationTag: "Individual",
          basePrice: 150,
          status: "ACTIVE",
          image: null,
          composition: { slots: [] },
        } as MenuOfferDetail,
        etag: '"offer-rev-1"',
      }),
      listRecipes: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      }),
      listInventoryItems: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
      }),
    });

    window.history.pushState(
      { usr: { returnTo }, key: "return-context", idx: 1 },
      "",
      "/entries/entry-1/offers/offer-1/edit",
    );
    render(<App repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Editar oferta", level: 1 })).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver a ofertas/ })).toHaveAttribute("href", returnTo);
  });

  test("displays not found page with explanation and link to catalog for unknown routes (R01)", async () => {
    const repository = createRepository();

    window.history.pushState({}, "", "/ruta-completamente-desconocida/404");
    render(<App repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Página no encontrada", level: 1 })).toBeVisible();
    expect(
      screen.getByText(/La ruta solicitada no existe o fue movida. Verifica la dirección o regresa al catálogo de entradas./),
    ).toBeVisible();
    const returnLink = screen.getByRole("link", { name: "Volver al catálogo" });
    expect(returnLink).toBeVisible();
    expect(returnLink).toHaveAttribute("href", "/");
  });
});
