import { render, screen } from "@testing-library/react";
import { App } from "./App";

test("opens the administrative catalog at the application root", async () => {
  render(<App />);

  expect(await screen.findByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
  expect(screen.getByRole("searchbox", { name: "Buscar entradas" })).toBeVisible();
});

test.each([
  ["/entries/new", "Nueva entrada"],
  ["/entries/entry-1/edit", "Editar entrada"],
  ["/entries/entry-1/offers", "Ofertas de entrada"],
  ["/categories", "Categorías"],
  ["/recipes", "Biblioteca de recetas"],
])("opens the destination %s for its later task", (path, title) => {
  window.history.pushState({}, "", path);
  render(<App />);

  expect(screen.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
  window.history.replaceState({}, "", "/");
});
