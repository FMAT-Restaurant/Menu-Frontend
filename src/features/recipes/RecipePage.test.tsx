import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { InventoryItem, Page, RecipeDetail, RecipeSummary } from "../../application/catalog";
import type { PendingOperationStorageAdapter } from "../../application/operationAttempt";
import { RecipePage, type RecipeRepository } from "./RecipePage";
import { RecipeFormDialog } from "./RecipeFormDialog";

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

function createMemoryStorage(): PendingOperationStorageAdapter {
  const map = new Map<string, unknown>();
  return {
    async saveRecord(record) {
      map.set(record.storageKey, record);
    },
    async getRecord(scopeOrKey) {
      const key =
        typeof scopeOrKey === "string"
          ? scopeOrKey
          : `${scopeOrKey.tabId}:${scopeOrKey.formKind}:${scopeOrKey.resourceKey}`;
      return (map.get(key) as never) ?? null;
    },
    async deleteRecord(scopeOrKey) {
      const key =
        typeof scopeOrKey === "string"
          ? scopeOrKey
          : `${scopeOrKey.tabId}:${scopeOrKey.formKind}:${scopeOrKey.resourceKey}`;
      map.delete(key);
    },
    async listByTab(tabId) {
      return Array.from(map.values()).filter(
        (r: unknown) => (r as { scope: { tabId: string } }).scope.tabId === tabId,
      ) as never;
    },
  };
}

function createMockRepository(): jest.Mocked<RecipeRepository> {
  return {
    listRecipes: jest.fn().mockResolvedValue({
      data: recipes,
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    } as Page<RecipeSummary>),
    getRecipe: jest.fn().mockResolvedValue({
      data: recipeDetail,
      etag: '"rec-etag-1"',
    }),
    createRecipe: jest.fn().mockImplementation((draft, _idempotencyKey?: string) => {
      void _idempotencyKey;
      return Promise.resolve({
        id: "rec-created-1",
        ...draft,
        supplies: draft.supplies.map((s: { inventoryItemId: string; quantity: number }) => ({
          ...s,
          inventoryItem: inventoryItems.find((i) => i.id === s.inventoryItemId),
        })),
      });
    }),
    updateRecipe: jest.fn().mockImplementation((id, draft, _etag?: string) => {
      void _etag;
      return Promise.resolve({
        id,
        ...draft,
        supplies: draft.supplies.map((s: { inventoryItemId: string; quantity: number }) => ({
          ...s,
          inventoryItem: inventoryItems.find((i) => i.id === s.inventoryItemId),
        })),
      });
    }),
    deleteRecipe: jest.fn().mockResolvedValue(undefined),
    listInventoryItems: jest.fn().mockResolvedValue({
      data: inventoryItems,
      meta: { page: 1, pageSize: 100, total: inventoryItems.length, totalPages: 1 },
    } as Page<InventoryItem>),
  };
}

describe("UX08 recipe recovery and field validation", () => {
  test("explains a detail loaded without supplies and focuses the recovery action without writing", async () => {
    const repository = createMockRepository();
    repository.getRecipe.mockResolvedValue({ data: { ...recipeDetail, supplies: [] }, etag: '"empty-supplies"' });
    render(<RecipeFormDialog recipe={recipeDetail} repository={repository} storage={createMemoryStorage()} onClose={() => {}} />);
    await waitFor(() => expect(screen.queryByLabelText("Insumo 1")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    const summary = screen.getByRole("alert", { name: "Revisa los campos de la receta" });
    expect(summary).toHaveFocus();
    const add = screen.getByRole("button", { name: "+ Agregar insumo" });
    expect(add).toHaveAccessibleDescription("Agrega al menos un insumo del inventario.");
    fireEvent.click(screen.getByRole("link", { name: "Agrega al menos un insumo del inventario." }));
    expect(add).toHaveFocus();
    expect(repository.createRecipe).not.toHaveBeenCalled();
    expect(repository.updateRecipe).not.toHaveBeenCalled();
    fireEvent.click(add);
    expect(screen.getByLabelText("Insumo 1")).toBeVisible();
    expect(add).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("link", { name: "Agrega al menos un insumo del inventario." })).not.toBeInTheDocument();
  });
  test.each(["management", "selection"] as const)("keeps an unmatched query in %s and restores three recipes by clearing it", async mode => {
    const repository = createMockRepository();
    const library = [recipes[0], { ...recipes[0], id: "rec-2", name: "Sopa" }, { ...recipes[0], id: "rec-3", name: "Ensalada" }];
    repository.listRecipes.mockImplementation(async query => ({ data: query?.q ? [] : library, meta: { page: 1, pageSize: 50, total: query?.q ? 0 : 3, totalPages: 1 } }));
    render(<MemoryRouter><RecipePage repository={repository} mode={mode} storage={createMemoryStorage()} /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Sopa" });
    fireEvent.change(screen.getByLabelText("Buscar recetas"), { target: { value: "sin coincidencias" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));
    await screen.findByRole("heading", { name: "No hay recetas que coincidan con tu búsqueda." });
    expect(screen.getByLabelText("Buscar recetas")).toHaveValue("sin coincidencias");
    expect(screen.queryByText("Aún no hay recetas registradas.")).not.toBeInTheDocument();
    const emptyState = screen.getByRole("heading", { name: "No hay recetas que coincidan con tu búsqueda." }).closest<HTMLElement>(".category-empty");
    expect(emptyState).not.toBeNull();
    fireEvent.click(within(emptyState!).getByRole("button", { name: "Limpiar búsqueda" }));
    expect(await screen.findByRole("heading", { name: "Ensalada" })).toBeVisible();
    expect(screen.getByLabelText("Buscar recetas")).toHaveValue("");
    expect(screen.getByLabelText("Buscar recetas")).toHaveFocus();
    expect(repository.listRecipes).toHaveBeenLastCalledWith({ q: undefined, page: 1, pageSize: 50 }, expect.any(AbortSignal));
  });

  test("associates every invalid field, focuses its summary and links back to controls without writing", async () => {
    const repository = createMockRepository();
    render(<MemoryRouter><RecipePage repository={repository} mode="management" storage={createMemoryStorage()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));
    await screen.findByRole("option", { name: "Carne Molida Res 80/20" });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    const summary = screen.getByRole("alert", { name: "Revisa los campos de la receta" });
    expect(summary).toHaveFocus();
    for (const label of ["Nombre", "Descripción", "Instrucciones", "Insumo 1", "Cantidad del insumo 1"]) {
      const control = screen.getByLabelText(label);
      expect(control).toHaveAttribute("aria-invalid", "true");
      const errorId = control.getAttribute("aria-describedby")!;
      const message = document.getElementById(errorId)!;
      expect(message).toBeVisible();
      expect(message.parentElement).toContainElement(control);
      fireEvent.click(summary.querySelector(`a[href="#${control.id}"]`)!);
      expect(control).toHaveFocus();
    }
    expect(repository.createRecipe).not.toHaveBeenCalled();
    expect(repository.updateRecipe).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Insumo 1"), { target: { value: "inv-1" } });
    expect(screen.getByLabelText("Insumo 1")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("Insumo 1")).not.toHaveAttribute("aria-describedby");
  });
});

describe("RecipePage Component (V6 Integration)", () => {
  test("renders recipe list from repository with supply badges (REQ-MENU-REC-001)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Biblioteca de recetas", level: 1 })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 })).toBeVisible();
    expect(screen.getByText("Carne con queso en pan brioche")).toBeVisible();
    expect(screen.getByText(/Carne Molida Res 80\/20 \(150 g\)/)).toBeVisible();
    expect(screen.getByText(/Pan Brioche \(1 pza\)/)).toBeVisible();
  });

  test("opens create recipe modal and submits new recipe draft with supplies (C26/C27)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();

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
      expect(repository.createRecipe).toHaveBeenCalledWith(
        {
          name: "Hamburguesa Doble",
          description: "Doble carne y queso",
          instructions: "Asar dos carnes y armar",
          supplies: [{ inventoryItemId: "inv-1", quantity: 250 }],
        },
        expect.any(String)
      );
    });
  });

  test("edits existing recipe with preloaded instructions and supplies (P17)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
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
      expect(repository.updateRecipe).toHaveBeenCalledWith(
        "rec-1",
        {
          name: "Hamburguesa Clásica Especial",
          description: recipeDetail.description,
          instructions: recipeDetail.instructions,
          supplies: [
            { inventoryItemId: "inv-1", quantity: 150 },
            { inventoryItemId: "inv-2", quantity: 1 },
          ],
        },
        '"rec-etag-1"'
      );
    });
  });

  test("handles deletion rejection when recipe has contractual reference error and distinguishes from network, permission, and conflict (P11, P16)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    const inUseError = Object.assign(new Error("Referenced in active offer"), {
      response: {
        status: 409,
        data: {
          error: {
            message: "No se puede eliminar la receta porque está referenciada por una oferta vigente.",
            details: { code: "RECIPE_IN_USE", offerIds: ["offer-1"] },
          },
        },
      },
    });
    repository.deleteRecipe.mockRejectedValueOnce(inUseError);

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" }));

    expect(screen.getByRole("heading", { name: "¿Eliminar receta?", level: 2 })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar receta" }));

    expect(
      await screen.findByText(
        "No se puede eliminar la receta porque está referenciada por una oferta vigente."
      )
    ).toBeVisible();

    // 1. 403 Forbidden: does NOT announce "referenciada"
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("heading", { name: "¿Eliminar receta?", level: 2 })).not.toBeInTheDocument();

    const forbiddenError = Object.assign(new Error("Forbidden"), {
      response: {
        status: 403,
        data: {
          error: { message: "No tienes permisos para eliminar esta receta." },
        },
      },
    });
    repository.deleteRecipe.mockRejectedValueOnce(forbiddenError);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar receta" }));

    expect(await screen.findByText("No tienes permisos para eliminar esta receta.")).toBeVisible();
    expect(screen.queryByText(/referenciada por una oferta/)).not.toBeInTheDocument();

    // 2. 412 Conflict: does NOT announce "referenciada"
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    const conflictError = Object.assign(new Error("Precondition Failed"), {
      response: {
        status: 412,
        data: {
          error: { message: "El recurso cambió en el servidor." },
        },
      },
    });
    repository.deleteRecipe.mockRejectedValueOnce(conflictError);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar receta" }));

    expect(await screen.findByText("El recurso cambió en el servidor.")).toBeVisible();
    expect(screen.queryByText(/referenciada por una oferta/)).not.toBeInTheDocument();

    // 3. Network failure / lost response: does NOT announce "referenciada", reloads list
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    repository.deleteRecipe.mockRejectedValueOnce(new Error("Network timeout"));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar receta" }));

    expect(
      await screen.findByText(
        "No se pudo confirmar la eliminación. Se consultó la lista para verificar el estado actual."
      )
    ).toBeVisible();
    expect(screen.queryByText(/referenciada por una oferta/)).not.toBeInTheDocument();
  });

  test("handles selection mode and calls onSelectRecipe when recipe is chosen or created", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    const onSelect = jest.fn();

    render(
      <MemoryRouter>
        <RecipePage
          repository={repository}
          mode="selection"
          onSelectRecipe={onSelect}
          storage={storage}
        />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Biblioteca de recetas — elegir opción", level: 1 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
    await screen.findByRole("option", { name: "Pan Brioche" });

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
    const storage = createMemoryStorage();
    repository.listRecipes.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    expect(await screen.findByText("Aún no hay recetas registradas.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Crear receta" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Crear receta" }));
    expect(screen.getByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
  });

  test("filters recipes by submitting search text and replaces results (P13, P14)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    repository.listRecipes.mockImplementation((query) => {
      if (query?.q === "Pollo") {
        return Promise.resolve({
          data: [
            {
              id: "rec-pollo",
              name: "Pollo Asado",
              description: "Pollo a las brasas",
              supplies: [],
            },
          ],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        });
      }
      return Promise.resolve({
        data: recipes,
        meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
      });
    });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 })).toBeVisible();
    const searchbox = screen.getByRole("searchbox", { name: "Buscar recetas" });
    fireEvent.change(searchbox, { target: { value: "Pollo" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));

    expect(await screen.findByRole("heading", { name: "Pollo Asado", level: 3 })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Hamburguesa Clásica", level: 3 })).not.toBeInTheDocument();

    expect(repository.listRecipes).toHaveBeenLastCalledWith(
      { q: "Pollo", page: 1, pageSize: 50 },
      expect.any(AbortSignal)
    );
  });

  test("validates description, instructions, item selection and quantities with zero repository calls on invalid attempts and exact payload on correction (P15, P05)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Biblioteca de recetas", level: 1 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
    await screen.findByRole("option", { name: "Carne Molida Res 80/20" });

    // P05: fieldset accessible name via legend direct child
    expect(screen.getByRole("group", { name: "Insumos del inventario" })).toBeInTheDocument();

    // 1. Empty name
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica el nombre de la receta.");
    expect(repository.createRecipe).not.toHaveBeenCalled();

    // 2. Empty description
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Receta Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica la descripción de la receta.");
    expect(repository.createRecipe).not.toHaveBeenCalled();

    // 3. Empty instructions
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Desc Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica las instrucciones de la receta.");
    expect(repository.createRecipe).not.toHaveBeenCalled();

    // 4. Missing supply item selection
    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Inst Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona un insumo del inventario en cada fila.");
    expect(repository.createRecipe).not.toHaveBeenCalled();

    // 5. Quantity = 0
    fireEvent.change(screen.getByLabelText("Insumo 1"), { target: { value: "inv-1" } });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("La cantidad de cada insumo debe ser mayor a 0.");
    expect(repository.createRecipe).not.toHaveBeenCalled();

    // 6. Correction to valid quantity -> persists exact payload
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));

    await waitFor(() => {
      expect(repository.createRecipe).toHaveBeenCalledTimes(1);
      expect(repository.createRecipe).toHaveBeenCalledWith(
        {
          name: "Receta Test",
          description: "Desc Test",
          instructions: "Inst Test",
          supplies: [{ inventoryItemId: "inv-1", quantity: 250 }],
        },
        expect.any(String),
      );
    });
  });

  test("adds and removes supply rows in C27", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
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
    const storage = createMemoryStorage();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
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
    const storage = createMemoryStorage();
    repository.listRecipes.mockRejectedValueOnce(new Error("Network failure"));

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
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

  test("renders management actions in management mode and selection actions in selection mode (P01)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    const { rerender } = render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: "Editar Hamburguesa Clásica" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Asignar" })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <RecipePage repository={repository} mode="selection" onSelectRecipe={jest.fn()} storage={storage} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: "Asignar" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Editar Hamburguesa Clásica" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar Hamburguesa Clásica" })).not.toBeInTheDocument();
  });

  test("navigates across recipe pages and reaches recipe 51 (P07)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    const page1Recipes: RecipeSummary[] = Array.from({ length: 50 }, (_, i) => ({
      id: `rec-${i + 1}`,
      name: `Receta ${i + 1}`,
      description: `Descripción ${i + 1}`,
      supplies: [],
    }));
    const page2Recipes: RecipeSummary[] = [
      { id: "rec-51", name: "Receta 51", description: "La receta cincuenta y uno", supplies: [] },
    ];

    repository.listRecipes.mockImplementation((query) => {
      if (query?.page === 2) {
        return Promise.resolve({
          data: page2Recipes,
          meta: { page: 2, pageSize: 50, total: 51, totalPages: 2 },
        });
      }
      return Promise.resolve({
        data: page1Recipes,
        meta: { page: 1, pageSize: 50, total: 51, totalPages: 2 },
      });
    });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Receta 1", level: 3 })).toBeVisible();
    expect(screen.getByText("Página 1 de 2")).toBeVisible();

    const nextButton = screen.getByRole("button", { name: "Siguiente página" });
    fireEvent.click(nextButton);

    expect(await screen.findByRole("heading", { name: "Receta 51", level: 3 })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Receta 1", level: 3 })).not.toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeVisible();
  });

  test("accesses article 101 via inventory pagination and preserves selected items across pages (P07, P03)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    const page1Items: InventoryItem[] = Array.from({ length: 50 }, (_, i) => ({
      id: `inv-item-${i + 1}`,
      name: `Insumo ${i + 1}`,
      unit: "g",
    }));
    const page3Items: InventoryItem[] = [
      { id: "inv-item-101", name: "Insumo 101 Especial", unit: "kg" },
    ];

    repository.listInventoryItems.mockImplementation((query) => {
      if (query?.page === 3) {
        return Promise.resolve({
          data: page3Items,
          meta: { page: 3, pageSize: 50, total: 101, totalPages: 3 },
        });
      }
      return Promise.resolve({
        data: page1Items,
        meta: { page: 1, pageSize: 50, total: 101, totalPages: 3 },
      });
    });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
    expect(await screen.findByText("Página 1 de 3")).toBeVisible();

    // Go to page 3 of inventory
    const nextInvBtn = screen.getByRole("button", { name: "Siguiente página de inventario" });
    fireEvent.click(nextInvBtn); // page 2
    expect(await screen.findByText("Página 2 de 3")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente página de inventario" })); // page 3

    expect(await screen.findByText("Página 3 de 3")).toBeVisible();

    // Select article 101
    const select = screen.getByLabelText("Insumo 1");
    fireEvent.change(select, { target: { value: "inv-item-101" } });
    expect(screen.getByText("kg")).toBeVisible();

    // Now navigate back to page 1 of inventory
    const prevInvBtn = screen.getByRole("button", { name: "Página anterior de inventario" });
    fireEvent.click(prevInvBtn); // page 2
    expect(await screen.findByText("Página 2 de 3")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Página anterior de inventario" })); // page 1

    expect(await screen.findByText("Página 1 de 3")).toBeVisible();
    // Article 101 remains selected and visible in the select even though current page is 1!
    expect(screen.getByLabelText("Insumo 1")).toHaveValue("inv-item-101");
    expect(screen.getByText("kg")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Receta con 101" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Desc" } });
    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Inst" } });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));

    await waitFor(() => {
      expect(repository.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          supplies: [{ inventoryItemId: "inv-item-101", quantity: 5 }],
        }),
        expect.any(String)
      );
    });
  });

  test("displays independent inventory error with retry without resetting recipe draft (P08)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    repository.listInventoryItems
      .mockRejectedValueOnce(new Error("Fallo de red en inventario"))
      .mockResolvedValueOnce({
        data: inventoryItems,
        meta: { page: 1, pageSize: 50, total: inventoryItems.length, totalPages: 1 },
      });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();

    // Type draft before retry
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Borrador Seguro" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción no se borra" } });
    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Pasos intactos" } });

    // Verify inventory error is displayed with retry button
    expect(
      await screen.findByText(/No se pudieron cargar los artículos de inventario\. Fallo de red en inventario/)
    ).toBeVisible();

    // Click retry in inventory section
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    // Once inventory resolves, error disappears and draft is still intact
    await waitFor(() => {
      expect(screen.queryByText(/Fallo de red en inventario/)).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText("Nombre")).toHaveValue("Borrador Seguro");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Descripción no se borra");
    expect(screen.getByLabelText("Instrucciones")).toHaveValue("Pasos intactos");

    // Can now select retrieved item
    fireEvent.change(screen.getByLabelText("Insumo 1"), { target: { value: "inv-1" } });
    expect(screen.getByText("g")).toBeVisible();
  });

  test("does not open recipe summary when getRecipe detail request fails (P09)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    repository.getRecipe.mockRejectedValueOnce(new Error("500 Server Error"));

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Editar Hamburguesa Clásica" }));

    // Does NOT open the edit dialog
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Editar receta", level: 2 })).not.toBeInTheDocument();
    });

    // Displays action error
    expect(screen.getByText("No se pudo cargar el detalle completo de la receta.")).toBeVisible();
  });

  test("cancels stale recipe opening and prevents older request from overwriting active editor (P10)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    let resolveRecipeA: (val: unknown) => void = () => {};
    const slowPromiseA = new Promise((resolve) => {
      resolveRecipeA = resolve;
    });

    const recipeB: RecipeDetail = {
      id: "rec-2",
      name: "Papas Fritas",
      description: "Papas crujientes",
      instructions: "Freír en aceite caliente.",
      supplies: [],
    };

    repository.listRecipes.mockResolvedValue({
      data: [recipes[0], { id: "rec-2", name: "Papas Fritas", description: "Papas crujientes", supplies: [] }],
      meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
    });

    repository.getRecipe.mockImplementation((id: string) => {
      if (id === "rec-1") {
        return slowPromiseA as never;
      }
      if (id === "rec-2") {
        return Promise.resolve({ data: recipeB, etag: '"rec-etag-2"' });
      }
      return Promise.reject(new Error("Unknown recipe"));
    });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    await screen.findByRole("heading", { name: "Papas Fritas", level: 3 });

    // 1. Click edit on Recipe A (Hamburguesa Clásica) -> pending
    fireEvent.click(screen.getByRole("button", { name: "Editar Hamburguesa Clásica" }));

    // 2. Click edit on Recipe B (Papas Fritas) -> resolves immediately
    fireEvent.click(screen.getByRole("button", { name: "Editar Papas Fritas" }));

    // Form opens with Recipe B
    expect(await screen.findByRole("heading", { name: "Editar receta", level: 2 })).toBeVisible();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Papas Fritas");

    // User types modifications into Recipe B
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Papas Fritas Trufadas" } });
    expect(screen.getByLabelText("Nombre")).toHaveValue("Papas Fritas Trufadas");

    // 3. Slow Recipe A finally resolves
    resolveRecipeA({ data: recipeDetail, etag: '"rec-etag-1"' });

    // Verify Recipe B's draft is NOT overwritten by Recipe A!
    await waitFor(() => {
      expect(screen.getByLabelText("Nombre")).toHaveValue("Papas Fritas Trufadas");
    });
  });

  test("displays ingredient name and unit from Menu detail when ingredient is not in current inventory page (P03)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    const rareRecipeDetail: RecipeDetail = {
      id: "rec-rare",
      name: "Filete Trufado",
      description: "Carne selecta",
      instructions: "Cocinar al término",
      supplies: [
        {
          inventoryItemId: "inv-rare-999",
          quantity: 15,
          inventoryItem: { id: "inv-rare-999", name: "Trufa Silvestre", unit: "g" },
        },
      ],
    };

    repository.listRecipes.mockResolvedValue({
      data: [rareRecipeDetail],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });
    repository.getRecipe.mockResolvedValue({
      data: rareRecipeDetail,
      etag: '"rare-etag"',
    });
    // Inventory items do NOT contain inv-rare-999
    repository.listInventoryItems.mockResolvedValue({
      data: [{ id: "inv-common", name: "Sal Marina", unit: "g" }],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Filete Trufado", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Editar Filete Trufado" }));

    expect(await screen.findByRole("heading", { name: "Editar receta", level: 2 })).toBeVisible();

    // The select displays "Trufa Silvestre" and unit "g" even though inv-rare-999 was not in inventory results!
    const select = screen.getByLabelText("Insumo 1");
    expect(select).toHaveValue("inv-rare-999");
    expect(screen.getByText("Trufa Silvestre")).toBeVisible();
    expect(screen.getByText("g")).toBeVisible();
    expect(screen.getByLabelText("Cantidad del insumo 1")).toHaveValue(15);

    // Modifying instructions and saving preserves inv-rare-999 and quantity 15
    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Cocinar a fuego lento" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(repository.updateRecipe).toHaveBeenCalledWith(
        "rec-rare",
        expect.objectContaining({
          supplies: [{ inventoryItemId: "inv-rare-999", quantity: 15 }],
        }),
        '"rare-etag"'
      );
    });
  });

  test("preserves delete dialog and blocking during in-flight DELETE on Escape or Cancel and restores focus after completion (P12)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    let resolveDelete: () => void = () => {};
    repository.deleteRecipe.mockImplementation(() => new Promise((resolve) => {
      resolveDelete = resolve;
    }));

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    const deleteBtn = screen.getByRole("button", { name: "Eliminar Hamburguesa Clásica" });
    deleteBtn.focus();
    fireEvent.click(deleteBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeVisible();

    // 1. Idle cancel via button restores focus
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(deleteBtn);

    // 2. Idle cancel via Escape key restores focus
    fireEvent.click(deleteBtn);
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(deleteBtn);

    // 3. During in-flight DELETE, Escape and Cancel are blocked
    fireEvent.click(deleteBtn);
    const confirmDeleteBtn = screen.getByRole("button", { name: "Eliminar receta" });
    fireEvent.click(confirmDeleteBtn);

    expect(confirmDeleteBtn).toHaveTextContent("Eliminando…");
    expect(confirmDeleteBtn).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    // Fire Escape key -> dialog remains open!
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeVisible();

    // Fire cancel event on dialog -> dialog remains open!
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("dialog")).toBeVisible();

    // Now resolve DELETE
    resolveDelete();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(deleteBtn);
  });

  test("disables all inputs, buttons, and handlers during submission and prevents double submissions (P02)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    let resolveCreate: (val: RecipeDetail) => void = () => {};
    repository.createRecipe.mockImplementation((draft) => new Promise((resolve) => {
      resolveCreate = () => resolve({
        id: "rec-new",
        ...draft,
        supplies: draft.supplies.map((s: { inventoryItemId: string; quantity: number }) => ({
          ...s,
          inventoryItem: inventoryItems.find((i) => i.id === s.inventoryItemId),
        })),
      });
    }));

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
    await screen.findByRole("option", { name: "Pan Brioche" });

    const nameInput = screen.getByLabelText("Nombre");
    const descInput = screen.getByLabelText("Descripción");
    const instInput = screen.getByLabelText("Instrucciones");
    const supplySelect = screen.getByLabelText("Insumo 1");
    const supplyQty = screen.getByLabelText("Cantidad del insumo 1");
    const addSupplyBtn = screen.getByRole("button", { name: "+ Agregar insumo" });
    const closeBtn = screen.getByLabelText("Cerrar formulario");
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    const saveBtn = screen.getByRole("button", { name: "Guardar receta" });

    fireEvent.change(nameInput, { target: { value: "Receta Bloqueo" } });
    fireEvent.change(descInput, { target: { value: "Desc Bloqueo" } });
    fireEvent.change(instInput, { target: { value: "Inst Bloqueo" } });
    fireEvent.change(supplySelect, { target: { value: "inv-2" } });
    fireEvent.change(supplyQty, { target: { value: "3" } });

    // Submit once
    fireEvent.click(saveBtn);

    // Wait for in-flight submission to invoke createRecipe
    await waitFor(() => {
      expect(repository.createRecipe).toHaveBeenCalledTimes(1);
    });

    // Verify all fields are locked while in flight
    expect(nameInput).toBeDisabled();
    expect(descInput).toBeDisabled();
    expect(instInput).toBeDisabled();
    expect(supplySelect).toBeDisabled();
    expect(supplyQty).toBeDisabled();
    expect(addSupplyBtn).toBeDisabled();
    expect(closeBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveTextContent("Guardando…");

    // Second click during in flight must NOT invoke createRecipe again
    fireEvent.click(saveBtn);
    expect(repository.createRecipe).toHaveBeenCalledTimes(1);

    // Typing during in flight must be ignored
    fireEvent.change(nameInput, { target: { value: "Modificado Durante Envío" } });
    expect(nameInput).toHaveValue("Receta Bloqueo");

    // Resolve create
    resolveCreate({
      id: "rec-new",
      name: "Receta Bloqueo",
      description: "Desc Bloqueo",
      instructions: "Inst Bloqueo",
      supplies: [{ inventoryItemId: "inv-2", quantity: 3 }],
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(repository.createRecipe).toHaveBeenCalledTimes(1);
  });

  test("maintains instance-scoped row key stability across addition, removal, and edits without global counter (P06)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
    await screen.findByRole("option", { name: "Pan Brioche" });

    // Add 2 more supply rows -> 3 total rows
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar insumo" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar insumo" }));

    // Configure rows
    fireEvent.change(screen.getByLabelText("Insumo 1"), { target: { value: "inv-1" } });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "100" } });

    fireEvent.change(screen.getByLabelText("Insumo 2"), { target: { value: "inv-2" } });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 2"), { target: { value: "200" } });

    fireEvent.change(screen.getByLabelText("Insumo 3"), { target: { value: "inv-3" } });
    fireEvent.change(screen.getByLabelText("Cantidad del insumo 3"), { target: { value: "300" } });

    // Remove row 2
    fireEvent.click(screen.getByLabelText("Eliminar insumo 2"));

    // Verify remaining rows maintain their values and order
    expect(screen.getByLabelText("Insumo 1")).toHaveValue("inv-1");
    expect(screen.getByLabelText("Cantidad del insumo 1")).toHaveValue(100);

    expect(screen.getByLabelText("Insumo 2")).toHaveValue("inv-3");
    expect(screen.getByLabelText("Cantidad del insumo 2")).toHaveValue(300);

    // Cancel dialog
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));

    // Reopen dialog -> pure instance initialization produces clean rows
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));
    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(2); // 1 header + 1 row
    expect(screen.getByLabelText("Insumo 1")).toHaveValue("");
    expect(screen.getByLabelText("Cantidad del insumo 1")).toHaveValue(1);
  });

  test("differentiates 412 conflict requiring review on edit without automatic resubmission or auto-renewed ETag (P04)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    const conflict412Error = Object.assign(new Error("Precondition Failed"), {
      response: {
        status: 412,
        data: {
          error: {
            message: "El recurso cambió en el servidor.",
          },
        },
      },
    });
    repository.updateRecipe.mockRejectedValueOnce(conflict412Error);

    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Editar Hamburguesa Clásica" }));

    expect(await screen.findByRole("heading", { name: "Editar receta", level: 2 })).toBeVisible();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Hamburguesa Clásica");

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Hamburguesa Clásica Con Conflicto" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // 412 triggers review requirement without auto-resubmit
    expect(await screen.findByText(/El recurso cambió en el servidor/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Revisar receta actual" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    // Prepare updated recipe on server
    const serverUpdatedRecipe: RecipeDetail = {
      ...recipeDetail,
      name: "Hamburguesa Servidor v2",
      description: "Modificada concurrentemente",
    };
    repository.getRecipe.mockResolvedValueOnce({
      data: serverUpdatedRecipe,
      etag: '"rec-etag-v2"',
    });

    // Click review
    fireEvent.click(screen.getByRole("button", { name: "Revisar receta actual" }));

    expect(await screen.findByRole("region", { name: "Datos actuales de la receta" })).toBeVisible();
    expect(screen.getByText("Hamburguesa Servidor v2")).toBeVisible();
    // Local draft is still preserved in the input!
    expect(screen.getByLabelText("Nombre")).toHaveValue("Hamburguesa Clásica Con Conflicto");

    // Choose "Continuar con mi borrador y versión revisada"
    fireEvent.click(screen.getByRole("button", { name: "Continuar con mi borrador y versión revisada" }));

    // Now save is re-enabled with new ETag
    expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(repository.updateRecipe).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({ name: "Hamburguesa Clásica Con Conflicto" }),
        '"rec-etag-v2"',
      );
    });
  });

  test("opens V7 inventory picker from ingredient row, selects an item, shows authoritative unit and saves recipe", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    render(
      <MemoryRouter>
        <RecipePage repository={repository} mode="management" storage={storage} />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Hamburguesa Clásica", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva receta" }));

    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Hamburguesa con Queso" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Con queso cheddar" } });
    fireEvent.change(screen.getByLabelText("Instrucciones"), { target: { value: "Derretir queso sobre la carne" } });

    // Open V7 inventory picker for Insumo 1, cancel it first, then open and select
    fireEvent.click(screen.getByRole("button", { name: "Buscar insumo 1 en inventario" }));
    expect(
      await screen.findByRole("heading", { name: "Artículos de inventario — elegir opción" })
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "✕ Cancelar" }));
    expect(
      screen.queryByRole("heading", { name: "Artículos de inventario — elegir opción" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buscar insumo 1 en inventario" }));
    expect(
      await screen.findByRole("heading", { name: "Artículos de inventario — elegir opción" })
    ).toBeVisible();

    const quesoRow = await screen.findByRole("row", { name: /Queso Cheddar/i });
    expect(within(quesoRow).getByText("rebanada")).toBeVisible();
    fireEvent.click(within(quesoRow).getByRole("button", { name: "Asignar" }));

    // V7 closes and row in V6 retains selected item and authoritative unit
    expect(screen.getByLabelText("Insumo 1")).toHaveValue("inv-3");
    expect(screen.getByText("rebanada")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Cantidad del insumo 1"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));

    await waitFor(() => {
      expect(repository.createRecipe).toHaveBeenCalledWith(
        {
          name: "Hamburguesa con Queso",
          description: "Con queso cheddar",
          instructions: "Derretir queso sobre la carne",
          supplies: [{ inventoryItemId: "inv-3", quantity: 2 }],
        },
        expect.any(String),
      );
    });
  });
});
