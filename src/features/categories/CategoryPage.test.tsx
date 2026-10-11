import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuRepository } from "../../application/catalog";
import { CategoryPage } from "./CategoryPage";

type CategoryRepository = Pick<MenuRepository, "listCategories" | "createCategory" | "updateCategory">;

const category = { id: "category-1", name: "Bebidas", description: "Frías y preparadas", entryCount: 2, etag: 'W/"categories-4"' };

function repository(items = [category]): jest.Mocked<CategoryRepository> {
  return {
    listCategories: jest.fn().mockResolvedValue(items),
    createCategory: jest.fn().mockResolvedValue(category),
    updateCategory: jest.fn().mockResolvedValue(category),
  };
}

function renderPage(api: CategoryRepository) {
  render(<MemoryRouter><CategoryPage repository={api} /></MemoryRouter>);
}

test("lists category identity and informative counts without deletion", async () => {
  const api = repository();
  renderPage(api);

  expect(await screen.findByRole("heading", { name: "Bebidas" })).toBeVisible();
  expect(screen.getByText("Frías y preparadas")).toBeVisible();
  expect(screen.getByText("2 entradas asociadas")).toBeVisible();
  expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/");
  expect(screen.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
  expect(api.listCategories).toHaveBeenCalledWith(expect.any(AbortSignal));
});

test("returns to the exact V1 query supplied by the catalog", async () => {
  const api = repository([]);
  render(
    <MemoryRouter initialEntries={[{ pathname: "/categories", state: { returnTo: "/?q=postres&status=ACTIVE" } }]}>
      <CategoryPage repository={api} />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/?q=postres&status=ACTIVE");
});

test("empty state opens creation and cancel discards the draft", async () => {
  const api = repository([]);
  renderPage(api);

  expect(await screen.findByText("Aún no hay categorías.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
  const dialog = screen.getByRole("dialog", { name: "Crear categoría" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), { target: { value: "Postres" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(api.createCategory).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
  expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("");
});

test("creates a category with name and description and reloads the list", async () => {
  const api = repository([]);
  renderPage(api);
  await screen.findByText("Aún no hay categorías.");
  fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
  const dialog = screen.getByRole("dialog", { name: "Crear categoría" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), { target: { value: "  Postres  " } });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Descripción" }), { target: { value: "  Opciones dulces  " } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar categoría" }));

  await waitFor(() => expect(api.createCategory).toHaveBeenCalledWith({ name: "Postres", description: "Opciones dulces" }));
  await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Categoría creada.")).toBeVisible();
});

test("edits a category with its list ETag and preserves the existing values until save", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByRole("heading", { name: "Bebidas" });
  fireEvent.click(screen.getByRole("button", { name: "Editar Bebidas" }));
  const dialog = screen.getByRole("dialog", { name: "Editar categoría" });
  expect(within(dialog).getByRole("textbox", { name: "Nombre" })).toHaveValue("Bebidas");
  expect(within(dialog).getByRole("textbox", { name: "Descripción" })).toHaveValue("Frías y preparadas");
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Descripción" }), { target: { value: "Bebidas frías" } });
  expect(screen.getByText("Frías y preparadas")).toBeVisible();
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => expect(api.updateCategory).toHaveBeenCalledWith("category-1", {
    name: "Bebidas", description: "Bebidas frías",
  }, 'W/"categories-4"'));
  expect(await screen.findByText("Categoría actualizada.")).toBeVisible();
});

test("keeps the form and draft open when saving fails", async () => {
  const api = repository();
  api.updateCategory.mockRejectedValue(new Error("Precondition failed"));
  renderPage(api);
  await screen.findByRole("heading", { name: "Bebidas" });
  fireEvent.click(screen.getByRole("button", { name: "Editar Bebidas" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), { target: { value: "Bebidas nuevas" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar la categoría");
  expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Bebidas nuevas");
  expect(screen.getByRole("dialog", { name: "Editar categoría" })).toBeVisible();
});

test("shows a retry action if loading categories fails", async () => {
  const api = repository();
  api.listCategories.mockRejectedValueOnce(new Error("Network"));
  renderPage(api);

  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las categorías");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByRole("heading", { name: "Bebidas" })).toBeVisible();
});

test("rejects a blank category name and closes on the dialog cancel event", async () => {
  const api = repository([]);
  renderPage(api);
  await screen.findByText("Aún no hay categorías.");
  fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
  const dialog = screen.getByRole("dialog", { name: "Crear categoría" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), { target: { value: "   " } });
  fireEvent.submit(dialog.querySelector("form")!);

  expect(screen.getByRole("alert")).toHaveTextContent("Indica el nombre");
  expect(api.createCategory).not.toHaveBeenCalled();
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
