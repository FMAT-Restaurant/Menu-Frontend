import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MenuCategory } from "../../application/catalog";
import { isUuidV4 } from "../../application/operationAttempt";
import {
  createControllableIndexedDbHarness,
  createIndexedDbPendingOperationStorage,
  type PendingOperationStorageAdapter,
} from "../../shared/pendingOperationStorage";
import { buildCategoryCreateScope } from "./CategoryFormDialog";
import { CategoryPage, type CategoryRepository } from "./CategoryPage";

const category: MenuCategory = {
  id: "category-1",
  name: "Bebidas",
  description: "Frías y preparadas",
  entryCount: 2,
};

function createMockRepository(items = [category]): jest.Mocked<CategoryRepository> {
  return {
    listCategories: jest.fn().mockResolvedValue(items),
    getCategory: jest.fn().mockResolvedValue({
      data: category,
      etag: '"rev-1"',
    }),
    createCategory: jest.fn().mockImplementation(async (draft) => ({
      id: "category-created",
      ...draft,
      entryCount: 0,
    })),
    updateCategory: jest.fn().mockImplementation(async (id, draft) => ({
      id,
      ...draft,
      entryCount: 1,
    })),
  };
}

function renderPage(
  api: CategoryRepository,
  storage?: PendingOperationStorageAdapter,
) {
  const harness = storage ? null : createControllableIndexedDbHarness();
  const actualStorage = storage ?? createIndexedDbPendingOperationStorage({ idbFactory: harness!.factory });
  const view = render(
    <MemoryRouter>
      <CategoryPage repository={api} storage={actualStorage} />
    </MemoryRouter>,
  );
  return { ...view, storage: actualStorage };
}

describe("CategoryPage & CategoryFormDialog (T02A)", () => {
  test("lists category identity and informative counts without deletion", async () => {
    const api = createMockRepository();
    renderPage(api);

    expect(await screen.findByRole("heading", { name: "Bebidas" })).toBeVisible();
    expect(screen.getByText("Frías y preparadas")).toBeVisible();
    expect(screen.getByText("2 entradas asociadas")).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(api.listCategories).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  test("returns to the exact V1 query supplied by the catalog", async () => {
    const api = createMockRepository([]);
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    render(
      <MemoryRouter initialEntries={[{ pathname: "/categories", state: { returnTo: "/?q=postres&status=ACTIVE" } }]}>
        <CategoryPage repository={api} storage={storage} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Aún no hay categorías.")).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver al menú/ })).toHaveAttribute(
      "href",
      "/?q=postres&status=ACTIVE",
    );
  });

  test("empty state opens creation and cancel discards the draft and cleans storage", async () => {
    const api = createMockRepository([]);
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
    renderPage(api, storage);

    expect(await screen.findByText("Aún no hay categorías.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
    const dialog = screen.getByRole("dialog", { name: "Crear categoría" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), {
      target: { value: "Postres" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.createCategory).not.toHaveBeenCalled();

    const stored = await storage.getRecord(buildCategoryCreateScope());
    expect(stored).toBeNull();
  });

  test("creates a category with valid UUID v4 Idempotency-Key and reloads the list", async () => {
    const api = createMockRepository([]);
    renderPage(api);
    await screen.findByText("Aún no hay categorías.");
    fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialog = screen.getByRole("dialog", { name: "Crear categoría" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), {
      target: { value: "  Postres  " },
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Descripción" }), {
      target: { value: "  Opciones dulces  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar categoría" }));

    await waitFor(() =>
      expect(api.createCategory).toHaveBeenCalledWith(
        { name: "Postres", description: "Opciones dulces" },
        expect.any(String),
      ),
    );

    const calledKey = (api.createCategory as jest.Mock).mock.calls[0][1] as string;
    expect(isUuidV4(calledKey)).toBe(true);

    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Categoría creada.")).toBeVisible();
  });

  test("G04: creates a category and confirms that the list displays the newly created category upon reload", async () => {
    const list: MenuCategory[] = [];
    const api = createMockRepository(list);
    api.listCategories.mockImplementation(async () => [...list]);
    api.createCategory.mockImplementation(async (draft) => {
      const created = { id: "cat-new", ...draft, entryCount: 0 };
      list.push(created);
      return created;
    });

    renderPage(api);
    await screen.findByText("Aún no hay categorías.");
    fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialog = screen.getByRole("dialog", { name: "Crear categoría" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), {
      target: { value: "Postres" },
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Descripción" }), {
      target: { value: "Opciones dulces" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar categoría" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: "Postres" })).toBeVisible();
    expect(screen.getByText("Opciones dulces")).toBeVisible();
    expect(screen.getByText("0 entradas asociadas")).toBeVisible();
    expect(screen.queryByText("Aún no hay categorías.")).not.toBeInTheDocument();
  });

  test("G01: blocks fields and handlers during active save submission", async () => {
    const api = createMockRepository([]);
    let resolveSave: (cat: MenuCategory) => void;
    const savePromise = new Promise<MenuCategory>((resolve) => {
      resolveSave = resolve;
    });
    api.createCategory.mockReturnValueOnce(savePromise);

    renderPage(api);
    await screen.findByText("Aún no hay categorías.");
    fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialog = screen.getByRole("dialog", { name: "Crear categoría" });
    const nameInput = within(dialog).getByRole("textbox", { name: "Nombre" });
    const descInput = within(dialog).getByRole("textbox", { name: "Descripción" });
    const submitBtn = within(dialog).getByRole("button", { name: "Guardar categoría" });

    fireEvent.change(nameInput, { target: { value: "Cafés" } });
    fireEvent.click(submitBtn);

    // During active submission, fields and buttons are disabled
    expect(nameInput).toBeDisabled();
    expect(descInput).toBeDisabled();
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Guardando…");

    // Attempting to change value while busy is blocked
    fireEvent.change(nameInput, { target: { value: "Cafés Calientes" } });
    expect(nameInput).toHaveValue("Cafés");

    // Completing submission
    resolveSave!({ id: "cat-c", name: "Cafés", entryCount: 0 });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("G03: renders four distinct representations for entry count: undefined, 0, 1, and plural", async () => {
    const categoriesWithVariousCounts: MenuCategory[] = [
      { id: "c-undef", name: "Cat Indefinida", description: "Desc", entryCount: undefined },
      { id: "c-zero", name: "Cat Cero", description: "Desc", entryCount: 0 },
      { id: "c-one", name: "Cat Uno", description: "Desc", entryCount: 1 },
      { id: "c-plural", name: "Cat Plural", description: "Desc", entryCount: 4 },
    ];
    const api = createMockRepository(categoriesWithVariousCounts);
    renderPage(api);

    expect(await screen.findByRole("heading", { name: "Cat Indefinida" })).toBeVisible();
    expect(screen.getByText("Cuenta de entradas no disponible")).toBeVisible();
    expect(screen.getByText("0 entradas asociadas")).toBeVisible();
    expect(screen.getByText("1 entrada asociada")).toBeVisible();
    expect(screen.getByText("4 entradas asociadas")).toBeVisible();
  });

  test("edits a category: fetches opening version with strong ETag and updates using it directly", async () => {
    const api = createMockRepository();
    renderPage(api);
    await screen.findByRole("heading", { name: "Bebidas" });
    fireEvent.click(screen.getByRole("button", { name: "Editar Bebidas" }));

    const dialog = screen.getByRole("dialog", { name: "Editar categoría" });
    await waitFor(() => expect(api.getCategory).toHaveBeenCalledWith("category-1", expect.any(AbortSignal)));
    expect(within(dialog).getByRole("textbox", { name: "Nombre" })).toHaveValue("Bebidas");
    expect(within(dialog).getByRole("textbox", { name: "Descripción" })).toHaveValue("Frías y preparadas");

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Descripción" }), {
      target: { value: "Bebidas frías" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(api.updateCategory).toHaveBeenCalledWith(
        "category-1",
        { name: "Bebidas", description: "Bebidas frías" },
        '"rev-1"',
      ),
    );
    expect(await screen.findByText("Categoría actualizada.")).toBeVisible();
  });

  test("A01/A09: 412 precondition failed preserves draft, requires explicit review and adoption before re-saving", async () => {
    const api = createMockRepository();
    let patchCount = 0;
    api.updateCategory.mockImplementation(async (id, draft, etag) => {
      patchCount++;
      if (etag === '"rev-1"') {
        throw {
          status: 412,
          rawBody: { error: { message: "Precondition Failed" } },
        };
      }
      return { id, ...draft, entryCount: 2 };
    });

    renderPage(api);
    await screen.findByRole("heading", { name: "Bebidas" });
    fireEvent.click(screen.getByRole("button", { name: "Editar Bebidas" }));

    const dialog = await screen.findByRole("dialog", { name: "Editar categoría" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Descripción" }), {
      target: { value: "Mi borrador modificado" },
    });

    // 1. Guardar con versión v1 devuelve 412
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(patchCount).toBe(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Precondition Failed");
    // El borrador permanece intacto
    expect(within(dialog).getByRole("textbox", { name: "Descripción" })).toHaveValue("Mi borrador modificado");

    // El botón Guardar cambios está deshabilitado mientras se requiera revisión
    expect(within(dialog).getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    // 2. Mock de getCategory con v2
    api.getCategory.mockResolvedValueOnce({
      data: { id: "category-1", name: "Bebidas Servidor", description: "Descripción externa", entryCount: 3 },
      etag: '"rev-2"',
    });

    // 3. Revisar categoría actual
    const reviewBtn = screen.getByRole("button", { name: "Revisar categoría actual" });
    fireEvent.click(reviewBtn);

    expect(await screen.findByRole("region", { name: "Datos actuales de la categoría" })).toBeVisible();
    expect(screen.getByText("Bebidas Servidor")).toBeVisible();

    // 4. Elegir "Continuar con mi borrador y versión revisada"
    const adoptDraftBtn = screen.getByRole("button", {
      name: "Continuar con mi borrador y versión revisada",
    });
    fireEvent.click(adoptDraftBtn);

    // Borrador sigue siendo el del usuario
    expect(within(dialog).getByRole("textbox", { name: "Descripción" })).toHaveValue("Mi borrador modificado");
    expect(within(dialog).getByRole("button", { name: "Guardar cambios" })).toBeEnabled();

    // 5. Guardar nuevamente envía la versión v2 revisada
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(api.updateCategory).toHaveBeenCalledWith(
        "category-1",
        { name: "Bebidas", description: "Mi borrador modificado" },
        '"rev-2"',
      ),
    );
    expect(await screen.findByText("Categoría actualizada.")).toBeVisible();
  });

  test("POST uncertain outcome allows manual retry with exact same key and payload", async () => {
    const api = createMockRepository([]);
    let postCalls = 0;
    const sentKeys: string[] = [];

    api.createCategory.mockImplementation(async (draft, key) => {
      postCalls++;
      sentKeys.push(key);
      if (postCalls === 1) {
        throw { isTimeout: true, message: "Timeout" };
      }
      return { id: "cat-recovered", ...draft, entryCount: 0 };
    });

    renderPage(api);
    await screen.findByText("Aún no hay categorías.");
    fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialog = screen.getByRole("dialog", { name: "Crear categoría" });

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), {
      target: { value: "Entrantes" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar categoría" }));

    // Primer intento falla por timeout
    await waitFor(() => expect(postCalls).toBe(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Timeout");

    // Botón de reintento manual aparece
    const retryBtn = screen.getByRole("button", { name: "Reintentar" });
    expect(retryBtn).toBeEnabled();

    // Clic en Reintentar reenvía exactamente la misma clave
    fireEvent.click(retryBtn);

    await waitFor(() => expect(postCalls).toBe(2));
    expect(sentKeys[0]).toBe(sentKeys[1]);
    expect(await screen.findByText("Categoría creada.")).toBeVisible();
  });

  test("POST success with edits after submission preserves draft in edit mode and warns user", async () => {
    const api = createMockRepository([]);
    let callCount = 0;
    api.createCategory.mockImplementation(async (draft) => {
      callCount++;
      if (callCount === 1) {
        throw { isTimeout: true, message: "Timeout" };
      }
      return {
        id: "cat-123",
        name: draft.name,
        description: draft.description,
        entryCount: 0,
      };
    });

    renderPage(api);
    await screen.findByText("Aún no hay categorías.");
    fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialog = screen.getByRole("dialog", { name: "Crear categoría" });

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), {
      target: { value: "Bebidas" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar categoría" }));

    // Primer intento falla por timeout, campos se desbloquean para editar entre intentos inciertos
    await waitFor(() => expect(callCount).toBe(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Timeout");

    // Entre intentos, el usuario añade una descripción al borrador
    const descInput = within(dialog).getByRole("textbox", { name: "Descripción" });
    expect(descInput).toBeEnabled();
    fireEvent.change(descInput, {
      target: { value: "Descripción añadida tras timeout" },
    });

    // Ahora pulsa Reintentar (que reenvía la solicitud original)
    fireEvent.click(within(dialog).getByRole("button", { name: "Reintentar" }));

    // El reintento tiene éxito, pero como hay cambios posteriores en el borrador, el diálogo
    // permanece abierto en modo edición y muestra el aviso de cambios pendientes
    await waitFor(() => expect(callCount).toBe(2));
    await waitFor(() =>
      expect(
        within(dialog).getByText(/La categoría se creó en el servidor. Tus cambios posteriores siguen en el formulario/),
      ).toBeVisible(),
    );
    expect(within(dialog).getByRole("heading", { name: "Editar categoría" })).toBeVisible();
    expect(within(dialog).getByRole("textbox", { name: "Descripción" })).toHaveValue(
      "Descripción añadida tras timeout",
    );
  });

  test("pre-send storage failure displays error message and makes 0 HTTP calls", async () => {
    const api = createMockRepository([]);
    const failingStorage: PendingOperationStorageAdapter = {
      saveRecord: jest.fn().mockRejectedValue(new Error("Disk quota exceeded")),
      getRecord: jest.fn().mockResolvedValue(null),
      deleteRecord: jest.fn().mockResolvedValue(undefined),
      listByTab: jest.fn().mockResolvedValue([]),
    };

    renderPage(api, failingStorage);
    await screen.findByText("Aún no hay categorías.");
    fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialog = screen.getByRole("dialog", { name: "Crear categoría" });

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Nombre" }), {
      target: { value: "Sopas" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar categoría" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo enviar. Vuelve a intentarlo.");
    expect(api.createCategory).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("textbox", { name: "Nombre" })).toHaveValue("Sopas");
  });

  test("restores pending draft on mount from storage without any HTTP POST", async () => {
    const api = createMockRepository([]);
    const harness = createControllableIndexedDbHarness();
    const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });

    // Pre-populate storage with an interrupted draft
    const scope = buildCategoryCreateScope();
    await storage.saveRecord({
      storageKey: `${scope.tabId}::category-form::new`,
      scope,
      createdAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
      currentStageIndex: 0,
      stages: [
        {
          attemptId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          operationKind: "category.create",
          method: "POST",
          endpointPath: "/menu/categories",
          idempotencyKey: "11111111-2222-4333-8444-555555555555",
          payload: {
            kind: "json",
            serializedBody: JSON.stringify({ name: "Draft Guardado", description: "Desc" }),
            payloadSnapshot: { name: "Draft Guardado", description: "Desc" },
          },
          createdAt: Date.now() - 5000,
          firstSentAt: Date.now() - 5000,
          firstConfirmedAt: null,
          lastAttemptAt: Date.now() - 5000,
          status: "uncertain",
          retryAfterSeconds: null,
          retryAfterUntil: null,
          retryAfterInvalid: false,
          possibleWriteApplied: true,
          lastErrorCode: "REQUEST_TIMEOUT",
          lastErrorMessage: "Tiempo de espera agotado.",
          attemptCount: 1,
          submittedDraftVersion: 1,
        },
      ],
      confirmedImageId: null,
      ifMatch: null,
      editableDraft: { name: "Draft Guardado", description: "Desc" },
      submittedDraftVersion: 1,
      currentDraftVersion: 1,
    });

    renderPage(api, storage);

    // CategoryFormDialog reopens automatically on mount
    const dialog = await screen.findByRole("dialog", { name: "Crear categoría" });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole("textbox", { name: "Nombre" })).toHaveValue("Draft Guardado");
    expect(within(dialog).getByRole("textbox", { name: "Descripción" })).toHaveValue("Desc");
    expect(api.createCategory).not.toHaveBeenCalled();
  });
});
