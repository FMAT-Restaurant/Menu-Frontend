import { GuardedMemoryRouter as MemoryRouter } from "../../shared/GuardedMemoryRouter.test-helper";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { AxiosError, AxiosHeaders } from "axios";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { MenuEntryDetail, MenuRepository } from "../../application/catalog";
import type { PendingOperationStorageAdapter } from "../../application/operationAttempt";
import {
  createControllableIndexedDbHarness,
  createIndexedDbPendingOperationStorage,
} from "../../shared/pendingOperationStorage";
import { EntryFormPage } from "./EntryFormPage";
import { buildEntryCreateScope } from "./useEntryForm";

const categories = [
  { id: "category-1", name: "Principales", entryCount: 2 },
  { id: "category-2", name: "Especialidades", entryCount: 1 },
];

const entry: MenuEntryDetail = {
  id: "entry-1",
  brandName: "Hamburguesa de la casa",
  description: "Con queso y verduras frescas.",
  status: "INACTIVE",
  etag: '"entry-rev-1"',
  imageRef: "img-current",
  categoryIds: ["category-1"],
};

type EntryFormRepository = Pick<
  MenuRepository,
  "listCategories" | "getEntry" | "uploadEntryImage" | "createEntry" | "updateEntry"
>;

function repository(): jest.Mocked<EntryFormRepository> {
  return {
    listCategories: jest.fn().mockResolvedValue(categories),
    getEntry: jest.fn().mockResolvedValue(entry),
    uploadEntryImage: jest.fn().mockResolvedValue("image-uploaded"),
    createEntry: jest.fn().mockResolvedValue(entry),
    updateEntry: jest.fn().mockResolvedValue(entry),
  };
}

function renderPage(
  api: EntryFormRepository,
  path = "/entries/new",
  state?: unknown,
  storage?: PendingOperationStorageAdapter,
  onSaved?: () => Promise<void>,
) {
  const harness = storage ? null : createControllableIndexedDbHarness();
  const actualStorage =
    storage ??
    createIndexedDbPendingOperationStorage({ idbFactory: harness!.factory });
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route
          path="/entries/new"
          element={<EntryFormPage repository={api} storage={actualStorage} onSaved={onSaved} />}
        />
        <Route
          path="/entries/:entryId/edit"
          element={<EntryFormPage repository={api} storage={actualStorage} onSaved={onSaved} />}
        />
        <Route path="/" element={<CatalogDestination />} />
      </Routes>
    </MemoryRouter>,
  );
}

function CatalogDestination() {
  const location = useLocation();
  return <h1>Catálogo restaurado {location.search}</h1>;
}

const originalDescriptors = {
  createImageBitmap: Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap"),
  createObjectURL: Object.getOwnPropertyDescriptor(URL, "createObjectURL"),
  revokeObjectURL: Object.getOwnPropertyDescriptor(URL, "revokeObjectURL"),
  requestAnimationFrame: Object.getOwnPropertyDescriptor(window, "requestAnimationFrame"),
  scrollBy: Object.getOwnPropertyDescriptor(window, "scrollBy"),
  scrollTo: Object.getOwnPropertyDescriptor(window, "scrollTo"),
};

function restoreGlobal(target: object, prop: string, original: PropertyDescriptor | undefined) {
  if (original) {
    Object.defineProperty(target, prop, original);
  } else {
    Reflect.deleteProperty(target, prop);
  }
}

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue("blob:default-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
});

afterEach(() => {
  restoreGlobal(globalThis, "createImageBitmap", originalDescriptors.createImageBitmap);
  restoreGlobal(URL, "createObjectURL", originalDescriptors.createObjectURL);
  restoreGlobal(URL, "revokeObjectURL", originalDescriptors.revokeObjectURL);
  restoreGlobal(window, "requestAnimationFrame", originalDescriptors.requestAnimationFrame);
  restoreGlobal(window, "scrollBy", originalDescriptors.scrollBy);
  restoreGlobal(window, "scrollTo", originalDescriptors.scrollTo);
  jest.restoreAllMocks();
});

async function chooseValidImage() {
  const bitmap = { width: 800, height: 600, close: jest.fn() };
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: jest.fn().mockResolvedValue(bitmap),
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn().mockReturnValue("blob:entry-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
  const file = new File(["image bytes"], "hamburguesa.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [file] } });
  await screen.findByRole("img", { name: "Vista previa de la imagen de la entrada" });
  await waitFor(() => expect(screen.getByRole("button", { name: /Guardar/ })).not.toBeDisabled());
  return file;
}

test("creates an entry inactive with one image and multiple optional categories", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByLabelText("Archivo de imagen");
  const created = await chooseValidImage();

  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "  Bowl de pollo  " } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Pollo con arroz." } });
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
  fireEvent.click(await screen.findByLabelText("Principales"));
  fireEvent.click(screen.getByLabelText("Especialidades"));
  expect(screen.queryByText(/Estado inicial:/)).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Estado administrativo" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));

  await waitFor(() => expect(api.createEntry).toHaveBeenCalledWith({
    brandName: "Bowl de pollo",
    description: "Pollo con arroz.",
    categoryIds: ["category-1", "category-2"],
    imageId: "image-uploaded",
  }, expect.any(String)));
  expect(api.uploadEntryImage).toHaveBeenCalledWith(created, expect.any(String));
  expect(await screen.findByRole("heading", { name: "Catálogo restaurado" })).toBeVisible();
  expect(api.getEntry).not.toHaveBeenCalled();
});

test("allows creating an entry without selecting categories", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByLabelText("Archivo de imagen");
  const image = await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Sopa del día" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Preparada cada mañana." } });
  fireEvent.click(await screen.findByRole("button", { name: "Guardar entrada" }));

  await waitFor(() => expect(api.createEntry).toHaveBeenCalledWith({
    brandName: "Sopa del día",
    description: "Preparada cada mañana.",
    categoryIds: [],
    imageId: "image-uploaded",
  }, expect.any(String)));
  expect(api.uploadEntryImage).toHaveBeenCalledWith(image, expect.any(String));
});

test("loads an entry for editing and keeps its current image when no replacement is selected", async () => {
  const api = repository();
  renderPage(api, "/entries/entry-1/edit", { returnTo: "/?q=pollo" });

  expect(await screen.findByDisplayValue("Hamburguesa de la casa")).toBeVisible();
  expect(screen.getByText(/Imagen actual conservada.*img-current/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "1 categoría seleccionada" }));
  expect(screen.getByLabelText("Principales")).toBeChecked();
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción actualizada." } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => expect(api.updateEntry).toHaveBeenCalledWith("entry-1", {
    brandName: "Hamburguesa de la casa",
    description: "Descripción actualizada.",
    categoryIds: ["category-1"],
  }, '"entry-rev-1"'));
  expect(await screen.findByRole("heading", { name: "Catálogo restaurado ?q=pollo" })).toBeVisible();
});

test("replaces an image only after validating it and sends the replacement with the edit", async () => {
  const api = repository();
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue("Hamburguesa de la casa");
  const replacement = await chooseValidImage();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => expect(api.updateEntry).toHaveBeenCalledWith("entry-1", expect.objectContaining({
    categoryIds: ["category-1"],
    imageId: "image-uploaded",
  }), '"entry-rev-1"'));
  expect(api.uploadEntryImage).toHaveBeenCalledWith(replacement, expect.any(String));
});

test("rejects invalid images without calling create or changing the entry", async () => {
  const api = repository();
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: jest.fn().mockResolvedValue({ width: 5000, height: 600, close: jest.fn() }),
  });
  renderPage(api);
  await screen.findByLabelText("Archivo de imagen");
  const file = new File(["image bytes"], "too-wide.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [file] } });

  expect(await screen.findByText("La imagen no puede superar 4096 × 4096 px.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Guardar entrada" })).toBeDisabled();
  expect(api.createEntry).not.toHaveBeenCalled();
});

test("keeps the form open and its values when the server rejects a save", async () => {
  const api = repository();
  api.createEntry.mockRejectedValue(new Error("La categoría no pertenece al menú."));
  renderPage(api);
  await screen.findByLabelText("Archivo de imagen");
  const image = await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Bowl de pollo" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Pollo con arroz." } });
  fireEvent.click(await screen.findByRole("button", { name: "Guardar entrada" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("La categoría no pertenece al menú.");
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl de pollo");
  expect(api.createEntry).toHaveBeenCalledWith({ brandName: "Bowl de pollo", description: "Pollo con arroz.", categoryIds: [], imageId: "image-uploaded" }, expect.any(String));
  expect(api.uploadEntryImage).toHaveBeenCalledWith(image, expect.any(String));
});

test("cancel discards the draft after modifying fields and image, and reopening shows clean initial state", async () => {
  const api = repository();
  renderPage(api, "/entries/new", { returnTo: "/?status=ARCHIVED" });
  await screen.findByRole("button", { name: "Guardar entrada" });
  await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Borrador a cancelar" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción a cancelar" } });

  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Seguir editando" }));
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Borrador a cancelar");
  expect(screen.getByLabelText("Descripción")).toHaveValue("Descripción a cancelar");
  expect(screen.getByRole("img", { name: "Vista previa de la imagen de la entrada" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Descartar cambios" }));

  expect(await screen.findByRole("heading", { name: "Catálogo restaurado ?status=ARCHIVED" })).toBeVisible();
  expect(api.createEntry).not.toHaveBeenCalled();
  expect(api.updateEntry).not.toHaveBeenCalled();

  renderPage(api, "/entries/new", { returnTo: "/?status=ARCHIVED" });
  expect(await screen.findByLabelText("Nombre comercial")).toHaveValue("");
  expect(screen.getByLabelText("Descripción")).toHaveValue("");
  expect(screen.queryByRole("img", { name: "Vista previa de la imagen de la entrada" })).not.toBeInTheDocument();
  expect(api.createEntry).not.toHaveBeenCalled();
  expect(api.updateEntry).not.toHaveBeenCalled();
});

test("unarchiving sets INACTIVE and requires a later explicit activation", async () => {
  const api = repository();
  api.getEntry.mockResolvedValue({ ...entry, status: "ARCHIVED" });
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue("Hamburguesa de la casa");
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "INACTIVE" } });
  expect(screen.getByText(/actívala después de forma expresa/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => expect(api.updateEntry).toHaveBeenCalledWith("entry-1", expect.objectContaining({ status: "INACTIVE" }), '"entry-rev-1"'));
});

test("retries the failed entry request without loading categories again", async () => {
  const api = repository();
  api.getEntry.mockRejectedValueOnce(new Error("Temporary failure"));
  renderPage(api, "/entries/entry-1/edit");

  fireEvent.click(await screen.findByRole("button", { name: "Reintentar entrada" }));

  expect(await screen.findByDisplayValue("Hamburguesa de la casa")).toBeVisible();
  expect(api.getEntry).toHaveBeenCalledTimes(2);
  expect(api.listCategories).toHaveBeenCalledTimes(1);
});

test("reports blank required fields without calling the repository", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByRole("button", { name: "Guardar entrada" });
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);

  expect(await screen.findByRole("alert")).toHaveTextContent("Indica el nombre comercial de la entrada.");
  expect(api.createEntry).not.toHaveBeenCalled();
});

test("shows structured server validation details and keeps the draft", async () => {
  const api = repository();
  api.createEntry.mockRejectedValue({
    response: { data: { message: "Datos inválidos.", details: [{ message: "Categoría ajena al menú." }] } },
  });
  renderPage(api);
  await screen.findByRole("button", { name: "Guardar entrada" });
  const image = await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Bowl" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Con arroz" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));

  const summary = await screen.findByRole("alert");
  expect(summary).toHaveTextContent("Datos inválidos.");
  expect(summary).toHaveTextContent("Categoría ajena al menú.");
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  expect(api.createEntry).toHaveBeenCalledWith({ brandName: "Bowl", description: "Con arroz", categoryIds: [], imageId: "image-uploaded" }, expect.any(String));
  expect(api.uploadEntryImage).toHaveBeenCalledWith(image, expect.any(String));
});

test("falls back to the catalog for an unsafe return path", async () => {
  const api = repository();
  renderPage(api, "/entries/new", { returnTo: "/\\outside.example" });
  await screen.findByRole("button", { name: "Guardar entrada" });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

  expect(await screen.findByRole("heading", { name: "Catálogo restaurado" })).toBeVisible();
});

test("keeps previously assigned categories visible if a category is missing from the list", async () => {
  const api = repository();
  api.listCategories.mockResolvedValue([]);
  renderPage(api, "/entries/entry-1/edit");

  fireEvent.click(await screen.findByRole("button", { name: "1 categoría seleccionada" }));
  expect(await screen.findByRole("checkbox", { name: "Categoría ya asignada (category-1)" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Retirar categoría Categoría ya asignada (category-1)" })).toBeVisible();
});

function rejected(status: number, violations: unknown[] = []) {
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, {}, {
    status, statusText: "Rejected", headers: {}, config: { headers: new AxiosHeaders() },
    data: { error: { message: "Revisa los datos enviados.", details: { violations } } },
  });
}

function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fillIdentity() {
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Bowl" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Con arroz" } });
}

test("back navigation is visible immediately and preserves query, filters and page without saving", async () => {
  const api = repository();
  renderPage(api, "/entries/new", { returnTo: "/?q=arroz&status=INACTIVE&page=3" });
  fillIdentity();
  fireEvent.click(screen.getByRole("link", { name: /Volver a entradas/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Seguir editando" }));
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  expect(screen.getByLabelText("Descripción")).toHaveValue("Con arroz");
  fireEvent.click(screen.getByRole("link", { name: /Volver a entradas/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Descartar cambios" }));
  expect(await screen.findByRole("heading", { name: "Catálogo restaurado ?q=arroz&status=INACTIVE&page=3" })).toBeVisible();
  expect(api.updateEntry).not.toHaveBeenCalled();
  expect(api.createEntry).not.toHaveBeenCalled();
});

test.each([undefined, { returnTo: 1 }, { returnTo: "https://outside.example" }, { returnTo: "//outside.example" }])("direct or unsafe navigation falls back to the catalog: %p", async (state) => {
  renderPage(repository(), "/entries/new", state);
  expect(screen.getByRole("link", { name: /Volver a entradas/ })).toHaveAttribute("href", "/");
  await waitFor(() => expect(screen.queryByText("Cargando categorías…")).not.toBeInTheDocument());
});

test("category search retains hidden selections, chips remove them, and editing fields sends no GET", async () => {
  const api = repository();
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  fireEvent.click(screen.getByRole("button", { name: "1 categoría seleccionada" }));
  const search = screen.getByRole("searchbox", { name: "Buscar categorías" });
  expect(search).toHaveFocus();
  fireEvent.change(search, { target: { value: "especial" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Especialidades" }));
  fireEvent.change(search, { target: { value: "ninguna" } });
  expect(screen.getByText(/No hay coincidencias/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Retirar categoría Principales" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Retirar categoría Principales" }));
  fireEvent.change(search, { target: { value: "" } });
  expect(screen.getByRole("checkbox", { name: "Especialidades" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Principales" })).not.toBeChecked();
  fireEvent.keyDown(search, { key: "Escape" });
  expect(screen.getByRole("button", { name: "1 categoría seleccionada" })).toHaveFocus();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  fillIdentity();
  expect(api.getEntry).toHaveBeenCalledTimes(1);
  expect(api.listCategories).toHaveBeenCalledTimes(1);
});

test("category validation uses native grouped controls and Escape only closes from inside the selector", async () => {
  const api = repository();
  api.createEntry.mockRejectedValueOnce(rejected(422, [{ path: "/categoryIds", message: "Revisa las categorías elegidas." }]));
  renderPage(api); await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("alert", { name: "Error al guardar entrada" });
  const trigger = screen.getByRole("button", { name: "Seleccionar categorías" });
  expect(trigger).not.toHaveAttribute("aria-invalid");
  expect(trigger).toHaveAccessibleDescription("Revisa las categorías elegidas.");
  fireEvent.click(trigger);
  expect(screen.getByRole("group", { name: "Categorías disponibles" }).tagName).toBe("FIELDSET");
  const checkbox = screen.getByRole("checkbox", { name: "Principales" });
  expect(checkbox).toHaveAttribute("aria-invalid", "true");
  expect(checkbox).toHaveAccessibleDescription("Revisa las categorías elegidas.");
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toBeInTheDocument();
  fireEvent.keyDown(checkbox, { key: "Escape" });
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("slow categories do not hide independent fields or overwrite the draft", async () => {
  const api = repository();
  const categoriesRequest = pending<typeof categories>();
  api.listCategories.mockReturnValue(categoriesRequest.promise);
  renderPage(api);
  fillIdentity();
  await chooseValidImage();
  expect(screen.getByText("Cargando categorías…")).toBeVisible();
  expect(api.uploadEntryImage).not.toHaveBeenCalled();
  fireEvent.submit(document.querySelector("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("Espera a que carguen las categorías");
  await act(async () => { categoriesRequest.resolve(categories); });
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  expect(api.listCategories).toHaveBeenCalledTimes(1);
});

test("category failure keeps assigned categories and retry does not reread the entry or erase edits", async () => {
  const api = repository();
  api.listCategories.mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"));
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  fillIdentity();
  expect(screen.getByRole("button", { name: /Retirar categoría Categoría ya asignada/ })).toBeVisible();
  fireEvent.click(await screen.findByRole("button", { name: "Continuar sin añadir categorías" }));
  expect(screen.getByText(/Se conservarán las asignaciones/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar categorías" }));
  await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  expect(api.getEntry).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(api.updateEntry).toHaveBeenCalledWith(entry.id, expect.objectContaining({ categoryIds: ["category-1"] }), entry.etag));
});

test("StrictMode and reopening reuse categories rather than sending duplicate completed GETs", async () => {
  const api = repository();
  const harness = createControllableIndexedDbHarness();
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
  const first = render(
    <StrictMode>
      <MemoryRouter>
        <EntryFormPage repository={api} storage={storage} />
      </MemoryRouter>
    </StrictMode>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
  await screen.findByRole("checkbox", { name: "Principales" });
  expect(api.listCategories).toHaveBeenCalledTimes(1);
  first.unmount();
  renderPage(api);
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
  await screen.findByRole("checkbox", { name: "Principales" });
  expect(api.listCategories).toHaveBeenCalledTimes(1);
});

test("a real AxiosError locates fields, focuses the summary and preserves the draft", async () => {
  const api = repository();
  api.createEntry.mockRejectedValueOnce(rejected(422, [{ path: "/brandName", message: "Nombre duplicado." }, { path: "/description", message: "Descripción insuficiente." }]));
  renderPage(api);
  await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  const summary = await screen.findByRole("alert");
  expect(summary).toHaveTextContent("Revisa los datos enviados.");
  expect(summary).not.toHaveTextContent("Request failed");
  expect(summary).toHaveFocus();
  expect(screen.getByLabelText("Nombre comercial")).toHaveAttribute("aria-invalid", "true");
  fireEvent.click(within(summary).getAllByRole("button", { name: "Ir al campo" })[0]);
  expect(screen.getByLabelText("Nombre comercial")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Bowl corregido" } });
  expect(screen.getByLabelText("Nombre comercial")).toHaveFocus();
  expect(screen.getByLabelText("Nombre comercial")).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByLabelText("Descripción")).toHaveValue("Con arroz");
});

test.each([false, true])("reuses the same upload after a confirmed persistence rejection (editing=%s)", async (editing) => {
  const api = repository();
  const write = editing ? api.updateEntry : api.createEntry;
  write.mockRejectedValueOnce(rejected(422)).mockResolvedValue(entry);
  renderPage(api, editing ? "/entries/entry-1/edit" : "/entries/new");
  if (editing) await screen.findByDisplayValue(entry.brandName);
  const image = await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: /Guardar/ }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: /Guardar/ }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.uploadEntryImage).toHaveBeenCalledTimes(1);
  expect(api.uploadEntryImage).toHaveBeenCalledWith(image, expect.any(String));
  expect(write).toHaveBeenCalledTimes(2);
  expect(api.getEntry).toHaveBeenCalledTimes(editing ? 1 : 0);
});

test("invalid image references invalidate the upload id so a retry can recover", async () => {
  const api = repository();
  api.createEntry.mockRejectedValueOnce(rejected(422, [{ path: "/imageId", message: "Imagen no disponible." }]));
  renderPage(api); await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await waitFor(() => expect(screen.getByLabelText("Archivo de imagen")).toHaveAttribute("aria-invalid", "true"));
  expect(screen.getByRole("button", { name: "Cambiar imagen" })).not.toHaveAttribute("aria-invalid");
  expect(screen.getByRole("button", { name: "Cambiar imagen" })).toHaveAccessibleDescription(/Imagen no disponible/);
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.uploadEntryImage).toHaveBeenCalledTimes(2);
});

test("selecting another file invalidates the cached upload even if its name is unchanged", async () => {
  const api = repository();
  api.uploadEntryImage.mockResolvedValueOnce("image-first").mockResolvedValueOnce("image-second");
  api.createEntry.mockRejectedValueOnce(rejected(422));
  renderPage(api); await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("alert");
  const replacement = new File(["different bytes"], "hamburguesa.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [replacement] } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar entrada" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.createEntry).toHaveBeenLastCalledWith(expect.objectContaining({ imageId: "image-second" }), expect.any(String));
  expect(api.uploadEntryImage).toHaveBeenCalledTimes(2);
});

test.each(["ERR_NETWORK", "ECONNABORTED"])("does not blindly retry creation after uncertain %s", async (code) => {
  const api = repository();
  api.createEntry.mockRejectedValueOnce(new AxiosError("technical failure", code));
  renderPage(api); await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByText(/El servidor pudo haber recibido/);
  expect(screen.getByRole("button", { name: "Guardar entrada" })).toBeDisabled();
  fireEvent.submit(document.querySelector("form")!);
  expect(api.createEntry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("link", { name: /Revisar entradas en otra/ })).toHaveAttribute("target", "_blank");
  fireEvent.click(screen.getByRole("button", { name: /He verificado el resultado/ }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.uploadEntryImage).toHaveBeenCalledTimes(1);
});

test("412 blocks overwriting until current data is reviewed explicitly", async () => {
  const api = repository();
  api.updateEntry.mockRejectedValueOnce(rejected(412));
  api.getEntry.mockResolvedValueOnce(entry).mockResolvedValueOnce({ ...entry, brandName: "Cambio del otro usuario", etag: '"entry-rev-2"' });
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  fireEvent.click(await screen.findByRole("button", { name: "Revisar entrada actual" }));
  expect(await screen.findByText("Cambio del otro usuario")).toBeVisible();
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  fireEvent.submit(document.querySelector("form")!);
  expect(api.updateEntry).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Continuar con mi borrador y versión revisada" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.updateEntry).toHaveBeenLastCalledWith(entry.id, expect.objectContaining({ brandName: "Bowl" }), '"entry-rev-2"');
  expect(api.getEntry).toHaveBeenCalledTimes(2);
});

test("review failure and weak versions preserve the draft, then the user may adopt confirmed data", async () => {
  const api = repository();
  api.updateEntry.mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"));
  api.getEntry.mockResolvedValueOnce(entry).mockRejectedValueOnce(rejected(404))
    .mockResolvedValueOnce({ ...entry, etag: 'W/"rev-2"' })
    .mockResolvedValueOnce({ ...entry, brandName: "Versión vigente", categoryIds: [], etag: '"rev-3"' });
  renderPage(api, "/entries/entry-1/edit"); await screen.findByDisplayValue(entry.brandName);
  await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  fireEvent.click(await screen.findByRole("button", { name: "Revisar entrada actual" }));
  await screen.findByText("Revisa los datos enviados.");
  fireEvent.click(screen.getByRole("button", { name: "Revisar entrada actual" }));
  expect(await screen.findByRole("button", { name: "Usar datos actuales" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Revisar entrada actual" }));
  await screen.findByText("Versión vigente");
  fireEvent.click(screen.getByRole("button", { name: "Usar datos actuales" }));
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Versión vigente");
  expect(screen.getByRole("button", { name: "Reemplazar imagen" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
});

test("a pending review cannot replace the draft with a previously reviewed version", async () => {
  const api = repository();
  const current = pending<MenuEntryDetail>();
  api.updateEntry.mockRejectedValueOnce(rejected(412));
  api.getEntry.mockResolvedValueOnce(entry)
    .mockResolvedValueOnce({ ...entry, brandName: "Primera consulta", etag: '"rev-2"' })
    .mockReturnValueOnce(current.promise);
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  fireEvent.click(await screen.findByRole("button", { name: "Revisar entrada actual" }));
  await screen.findByText("Primera consulta");
  fireEvent.click(screen.getByRole("button", { name: "Revisar entrada actual" }));
  expect(screen.getByRole("button", { name: "Usar datos actuales" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Continuar con mi borrador y versión revisada" })).toBeDisabled();
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  await act(async () => current.resolve({ ...entry, brandName: "Segunda consulta", etag: '"rev-3"' }));
  fireEvent.click(screen.getByRole("button", { name: "Usar datos actuales" }));
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Segunda consulta");
});

test.each([undefined, 'W/"rev-1"'])("an invalid opening version %p requires explicit review before adopting another ETag", async (etag) => {
  const api = repository();
  api.getEntry.mockResolvedValueOnce({ ...entry, etag }).mockResolvedValueOnce({ ...entry, brandName: "Cambio concurrente", etag: '"entry-rev-2"' });
  renderPage(api, "/entries/entry-1/edit"); await screen.findByDisplayValue(entry.brandName);
  fillIdentity();
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  expect(api.getEntry).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Revisar entrada actual" }));
  await screen.findByText("Cambio concurrente");
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  fireEvent.submit(document.querySelector("form")!);
  expect(api.updateEntry).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  fireEvent.click(screen.getByRole("button", { name: "Continuar con mi borrador y versión revisada" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.updateEntry).toHaveBeenCalledWith(entry.id, expect.objectContaining({ brandName: "Bowl" }), '"entry-rev-2"');
  expect(api.getEntry).toHaveBeenCalledTimes(2);
  expect(api.listCategories).toHaveBeenCalledTimes(1);
});

test("file-picker cancellation preserves the previous choice and a broken preview has a fallback", async () => {
  renderPage(repository()); await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [] } });
  expect(screen.getByText("hamburguesa.png")).toBeVisible();
  fireEvent.error(screen.getByRole("img", { name: "Vista previa de la imagen de la entrada" }));
  expect(screen.getByText(/No se pudo mostrar la imagen/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Cambiar imagen" })).toBeVisible();
});

test("the entire image zone activates the single file input", async () => {
  renderPage(repository());
  const input = screen.getByLabelText("Archivo de imagen");
  const click = jest.spyOn(input, "click");
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar imagen" }));
  expect(click).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByText("Cargando categorías…")).not.toBeInTheDocument());
});

test("keyboard focus reveals a field obscured by sticky actions without scrolling visible fields or actions", async () => {
  const api = repository();
  renderPage(api);
  await waitFor(() => expect(screen.queryByText("Cargando categorías…")).not.toBeInTheDocument());
  const frame = jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 0; });
  const scroll = jest.spyOn(window, "scrollBy").mockImplementation(() => {});
  const footer = document.querySelector<HTMLElement>(".entry-form__actions")!;
  jest.spyOn(footer, "getBoundingClientRect").mockReturnValue({ top: 251, height: 69 } as DOMRect);
  const name = screen.getByLabelText("Nombre comercial");
  const description = screen.getByLabelText("Descripción");
  jest.spyOn(name, "getBoundingClientRect").mockReturnValue({ bottom: 137 } as DOMRect);
  const descriptionBounds = jest.spyOn(description, "getBoundingClientRect").mockReturnValue({ top: 174, bottom: 256 } as DOMRect);
  act(() => name.focus());
  expect(scroll).not.toHaveBeenCalled();
  act(() => description.focus());
  expect(scroll).toHaveBeenLastCalledWith({ top: 17, behavior: "instant" });
  scroll.mockClear();
  act(() => screen.getByRole("button", { name: "Cancelar" }).focus());
  expect(scroll).not.toHaveBeenCalled();
  descriptionBounds.mockReturnValue({ top: 100, bottom: 500 } as DOMRect);
  act(() => description.focus());
  expect(scroll).toHaveBeenLastCalledWith({ top: 88, behavior: "instant" });
  frame.mockRestore(); scroll.mockRestore();
});

test("duplicate submits cannot overlap upload or persistence, and navigation is blocked while saving", async () => {
  const api = repository();
  const upload = pending<string>();
  const write = pending<MenuEntryDetail>();
  api.uploadEntryImage.mockReturnValue(upload.promise); api.createEntry.mockReturnValue(write.promise);
  renderPage(api); await chooseValidImage(); fillIdentity();
  fireEvent.submit(document.querySelector("form")!); fireEvent.submit(document.querySelector("form")!);
  expect(await screen.findByRole("button", { name: "Subiendo imagen…" })).toBeDisabled();
  fireEvent.click(screen.getByRole("link", { name: /Volver a entradas/ }));
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  await act(async () => { upload.resolve("uploaded-1"); });
  expect(screen.getByRole("button", { name: "Guardando entrada…" })).toBeDisabled();
  // The local back link remains blocked throughout persistence after the shell brand is removed.
  fireEvent.click(screen.getByRole("link", { name: /Volver a entradas/ }));
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  fireEvent.submit(document.querySelector("form")!);
  await act(async () => { write.resolve(entry); });
  expect(api.uploadEntryImage).toHaveBeenCalledTimes(1); expect(api.createEntry).toHaveBeenCalledTimes(1);
});

test("a failed upload can be retried and an uncertain upload does not start persistence", async () => {
  const api = repository();
  api.uploadEntryImage.mockRejectedValueOnce(rejected(422)).mockRejectedValueOnce(new AxiosError("timeout", "ECONNABORTED")).mockResolvedValue("image-recovered");
  renderPage(api); await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("alert");
  expect(api.createEntry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByText(/El servidor pudo haber recibido/);
  expect(api.createEntry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /He verificado el resultado/ }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.createEntry).toHaveBeenCalledWith(expect.objectContaining({ imageId: "image-recovered" }), expect.any(String));
});

test("a response for an entry abandoned by navigation never replaces the new entry", async () => {
  const api = repository();
  const old = pending<MenuEntryDetail>();
  api.getEntry.mockReturnValueOnce(old.promise).mockResolvedValue({ ...entry, id: "entry-2", brandName: "Entrada siguiente" });
  const harness = createControllableIndexedDbHarness();
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
  function Navigation() {
    const navigate = useNavigate();
    return <><button onClick={() => { void navigate("/entries/entry-2/edit"); }}>Cambiar entrada</button><EntryFormPage repository={api} storage={storage} /></>;
  }
  render(<MemoryRouter initialEntries={["/entries/entry-1/edit"]}><Routes><Route path="/entries/:entryId/edit" element={<Navigation />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Cambiar entrada" }));
  await screen.findByDisplayValue("Entrada siguiente");
  await act(async () => { old.resolve(entry); });
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Entrada siguiente");
});

test("description, required image and pending validation block saving with a localizable error", async () => {
  const api = repository(); renderPage(api);
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Entrada" } });
  fireEvent.submit(document.querySelector("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("Indica una descripción");
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción" } });
  fireEvent.submit(document.querySelector("form")!);
  expect(await screen.findByRole("alert", { name: "Error al guardar entrada" })).toHaveTextContent("Selecciona una imagen");
  const decode = pending<ImageBitmap>();
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: jest.fn().mockReturnValue(decode.promise) });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn().mockReturnValue("blob:pending") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [new File(["image"], "valid.png", { type: "image/png" })] } });
  fireEvent.submit(document.querySelector("form")!);
  expect(await screen.findByRole("alert", { name: "Error al guardar entrada" })).toHaveTextContent("Espera a que termine la validación");
  expect(api.uploadEntryImage).not.toHaveBeenCalled();
  await act(async () => { decode.resolve({ width: 20, height: 20, close: jest.fn() } as unknown as ImageBitmap); });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("invalid replacement blocks the whole update and a late validation cannot reject the newer file", async () => {
  const api = repository(); renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  await chooseValidImage();
  const oldDecode = pending<ImageBitmap>();
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: jest.fn()
    .mockReturnValueOnce(oldDecode.promise)
    .mockResolvedValueOnce({ width: 20, height: 20, close: jest.fn() })
    .mockResolvedValueOnce({ width: 5000, height: 20, close: jest.fn() }) });
  const oldFile = new File(["old"], "old.png", { type: "image/png" });
  const nextFile = new File(["next"], "next.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [oldFile] } });
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [nextFile] } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled());
  await act(async () => { oldDecode.resolve({ width: 5000, height: 20, close: jest.fn() } as unknown as ImageBitmap); });
  expect(screen.queryByText(/no puede superar 4096/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [oldFile] } });
  await screen.findByText(/no puede superar 4096/);
  fireEvent.submit(document.querySelector("form")!);
  expect(api.updateEntry).not.toHaveBeenCalled(); expect(api.uploadEntryImage).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue(entry.brandName);
});

test("an upload completing after leaving V2 does not start a late persistence request", async () => {
  const api = repository(); const upload = pending<string>(); api.uploadEntryImage.mockReturnValue(upload.promise);
  const view = renderPage(api); await chooseValidImage(); fillIdentity();
  fireEvent.submit(document.querySelector("form")!);
  await screen.findByRole("button", { name: "Subiendo imagen…" });
  view.unmount();
  await act(async () => { upload.resolve("late-image"); });
  expect(api.createEntry).not.toHaveBeenCalled();
});

test("pre-send storage failure displays error message and makes 0 HTTP calls", async () => {
  const api = repository();
  const failingStorage: PendingOperationStorageAdapter = {
    saveRecord: jest.fn().mockRejectedValue(new Error("Disk quota exceeded")),
    getRecord: jest.fn().mockResolvedValue(null),
    deleteRecord: jest.fn().mockResolvedValue(undefined),
    listByTab: jest.fn().mockResolvedValue([]),
  };

  renderPage(api, "/entries/new", undefined, failingStorage);
  await screen.findByRole("button", { name: "Guardar entrada" });
  await chooseValidImage();
  fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la operación. Tu borrador se conserva.");
  expect(api.createEntry).not.toHaveBeenCalled();
  expect(api.uploadEntryImage).not.toHaveBeenCalled();
});

test("restores pending draft on mount from storage without any HTTP POST", async () => {
  const api = repository();
  const harness = createControllableIndexedDbHarness();
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });

  const scope = buildEntryCreateScope();
  await storage.saveRecord({
    storageKey: `${scope.tabId}::entry-form::entry-create`,
    scope,
    createdAt: Date.now() - 5000,
    updatedAt: Date.now() - 5000,
    currentStageIndex: 1,
    stages: [
      {
        attemptId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        operationKind: "image.upload",
        method: "POST",
        endpointPath: "/media/images",
        idempotencyKey: "11111111-2222-4333-8444-555555555555",
        payload: {
          kind: "multipart-file",
          fileName: "restored.png",
          mimeType: "image/png",
          byteSize: 100,
          fileBlob: new Blob(["dummy bytes"], { type: "image/png" }),
        },
        createdAt: Date.now() - 5000,
        firstSentAt: Date.now() - 5000,
        firstConfirmedAt: Date.now() - 4000,
        lastAttemptAt: Date.now() - 5000,
        status: "succeeded",
        retryAfterSeconds: null,
        retryAfterUntil: null,
        retryAfterInvalid: false,
        possibleWriteApplied: false,
        lastErrorCode: null,
        lastErrorMessage: null,
        attemptCount: 1,
        submittedDraftVersion: 1,
      },
      {
        attemptId: "ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        operationKind: "entry.create",
        method: "POST",
        endpointPath: "/menu/entries",
        idempotencyKey: "22222222-3333-4444-8555-666666666666",
        payload: {
          kind: "json",
          serializedBody: JSON.stringify({ brandName: "Restored Bowl", description: "Restored Desc", categoryIds: [], imageId: "img-confirmed" }),
          payloadSnapshot: { brandName: "Restored Bowl", description: "Restored Desc", categoryIds: [], imageId: "img-confirmed" },
        },
        createdAt: Date.now() - 4000,
        firstSentAt: Date.now() - 4000,
        firstConfirmedAt: null,
        lastAttemptAt: Date.now() - 4000,
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
    confirmedImageId: "img-confirmed",
    ifMatch: null,
    editableDraft: { brandName: "Restored Bowl", description: "Restored Desc", categoryIds: [] },
    submittedDraftVersion: 1,
    currentDraftVersion: 1,
  });

  renderPage(api, "/entries/new", undefined, storage);
  expect(await screen.findByDisplayValue("Restored Bowl")).toBeVisible();
  expect(screen.getByDisplayValue("Restored Desc")).toBeVisible();
  expect(api.createEntry).not.toHaveBeenCalled();
  expect(api.uploadEntryImage).not.toHaveBeenCalled();
});

test("acceptReview keeping draft when reviewed entry is ARCHIVED sets active draft to INACTIVE", async () => {
  const api = repository();
  api.updateEntry.mockRejectedValueOnce(rejected(412));
  api.getEntry.mockResolvedValueOnce({ ...entry, status: "ACTIVE" })
    .mockResolvedValueOnce({ ...entry, status: "ARCHIVED", etag: '"entry-rev-archived"' });
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  fireEvent.click(await screen.findByRole("button", { name: "Revisar entrada actual" }));
  const continueBtn = await screen.findByRole("button", { name: "Continuar con mi borrador y versión revisada" });
  fireEvent.click(continueBtn);
  expect(screen.getByRole("combobox", { name: "Estado administrativo" })).toHaveValue("INACTIVE");
});

test("rejection of image upload during submit prevents calling createEntry (A07)", async () => {
  const api = repository();
  api.uploadEntryImage.mockRejectedValueOnce(
    new AxiosError("Upload rejected", "ERR_BAD_REQUEST", undefined, {}, {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { error: { message: "Formato de imagen inválido." } },
    }),
  );
  renderPage(api);
  await screen.findByLabelText("Archivo de imagen");
  await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Bowl de pollo" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Pollo con arroz." } });

  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Formato de imagen inválido.");
  expect(api.uploadEntryImage).toHaveBeenCalledTimes(1);
  expect(api.createEntry).not.toHaveBeenCalled();
});

test("HTTP 428 Precondition Required is classified as conflict and enables version review (E01)", async () => {
  const api = repository();
  api.updateEntry.mockRejectedValueOnce(rejected(428));
  api.getEntry
    .mockResolvedValueOnce(entry)
    .mockResolvedValueOnce({ ...entry, brandName: "Cambio concurrente 428", etag: '"entry-rev-428"' });
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Modificación con 428" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  const alert = await screen.findByRole("alert", { name: "Error al guardar entrada" });
  expect(alert).toHaveTextContent("Revisa los datos enviados.");
  expect(within(alert).getByRole("button", { name: "Revisar entrada actual" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Revisar entrada actual" }));
  await screen.findByText("Cambio concurrente 428");
  expect(screen.getByLabelText("Descripción")).toHaveValue("Modificación con 428");

  fireEvent.click(screen.getByRole("button", { name: "Continuar con mi borrador y versión revisada" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByRole("heading", { name: "Catálogo restaurado" });
  expect(api.updateEntry).toHaveBeenLastCalledWith(
    entry.id,
    expect.objectContaining({ description: "Modificación con 428" }),
    '"entry-rev-428"',
  );
});

test("conflict review displays server image URL, reference, or absence alongside draft image (E02)", async () => {
  const api = repository();
  api.updateEntry.mockRejectedValueOnce(rejected(412));
  api.getEntry
    .mockResolvedValueOnce(entry)
    .mockResolvedValueOnce({
      ...entry,
      brandName: "Entrada con imagen remota",
      image: { id: "remote-img-1", url: "https://example.com/remote.png", thumbnailUrl: "https://example.com/remote.png" },
      imageRef: "remote-ref-1",
      etag: '"entry-rev-remote"',
    });

  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  await chooseValidImage();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  fireEvent.click(await screen.findByRole("button", { name: "Revisar entrada actual" }));
  const reviewSection = await screen.findByRole("region", { name: "Datos actuales de la entrada" });
  expect(within(reviewSection).getByText("https://example.com/remote.png")).toBeVisible();
  expect(within(reviewSection).getByRole("img", { name: "Imagen actual de la entrada en el servidor" })).toHaveAttribute("src", "https://example.com/remote.png");
  expect(within(reviewSection).getByText(/Archivo local: hamburguesa\.png/)).toBeVisible();
});

test("conflict review displays 'Sin imagen' when server has no image (E02 absence)", async () => {
  const api = repository();
  api.updateEntry.mockRejectedValueOnce(rejected(412));
  api.getEntry
    .mockResolvedValueOnce({ ...entry, image: null, imageRef: undefined })
    .mockResolvedValueOnce({
      ...entry,
      brandName: "Entrada sin imagen",
      image: null,
      imageRef: undefined,
      etag: '"entry-rev-no-img"',
    });

  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  fireEvent.click(await screen.findByRole("button", { name: "Revisar entrada actual" }));
  const reviewSection = await screen.findByRole("region", { name: "Datos actuales de la entrada" });
  expect(within(reviewSection).getAllByText("Sin imagen")[0]).toBeVisible();
});

test("editing text of an ACTIVE entry does NOT include status in update payload (E03)", async () => {
  const api = repository();
  api.getEntry.mockResolvedValueOnce({ ...entry, status: "ACTIVE" });
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Texto editado sin cambio de estado" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => {
    expect(api.updateEntry).toHaveBeenCalledWith(
      "entry-1",
      expect.not.objectContaining({ status: expect.anything() }),
      '"entry-rev-1"',
    );
  });
  expect(api.updateEntry).toHaveBeenCalledWith(
    "entry-1",
    {
      brandName: "Hamburguesa de la casa",
      description: "Texto editado sin cambio de estado",
      categoryIds: ["category-1"],
    },
    '"entry-rev-1"',
  );
});

test("transitioning an entry to ACTIVE sends status: ACTIVE, and server rejection preserves draft and confirmed status (E03)", async () => {
  const api = repository();
  api.getEntry.mockResolvedValueOnce({ ...entry, status: "INACTIVE" });
  api.updateEntry.mockRejectedValueOnce(
    new AxiosError("Activation rejected", "ERR_BAD_REQUEST", undefined, {}, {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { error: { message: "No se puede activar: no tiene ofertas activas asociadas." } },
    }),
  );
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue(entry.brandName);
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "ACTIVE" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => {
    expect(api.updateEntry).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({ status: "ACTIVE" }),
      '"entry-rev-1"',
    );
  });
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("No se puede activar: no tiene ofertas activas asociadas.");
  expect(screen.getByRole("combobox", { name: "Estado administrativo" })).toHaveValue("ACTIVE");
});

test("onSaved failure after successful creation does not mark write uncertain or allow a second createEntry (E04)", async () => {
  const api = repository();
  const harness = createControllableIndexedDbHarness();
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
  const onSaved = jest.fn().mockRejectedValue(new Error("Callback navigation failed"));

  renderPage(api, "/entries/new", undefined, storage, onSaved);

  await screen.findByLabelText("Archivo de imagen");
  await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Bowl único" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción única" } });

  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));

  await waitFor(() => expect(api.createEntry).toHaveBeenCalledTimes(1));
  expect(onSaved).toHaveBeenCalledTimes(1);

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText(/El servidor pudo haber recibido/)).not.toBeInTheDocument();

  expect(screen.getByRole("button", { name: "Guardar entrada" })).toBeDisabled();

  fireEvent.submit(document.querySelector("form")!);
  expect(api.createEntry).toHaveBeenCalledTimes(1);
});

test("a confirmed creation survives reload after navigation failure and never restores a new POST", async () => {
  const api = repository();
  const harness = createControllableIndexedDbHarness();
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: harness.factory });
  const onSaved = jest.fn().mockRejectedValue(new Error("Navigation failed"));
  const view = renderPage(api, "/entries/new", undefined, storage, onSaved);
  await chooseValidImage(); fillIdentity();
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));
  await screen.findByRole("button", { name: "Volver al listado" });
  expect(onSaved).toHaveBeenCalledTimes(1);
  const confirmed = await storage.getRecord(buildEntryCreateScope());
  expect(confirmed?.confirmedResult).toMatchObject({ id: entry.id });
  expect(confirmed?.stages.at(-1)?.status).toBe("succeeded");
  view.unmount();
  renderPage(api, "/entries/new", undefined, storage, onSaved);
  await screen.findByRole("button", { name: "Volver al listado" });
  fireEvent.submit(document.querySelector("form")!);
  expect(api.createEntry).toHaveBeenCalledTimes(1);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Nombre comercial")).toBeDisabled();
  expect(screen.queryByText(/El servidor pudo haber recibido/)).not.toBeInTheDocument();
  expect((await storage.getRecord(buildEntryCreateScope()))?.stages.at(-1)?.idempotencyKey).toBe(confirmed?.stages.at(-1)?.idempotencyKey);
});
