import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type {
  EntryQuery,
  MenuCategory,
  MenuEntry,
  Page,
  VersionedResource,
} from "../../application/catalog";
import {
  cachedCategories,
  cachedEntries,
  rememberCategories,
  rememberEntries,
} from "../../application/catalogCache";
import {
  createControllableIndexedDbHarness,
  createIndexedDbPendingOperationStorage,
} from "../../shared/pendingOperationStorage";
import { CategoryPage, type CategoryRepository } from "./CategoryPage";

const DIALOG_TITLE = "¿Eliminar categoría?";
const DELETED_NOTICE = 'Categoría "Bebidas" eliminada.';
const MISSING_VERSION = "No se recibió la versión de la categoría";
const OPENING_FAILED = "No se pudo consultar la categoría.";
const DEFAULT_CONFLICT =
  "La categoría cambió desde que la consultaste. Revisa los datos actuales y confirma de nuevo.";
const ALREADY_GONE = "La categoría ya no existe. Se actualizó la lista.";
const UNCONFIRMED =
  "No se pudo confirmar la eliminación. Se consultó la lista para verificar el estado actual.";

const category: MenuCategory = {
  id: "category-1",
  name: "Bebidas",
  description: "Frías y preparadas",
  entryCount: 2,
};

const desserts: MenuCategory = {
  id: "category-2",
  name: "Postres",
  description: "Opciones dulces",
  entryCount: 0,
};

function httpError(status: number, message?: string) {
  return Object.assign(new Error(`HTTP ${status}`), {
    response: { status, ...(message ? { data: { error: { message } } } : {}) },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** Fake backend: a confirmed DELETE is what removes the category from later reads. */
function createMockRepository(initial: MenuCategory[] = [category]): jest.Mocked<CategoryRepository> {
  let stored = [...initial];
  return {
    listCategories: jest.fn().mockImplementation(async () => [...stored]),
    getCategory: jest.fn().mockImplementation(async (id: string) => {
      const found = stored.find((item) => item.id === id);
      if (!found) throw httpError(404, "La categoría no existe.");
      return { data: found, etag: '"rev-1"' };
    }),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn().mockImplementation(async (id: string) => {
      stored = stored.filter((item) => item.id !== id);
    }),
  };
}

function renderPage(api: CategoryRepository) {
  const harness = createControllableIndexedDbHarness();
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
  return render(
    <MemoryRouter>
      <CategoryPage repository={api} storage={storage} />
    </MemoryRouter>,
  );
}

function deleteDialog() {
  return screen.getByRole("dialog", { name: DIALOG_TITLE });
}

function confirmButton() {
  return within(deleteDialog()).getByRole("button", { name: "Eliminar categoría" });
}

async function enabledConfirmButton() {
  await waitFor(() => expect(confirmButton()).toBeEnabled());
  return confirmButton();
}

/** Opens the confirmation from the row, with keyboard focus on the trigger as a real user would have. */
async function openDeleteDialog(name = "Bebidas") {
  await screen.findByRole("heading", { name });
  const trigger = screen.getByRole("button", { name: `Eliminar ${name}` });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: DIALOG_TITLE });
  return { trigger, dialog };
}

async function expectDialogClosed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

describe("CategoryPage category deletion", () => {
  test("each row has its own delete action that opens the confirmation for that category", async () => {
    const api = createMockRepository([category, desserts]);
    renderPage(api);

    await screen.findByRole("heading", { name: "Bebidas" });
    expect(screen.getByRole("button", { name: "Eliminar Bebidas" })).toBeVisible();
    const { dialog } = await openDeleteDialog("Postres");

    expect(within(dialog).getByRole("heading", { name: DIALOG_TITLE, level: 2 })).toBeVisible();
    await waitFor(() =>
      expect(api.getCategory).toHaveBeenCalledWith("category-2", expect.any(AbortSignal)),
    );
    expect(api.getCategory).toHaveBeenCalledTimes(1);
    await enabledConfirmButton();
    expect(dialog).toHaveTextContent("Postres");
    expect(dialog).not.toHaveTextContent("Bebidas");
    expect(dialog).toHaveTextContent(/no se puede deshacer/i);
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeEnabled();

    fireEvent.click(confirmButton());
    await waitFor(() =>
      expect(api.deleteCategory).toHaveBeenCalledWith("category-2", '"rev-1"'),
    );
  });

  test.each<[number | undefined, string]>([
    [3, "3 entradas asociadas"],
    [1, "1 entrada asociada"],
    [undefined, "Cuenta de entradas no disponible"],
  ])(
    "the dialog shows the current entry count from the opening GET (%s), not the stale list count",
    async (entryCount, expected) => {
      const api = createMockRepository();
      api.getCategory.mockResolvedValue({ data: { ...category, entryCount }, etag: '"rev-1"' });
      renderPage(api);

      expect(await screen.findByText("2 entradas asociadas")).toBeVisible();
      await openDeleteDialog();

      await waitFor(() => expect(deleteDialog()).toHaveTextContent(expected));
      expect(deleteDialog()).toHaveTextContent("Bebidas");
      expect(deleteDialog()).not.toHaveTextContent("2 entradas asociadas");
    },
  );

  test("opens at once but keeps deletion disabled until the opening GET provides a strong ETag", async () => {
    const api = createMockRepository();
    const opening = deferred<VersionedResource<MenuCategory>>();
    api.getCategory.mockReturnValueOnce(opening.promise);
    renderPage(api);
    await openDeleteDialog();

    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(api.deleteCategory).not.toHaveBeenCalled();

    await act(async () => opening.resolve({ data: category, etag: '"rev-1"' }));
    await waitFor(() => expect(confirmButton()).toBeEnabled());
    expect(api.deleteCategory).not.toHaveBeenCalled();
  });

  test("deletes with the ETag read on opening, closes the dialog, announces it and shows the re-queried list", async () => {
    const api = createMockRepository([category, desserts]);
    renderPage(api);
    await openDeleteDialog();

    fireEvent.click(await enabledConfirmButton());

    await waitFor(() =>
      expect(api.deleteCategory).toHaveBeenCalledWith("category-1", '"rev-1"'),
    );
    await expectDialogClosed();
    expect(await screen.findByText(DELETED_NOTICE)).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Bebidas" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "Postres" })).toBeVisible();
    expect(api.listCategories).toHaveBeenCalledTimes(2);
    expect(api.deleteCategory).toHaveBeenCalledTimes(1);
  });

  test("keeps the row until the re-queried list arrives instead of removing it optimistically", async () => {
    const api = createMockRepository();
    const reload = deferred<MenuCategory[]>();
    api.listCategories.mockResolvedValueOnce([category]).mockReturnValueOnce(reload.promise);
    renderPage(api);
    await openDeleteDialog();

    fireEvent.click(await enabledConfirmButton());

    expect(await screen.findByText(DELETED_NOTICE)).toBeVisible();
    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading", { name: "Bebidas" })).toBeVisible();

    await act(async () => reload.resolve([]));
    expect(await screen.findByText("Aún no hay categorías.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Bebidas" })).not.toBeInTheDocument();
  });

  test("invalidates the shared category and entry caches once the deletion is confirmed", async () => {
    const api = createMockRepository();
    const query: EntryQuery = { page: 1, pageSize: 12 };
    const cachedPage: Page<MenuEntry> = {
      data: [{
        id: "entry-1",
        brandName: "Limonada",
        description: "Natural",
        status: "ACTIVE",
        image: null,
        categories: [{ id: "category-1", name: "Bebidas" }],
        offerCount: 1,
      }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    };
    rememberCategories(api, [category]);
    rememberEntries(api, query, cachedPage);
    renderPage(api);
    await openDeleteDialog();

    // Reading the version to confirm must not drop what the catalog already cached.
    const confirm = await enabledConfirmButton();
    expect(cachedCategories(api)).toEqual([category]);
    expect(cachedEntries(api, query)).toEqual(cachedPage);

    fireEvent.click(confirm);
    expect(await screen.findByText(DELETED_NOTICE)).toBeVisible();
    expect(cachedCategories(api)).toBeUndefined();
    expect(cachedEntries(api, query)).toBeUndefined();
  });

  test.each<[string, string | undefined]>([
    ["missing", undefined],
    ["weak", 'W/"rev-1"'],
  ])(
    "an opening GET with a %s ETag explains the missing version and never enables deletion",
    async (_kind, etag) => {
      const api = createMockRepository();
      api.getCategory.mockResolvedValue({ data: category, etag });
      renderPage(api);
      await openDeleteDialog();

      await waitFor(() => expect(deleteDialog()).toHaveTextContent(MISSING_VERSION));
      expect(confirmButton()).toBeDisabled();
      fireEvent.click(confirmButton());
      expect(api.deleteCategory).not.toHaveBeenCalled();
    },
  );

  test("a failed opening GET alerts inside the dialog and Reintentar reads the version again", async () => {
    const api = createMockRepository();
    api.getCategory.mockRejectedValueOnce(new Error("Network Error"));
    renderPage(api);
    const { dialog } = await openDeleteDialog();

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(OPENING_FAILED);
    expect(confirmButton()).toBeDisabled();
    expect(api.getCategory).toHaveBeenCalledTimes(1);

    fireEvent.click(within(deleteDialog()).getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(api.getCategory).toHaveBeenCalledTimes(2));
    expect(api.getCategory).toHaveBeenLastCalledWith("category-1", expect.any(AbortSignal));
    const confirm = await enabledConfirmButton();
    expect(within(deleteDialog()).queryByRole("alert")).not.toBeInTheDocument();
    expect(api.deleteCategory).not.toHaveBeenCalled();

    fireEvent.click(confirm);
    await waitFor(() =>
      expect(api.deleteCategory).toHaveBeenCalledWith("category-1", '"rev-1"'),
    );
  });

  test("412 keeps the dialog open with the server conflict, reloads the version and only a second confirmation sends the new ETag", async () => {
    const api = createMockRepository();
    api.getCategory
      .mockResolvedValueOnce({ data: category, etag: '"rev-1"' })
      .mockResolvedValueOnce({ data: { ...category, entryCount: 5 }, etag: '"rev-2"' });
    api.deleteCategory.mockRejectedValueOnce(httpError(412, "Otra persona modificó la categoría."));
    renderPage(api);
    await openDeleteDialog();

    fireEvent.click(await enabledConfirmButton());

    await waitFor(() =>
      expect(deleteDialog()).toHaveTextContent("Otra persona modificó la categoría."),
    );
    await waitFor(() => expect(api.getCategory).toHaveBeenCalledTimes(2));
    expect(api.getCategory).toHaveBeenLastCalledWith("category-1", expect.any(AbortSignal));
    await waitFor(() => expect(deleteDialog()).toHaveTextContent("5 entradas asociadas"));
    // The user still has to read why the first attempt was rejected and decide again.
    expect(deleteDialog()).toHaveTextContent("Otra persona modificó la categoría.");
    expect(api.deleteCategory).toHaveBeenCalledTimes(1);
    expect(api.deleteCategory).toHaveBeenLastCalledWith("category-1", '"rev-1"');

    fireEvent.click(await enabledConfirmButton());

    await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledTimes(2));
    expect(api.deleteCategory).toHaveBeenLastCalledWith("category-1", '"rev-2"');
    await expectDialogClosed();
    expect(await screen.findByText(DELETED_NOTICE)).toBeVisible();
  });

  test("412 without a server message explains the conflict with the default text", async () => {
    const api = createMockRepository();
    api.deleteCategory.mockRejectedValueOnce(httpError(412));
    renderPage(api);
    await openDeleteDialog();

    fireEvent.click(await enabledConfirmButton());

    await waitFor(() => expect(deleteDialog()).toHaveTextContent(DEFAULT_CONFLICT));
    expect(api.deleteCategory).toHaveBeenCalledTimes(1);
  });

  test("404 closes the dialog, re-queries the list and keeps a page alert visible after the reload", async () => {
    const api = createMockRepository();
    const reload = deferred<MenuCategory[]>();
    api.listCategories.mockResolvedValueOnce([category]).mockReturnValueOnce(reload.promise);
    api.deleteCategory.mockRejectedValueOnce(httpError(404, "La categoría no existe."));
    renderPage(api);
    await openDeleteDialog();

    fireEvent.click(await enabledConfirmButton());

    await expectDialogClosed();
    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent(ALREADY_GONE);

    await act(async () => reload.resolve([]));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Bebidas" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(ALREADY_GONE);
    expect(screen.queryByText(DELETED_NOTICE)).not.toBeInTheDocument();
    expect(api.deleteCategory).toHaveBeenCalledTimes(1);
  });

  test("403 keeps the dialog open with the server message and does not re-query the list", async () => {
    const api = createMockRepository();
    api.deleteCategory.mockRejectedValueOnce(
      httpError(403, "No tienes permiso para realizar esta operación."),
    );
    renderPage(api);
    await openDeleteDialog();

    fireEvent.click(await enabledConfirmButton());

    await waitFor(() =>
      expect(deleteDialog()).toHaveTextContent("No tienes permiso para realizar esta operación."),
    );
    // The rejected attempt is over: the user can leave the dialog.
    expect(within(deleteDialog()).getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(api.deleteCategory).toHaveBeenCalledTimes(1);
    expect(api.listCategories).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  });

  test.each<[string, Error]>([
    ["a network failure", Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" })],
    ["a timeout", Object.assign(new Error("timeout of 20000ms exceeded"), { code: "ECONNABORTED" })],
    ["a 503 response", httpError(503, "Servicio no disponible.")],
  ])(
    "%s leaves the outcome unknown: closes the dialog, re-queries the list and keeps a page alert after the reload",
    async (_label, failure) => {
      const api = createMockRepository();
      const reload = deferred<MenuCategory[]>();
      api.listCategories.mockResolvedValueOnce([category]).mockReturnValueOnce(reload.promise);
      api.deleteCategory.mockRejectedValueOnce(failure);
      renderPage(api);
      await openDeleteDialog();

      fireEvent.click(await enabledConfirmButton());

      await expectDialogClosed();
      await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
      expect(await screen.findByRole("alert")).toHaveTextContent(UNCONFIRMED);

      // The response was lost but the server had applied the deletion.
      await act(async () => reload.resolve([]));
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: "Bebidas" })).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(UNCONFIRMED);
      expect(screen.queryByText(DELETED_NOTICE)).not.toBeInTheDocument();
      expect(api.deleteCategory).toHaveBeenCalledTimes(1);
    },
  );

  test("Cancelar closes the dialog without deleting and returns focus to the button that opened it", async () => {
    const api = createMockRepository();
    renderPage(api);
    const { trigger, dialog } = await openDeleteDialog();
    await enabledConfirmButton();

    // In a browser the modal holds focus; the user cancels from inside it.
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" });
    cancel.focus();
    fireEvent.click(cancel);

    await expectDialogClosed();
    expect(trigger).toHaveFocus();
    expect(api.deleteCategory).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  });

  test("Escape closes the dialog without deleting and returns focus to the button that opened it", async () => {
    const api = createMockRepository();
    renderPage(api);
    const { trigger, dialog } = await openDeleteDialog();
    await enabledConfirmButton();

    within(dialog).getByRole("button", { name: "Cancelar" }).focus();
    // Browsers translate Escape on a modal <dialog> into its cancel event.
    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    await expectDialogClosed();
    expect(trigger).toHaveFocus();
    expect(api.deleteCategory).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  });

  test("while the DELETE is in flight it blocks Cancelar and Escape and a double click sends a single request", async () => {
    const api = createMockRepository();
    const pendingDelete = deferred<void>();
    api.deleteCategory.mockReturnValueOnce(pendingDelete.promise);
    renderPage(api);
    const { dialog } = await openDeleteDialog();
    const confirm = await enabledConfirmButton();

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    expect(confirm).toHaveTextContent("Eliminando…");
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" });
    expect(cancel).toBeDisabled();
    fireEvent.click(cancel);
    // An unprevented cancel event would let the native modal close on Escape mid-request.
    expect(fireEvent(dialog, new Event("cancel", { cancelable: true }))).toBe(false);
    expect(deleteDialog()).toBeVisible();
    expect(api.deleteCategory).toHaveBeenCalledTimes(1);

    await act(async () => pendingDelete.resolve());
    await expectDialogClosed();
    expect(await screen.findByText(DELETED_NOTICE)).toBeVisible();
    expect(api.deleteCategory).toHaveBeenCalledTimes(1);
  });
});
