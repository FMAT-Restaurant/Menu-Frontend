import { render, screen } from "@testing-library/react";
import { App } from "./App";

test("opens the administrative catalog at the application root", async () => {
  render(<App />);

  expect(await screen.findByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
  expect(screen.getByRole("searchbox", { name: "Buscar entradas" })).toBeVisible();
});

test.each([
  ["/recipes", "Biblioteca de recetas"],
])("opens the destination %s for its later task", (path, title) => {
  window.history.pushState({}, "", path);
  render(<App />);

  expect(screen.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
  window.history.replaceState({}, "", "/");
});

test("opens the T24 entry form routes", async () => {
  const repository = {
    listEntries: jest.fn(),
    listCategories: jest.fn().mockResolvedValue([]),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    setEntryStatus: jest.fn(),
    deleteArchivedEntry: jest.fn(),
    getEntry: jest.fn().mockResolvedValue({
      id: "entry-1", brandName: "Bowl", description: "Con arroz", status: "INACTIVE", categoryIds: [],
    }),
    createEntry: jest.fn(),
    updateEntry: jest.fn(),
    listOffers: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } }),
    setOfferStatus: jest.fn(),
    deleteInactiveOffer: jest.fn(),
  };

  for (const [path, title] of [["/entries/new", "Nueva entrada"], ["/entries/entry-1/edit", "Editar entrada"]]) {
    window.history.pushState({}, "", path);
    const { unmount } = render(<App repository={repository} />);
    expect(await screen.findByRole("heading", { name: title, level: 1 })).toBeVisible();
    await screen.findByRole("button", { name: "Cancelar" });
    unmount();
  }
  window.history.replaceState({}, "", "/");
});

test("opens category administration from its V5 route", () => {
  window.history.pushState({}, "", "/categories");
  render(<App />);

  expect(screen.getByRole("heading", { name: "Catálogo de categorías", level: 1 })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/");
  window.history.replaceState({}, "", "/");
});
