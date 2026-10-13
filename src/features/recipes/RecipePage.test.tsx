import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { InventoryItem, Page, RecipeDetail, RecipeSummary } from "../../application/catalog";
import { RecipePage, type RecipeRepository } from "./RecipePage";

const inventoryItems: InventoryItem[] = [
  { id: "inv-1", name: "Carne Molida Res 80/20", unit: "g" },
  { id: "inv-2", name: "Pan Brioche", unit: "pza" },
  { id: "inv-3", name: "Queso Cheddar", unit: "rebanada" },
];

const recipes: RecipeSummary[] = [
  {
    id: "rec-1",
    name: "Hamburguesa Clásica",
    description: "Carne con queso en pan brioche",
    supplies: [
      { inventoryItemId: "inv-1", quantity: 150, inventoryItem: inventoryItems[0] },
      { inventoryItemId: "inv-2", quantity: 1, inventoryItem: inventoryItems[1] },
    ],
  },
];

const recipeDetail: RecipeDetail = {
  ...recipes[0],
  instructions: "Cocinar la carne en plancha y armar con pan y queso.",
};

function createMockRepository(): jest.Mocked<RecipeRepository> {
  return {
    listRecipes: jest.fn().mockResolvedValue({
      data: recipes,
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    } as Page<RecipeSummary>),
    getRecipe: jest.fn().mockResolvedValue(recipeDetail),
    createRecipe: jest.fn().mockImplementation((draft) =>
      Promise.resolve({
        id: "rec-created-1",
        ...draft,
        supplies: draft.supplies.map((s: { inventoryItemId: string; quantity: number }) => ({
          ...s,
          inventoryItem: inventoryItems.find((i) => i.id === s.inventoryItemId),
        })),
      })
    ),
    updateRecipe: jest.fn().mockImplementation((id, draft) =>
      Promise.resolve({
        id,
        ...draft,
        supplies: draft.supplies.map((s: { inventoryItemId: string; quantity: number }) => ({
          ...s,
          inventoryItem: inventoryItems.find((i) => i.id === s.inventoryItemId),
        })),
      })
    ),
    deleteRecipe: jest.fn().mockResolvedValue(undefined),
    listInventoryItems: jest.fn().mockResolvedValue({
      data: inventoryItems,
      meta: { page: 1, pageSize: 100, total: inventoryItems.length, totalPages: 1 },
    } as Page<InventoryItem>),
  };
}

describe("RecipePage — V6 Biblioteca de recetas", () => {
  test("renders management mode with C19 header, C23 search, C24 list and C25 recipe cards", async () => {
    const repository = createMockRepository();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Biblioteca de recetas", level: 1 })).toBeVisible();
    expect(screen.getByRole("link", { name: "← Volver al menú" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Buscar recetas" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 })).toBeVisible();
    expect(screen.getByText(/Carne Molida Res 80\/20 \(150 g\)/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Editar Hamburguesa Clásica" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" })).toBeVisible();
  });

  test("renders selection mode with specific C19 header and assign button without edit/delete", async () => {
    const repository = createMockRepository();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <MemoryRouter>
        <RecipePage
          repository={repository}
          mode="selection"
          onSelectRecipe={onSelect}
          onClose={onClose}
        />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Biblioteca de recetas — elegir opción", level: 1 })).toBeVisible();
    const cancelButton = screen.getByRole("button", { name: "✕ Cancelar" });
    expect(cancelButton).toBeVisible();

    expect(await screen.findByRole("button", { name: "Asignar" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Editar Hamburguesa Clásica" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar Hamburguesa Clásica" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
    expect(onSelect).toHaveBeenCalledWith(recipes[0]);

    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  test("opens C26 modal, validates required fields, shows authoritative unit and saves recipe", async () => {
    const repository = createMockRepository();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Biblioteca de recetas", level: 1 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(screen.getByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica el nombre de la receta.");

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Hamburguesa Doble" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Doble carne y queso" } });
    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Asar dos carnes y armar" } });

    const select = screen.getByLabelText("Insumo 1");
    fireEvent.change(select, { target: { value: "inv-1" } });
    expect(screen.getByText("g")).toBeVisible();

    const qtyInput = screen.getByLabelText("Cantidad del insumo 1");
    fireEvent.change(qtyInput, { target: { value: "250" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));

    await waitFor(() => {
      expect(repository.createRecipe).toHaveBeenCalledWith({
        name: "Hamburguesa Doble",
        description: "Doble carne y queso",
        instructions: "Asar dos carnes y armar",
        supplies: [{ inventoryItemId: "inv-1", quantity: 250 }],
      });
    });
  });

  test("edits existing recipe with preloaded instructions and supplies", async () => {
    const repository = createMockRepository();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Editar Hamburguesa Clásica" }));

    expect(await screen.findByRole("heading", { name: "Editar receta", level: 2 })).toBeVisible();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Hamburguesa Clásica");
    expect(screen.getByLabelText("Instrucciones")).toHaveValue("Cocinar la carne en plancha y armar con pan y queso.");

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Hamburguesa Clásica Especial" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(repository.updateRecipe).toHaveBeenCalledWith("rec-1", expect.objectContaining({
        name: "Hamburguesa Clásica Especial",
      }));
    });
  });

  test("handles deletion rejection when recipe has references in active offers (BR-MENU-031 / REQ-MENU-REC-005)", async () => {
    const repository = createMockRepository();
    repository.deleteRecipe.mockRejectedValueOnce(new Error("Referenced in active offer"));

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" }));

    expect(screen.getByRole("heading", { name: "¿Eliminar receta?", level: 2 })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar receta" }));

    expect(await screen.findByText(/No se puede eliminar la receta porque está referenciada por una oferta vigente/)).toBeVisible();
  });

  test("creating a recipe in selection mode saves to library and immediately selects it (REQ-MENU-CONT-001)", async () => {
    const repository = createMockRepository();
    const onSelect = jest.fn();

    render(
      <MemoryRouter>
        <RecipePage
          repository={repository}
          mode="selection"
          onSelectRecipe={onSelect}
        />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Biblioteca de recetas — elegir opción", level: 1 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Receta Rápida" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción rápida" } });
    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Paso único" } });
    fireEvent.change(screen.getByLabelText("Insumo 1"), { target: { value: "inv-2" } });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));

    await waitFor(() => {
      expect(repository.createRecipe).toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
        name: "Receta Rápida",
      }));
    });
  });

  test("shows empty state when no recipes exist and allows opening create form", async () => {
    const repository = createMockRepository();
    repository.listRecipes.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    expect(await screen.findByText("Aún no hay recetas registradas.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Crear receta" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Crear receta" }));
    expect(screen.getByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
  });

  test("filters recipes by submitting search text", async () => {
    const repository = createMockRepository();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    const searchbox = screen.getByRole("searchbox", { name: "Buscar recetas" });
    fireEvent.change(searchbox, { target: { value: "Pollo" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));

    await waitFor(() => {
      expect(repository.listRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ q: "Pollo" }),
        expect.any(AbortSignal)
      );
    });
  });

  test("validates description, instructions, item selection and quantities in C26/C27 modal", async () => {
    const repository = createMockRepository();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Biblioteca de recetas", level: 1 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Receta Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica la descripción de la receta.");

    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Desc Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica las instrucciones de la receta.");

    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Inst Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona un artículo de inventario para cada ingrediente.");

    fireEvent.change(screen.getByLabelText("Insumo 1"), { target: { value: "inv-1" } });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("La cantidad de cada ingrediente debe ser mayor a 0.");
  });

  test("adds and removes supply rows in C27", async () => {
    const repository = createMockRepository();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Biblioteca de recetas", level: 1 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(screen.getAllByRole("row")).toHaveLength(2); // 1 header + 1 row
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar insumo" }));
    expect(screen.getAllByRole("row")).toHaveLength(3); // 1 header + 2 rows

    fireEvent.click(screen.getByLabelText("Eliminar insumo 2"));
    expect(screen.getAllByRole("row")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("cancels recipe deletion when clicking Cancelar in confirmation dialog", async () => {
    const repository = createMockRepository();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" }));

    expect(screen.getByRole("heading", { name: "¿Eliminar receta?", level: 2 })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("heading", { name: "¿Eliminar receta?", level: 2 })).not.toBeInTheDocument();
    expect(repository.deleteRecipe).not.toHaveBeenCalled();
  });

  test("shows error message and allows retry when loading recipes fails", async () => {
    const repository = createMockRepository();
    repository.listRecipes.mockRejectedValueOnce(new Error("Network failure"));

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" />
      </MemoryRouter>
    );

    expect(await screen.findByText("No se pudieron cargar las recetas.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();

    repository.listRecipes.mockResolvedValueOnce({
      data: recipes,
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 })).toBeVisible();
  });
});

