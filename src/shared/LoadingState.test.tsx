import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { LoadingState } from "./LoadingState";
import { CategoryPage, type CategoryRepository } from "../features/categories/CategoryPage";
import { RecipeSelector, emptyRecipeSelection } from "../features/recipes/RecipeSelector";
import type { Page, RecipeSummary } from "../application/catalog";
import { RecipePage, type RecipeRepository } from "../features/recipes/RecipePage";
import { RecipeFormDialog } from "../features/recipes/RecipeFormDialog";
import { EntryCategorySelector } from "../features/entries/EntryCategorySelector";
import { addSupply, supplySearch, waitForInventory } from "./recipeSupplies.test-helper";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const recipe = (id: string): RecipeSummary => ({ id, name: id, description: "Receta confirmada", supplies: [] });
const page = (id: string): Page<RecipeSummary> => ({ data: [recipe(id)], meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } });

test.each(["entries", "offers", "category-rows", "recipe-rows", "recipe-selection", "options"] as const)("%s loading has one real status and no interactive fake controls", variant => {
  const view = render(<LoadingState variant={variant} label="Cargando contenido…" />);
  expect(screen.getByRole("status")).toHaveTextContent("Cargando contenido…");
  expect(view.container.querySelector("[aria-hidden=true]")).not.toBeNull();
  expect(view.container.querySelector("button, input, a, [data-route-heading], h1")).toBeNull();
});

test("categories remain available through an update and its failure, then reflect a confirmed empty response", async () => {
  const update = deferred<Awaited<ReturnType<CategoryRepository["listCategories"]>>>();
  const original: CategoryRepository = { listCategories: jest.fn().mockResolvedValue([{ id: "one", name: "Bebidas", description: "", entryCount: 1 }]), getCategory: jest.fn(), createCategory: jest.fn(), updateCategory: jest.fn() };
  const refreshed = { ...original, listCategories: jest.fn().mockReturnValueOnce(update.promise).mockResolvedValueOnce([]) };
  const view = render(<MemoryRouter><CategoryPage repository={original} /></MemoryRouter>);
  await screen.findByRole("heading", { name: "Bebidas" });
  view.rerender(<MemoryRouter><CategoryPage repository={refreshed} /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  expect(screen.getByText("Actualizando categorías…")).toBeVisible();
  await act(async () => update.reject(new Error("offline")));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las categorías.");
  expect(screen.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByText("Aún no hay categorías.");
  expect(screen.queryByRole("heading", { name: "Bebidas" })).not.toBeInTheDocument();
});

test("the recipe selector retains confirmed results, prevents stale assignment, and ignores an older request even if it ignores abort", async () => {
  const older = deferred<Page<RecipeSummary>>();
  const newer = deferred<Page<RecipeSummary>>();
  const select = jest.fn();
  const listRecipes = jest.fn().mockResolvedValueOnce(page("Inicial")).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  const repository = { listRecipes };
  function Selector() {
    const [state, setState] = useState(emptyRecipeSelection);
    return <RecipeSelector repository={repository} state={state} onChange={setState} onSelect={select} onCreate={() => {}} onBack={() => {}} active slotName="Principal" />;
  }
  render(<Selector />);
  await screen.findByRole("article", { name: "Inicial" });
  const search = screen.getByRole("searchbox", { name: "Buscar recetas" });
  fireEvent.change(search, { target: { value: "Anterior" } });
  fireEvent.submit(screen.getByRole("search"));
  expect(screen.getByRole("article", { name: "Inicial" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Asignar" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
  expect(select).not.toHaveBeenCalled();
  fireEvent.change(search, { target: { value: "Vigente" } });
  fireEvent.submit(screen.getByRole("search"));
  await act(async () => newer.resolve(page("Vigente")));
  expect(await screen.findByRole("article", { name: "Vigente" })).toBeVisible();
  await act(async () => older.resolve(page("Anterior")));
  expect(screen.queryByRole("article", { name: "Anterior" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Asignar" })).toBeEnabled();
  await waitFor(() => expect(search).toHaveValue("Vigente"));
});

test("recipe administration keeps the confirmed query and cards when the next query fails", async () => {
  const update = deferred<Page<RecipeSummary>>();
  const repository: RecipeRepository = { listRecipes: jest.fn().mockResolvedValueOnce(page("Inicial")).mockReturnValueOnce(update.promise), getRecipe: jest.fn(), createRecipe: jest.fn(), updateRecipe: jest.fn(), deleteRecipe: jest.fn(), listInventoryItems: jest.fn() };
  render(<MemoryRouter><RecipePage repository={repository} /></MemoryRouter>);
  await screen.findByRole("article", { name: "Inicial" });
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar recetas" }), { target: { value: "Nueva consulta" } });
  fireEvent.submit(screen.getByRole("search"));
  expect(screen.getByRole("article", { name: "Inicial" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Editar Inicial" })).toBeDisabled();
  expect(screen.getByText(/Resultados anteriores: todas las recetas, página 1/)).toBeVisible();
  await act(async () => update.reject(new Error("offline")));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las recetas.");
  expect(screen.getByRole("article", { name: "Inicial" })).toBeVisible();
  expect(screen.queryByText("No hay recetas que coincidan con tu búsqueda.")).not.toBeInTheDocument();
});

test("a failed inventory search keeps added supplies, quantities and recipe edits", async () => {
  type InventoryPage = { data: { id: string; name: string; unit: string }[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
  const failedSearch = deferred<InventoryPage>();
  const rice: InventoryPage = { data: [{ id: "rice", name: "Arroz", unit: "g" }], meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 } };
  const listInventoryItems = jest.fn((query?: { q?: string }) => query?.q === "Otro" ? failedSearch.promise : Promise.resolve(rice));
  const repository = { createRecipe: jest.fn(), updateRecipe: jest.fn(), getRecipe: jest.fn(), listInventoryItems };
  render(<MemoryRouter><RecipeFormDialog repository={repository} onClose={() => {}} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Nombre", { exact: true }), { target: { value: "Receta conservada" } });
  await addSupply("Arroz");
  fireEvent.change(screen.getByLabelText("Cantidad de Arroz"), { target: { value: "25" } });
  await waitForInventory();
  fireEvent.change(supplySearch(), { target: { value: "Otro" } });
  await waitFor(() => expect(listInventoryItems).toHaveBeenLastCalledWith({ q: "Otro" }, expect.any(AbortSignal)));
  expect(screen.getByText("Cargando insumos…")).toBeVisible();
  await act(async () => failedSearch.reject(new Error("offline")));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar");
  expect(screen.queryByText("Cargando insumos…")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("Receta conservada");
  expect(screen.getByLabelText("Cantidad de Arroz")).toHaveValue(25);
  expect(supplySearch()).toHaveValue("Otro");
  expect(repository.createRecipe).not.toHaveBeenCalled();
});

test.each([false, true])("late categories reserve only an open empty panel and preserve existing selections (selected=%s)", selected => {
  const props = { categories: [], selected: selected ? ["assigned"] : [], loading: true, error: "", disabled: false, continuing: false, onChange: jest.fn(), onRetry: jest.fn(), onContinue: jest.fn() };
  const view = render(<EntryCategorySelector {...props} />);
  const trigger = screen.getByRole("button", { name: selected ? "1 categoría seleccionada" : "Seleccionar categorías" });
  expect(trigger).toBeEnabled();
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(view.container.querySelector("[data-loading-state]")).toBeNull();
  fireEvent.click(trigger);
  expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toHaveFocus();
  expect(view.container.querySelector("[data-loading-state]") !== null).toBe(!selected);
  expect(screen.getAllByRole("status")).toHaveLength(1);
  if (selected) expect(screen.getByRole("checkbox")).toBeChecked();
  view.rerender(<EntryCategorySelector {...props} loading={false} categories={[{ id: "assigned", name: "Principales" }]} />);
  expect(view.container.querySelector("[data-loading-state]")).toBeNull();
  expect(screen.getByRole("checkbox", { name: "Principales" })).toHaveProperty("checked", selected);
  expect(props.onChange).not.toHaveBeenCalled();
});
