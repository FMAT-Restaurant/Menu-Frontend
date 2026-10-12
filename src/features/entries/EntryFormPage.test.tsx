import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { MenuEntryDetail, MenuRepository } from "../../application/catalog";
import { EntryFormPage } from "./EntryFormPage";

const categories = [
  { id: "category-1", name: "Principales", entryCount: 2 },
  { id: "category-2", name: "Especialidades", entryCount: 1 },
];

const entry: MenuEntryDetail = {
  id: "entry-1",
  brandName: "Hamburguesa de la casa",
  description: "Con queso y verduras frescas.",
  status: "INACTIVE",
  imageRef: "img-current",
  categoryIds: ["category-1"],
};

function repository(): jest.Mocked<MenuRepository> {
  return {
    listEntries: jest.fn(),
    listCategories: jest.fn().mockResolvedValue(categories),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    setEntryStatus: jest.fn(),
    deleteArchivedEntry: jest.fn(),
    getEntry: jest.fn().mockResolvedValue(entry),
    createEntry: jest.fn().mockResolvedValue(entry),
    updateEntry: jest.fn().mockResolvedValue(entry),
    listOffers: jest.fn(),
    setOfferStatus: jest.fn(),
    deleteInactiveOffer: jest.fn(),
  };
}

function renderPage(api: MenuRepository, path = "/entries/new", state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/entries/new" element={<EntryFormPage repository={api} />} />
        <Route path="/entries/:entryId/edit" element={<EntryFormPage repository={api} />} />
        <Route path="/" element={<CatalogDestination />} />
      </Routes>
    </MemoryRouter>,
  );
}

function CatalogDestination() {
  const location = useLocation();
  return <h1>Catálogo restaurado {location.search}</h1>;
}

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
  fireEvent.change(screen.getByLabelText(/Seleccionar imagen|Reemplazar imagen/), { target: { files: [file] } });
  await screen.findByRole("img", { name: "Vista previa de la imagen de la entrada" });
  await waitFor(() => expect(screen.getByRole("button", { name: /Guardar/ })).not.toBeDisabled());
  return file;
}

test("creates an entry inactive with one image and multiple optional categories", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByLabelText(/Seleccionar imagen|Reemplazar imagen/);
  const created = await chooseValidImage();

  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "  Bowl de pollo  " } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Pollo con arroz." } });
  fireEvent.click(await screen.findByLabelText("Principales"));
  fireEvent.click(screen.getByLabelText("Especialidades"));
  expect(screen.getByRole("combobox", { name: "Estado administrativo" })).toHaveValue("INACTIVE");
  expect(screen.getByRole("combobox", { name: "Estado administrativo" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Guardar entrada" }));

  await waitFor(() => expect(api.createEntry).toHaveBeenCalledWith({
    brandName: "Bowl de pollo",
    description: "Pollo con arroz.",
    categoryIds: ["category-1", "category-2"],
  }, created));
  expect(await screen.findByRole("heading", { name: "Catálogo restaurado" })).toBeVisible();
  expect(api.getEntry).not.toHaveBeenCalled();
});

test("allows creating an entry without selecting categories", async () => {
  const api = repository();
  renderPage(api);
  await screen.findByLabelText("Seleccionar imagen");
  const image = await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Sopa del día" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Preparada cada mañana." } });
  fireEvent.click(await screen.findByRole("button", { name: "Guardar entrada" }));

  await waitFor(() => expect(api.createEntry).toHaveBeenCalledWith({
    brandName: "Sopa del día",
    description: "Preparada cada mañana.",
    categoryIds: [],
  }, image));
});

test("loads an entry for editing and keeps its current image when no replacement is selected", async () => {
  const api = repository();
  renderPage(api, "/entries/entry-1/edit", { returnTo: "/?q=pollo" });

  expect(await screen.findByDisplayValue("Hamburguesa de la casa")).toBeVisible();
  expect(screen.getByText(/Imagen actual conservada.*img-current/)).toBeVisible();
  expect(screen.getByLabelText("Principales")).toBeChecked();
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción actualizada." } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => expect(api.updateEntry).toHaveBeenCalledWith("entry-1", {
    brandName: "Hamburguesa de la casa",
    description: "Descripción actualizada.",
    categoryIds: ["category-1"],
    status: "INACTIVE",
  }, undefined));
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
  }), replacement));
});

test("rejects invalid images without calling create or changing the entry", async () => {
  const api = repository();
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: jest.fn().mockResolvedValue({ width: 5000, height: 600, close: jest.fn() }),
  });
  renderPage(api);
  await screen.findByLabelText("Seleccionar imagen");
  const file = new File(["image bytes"], "too-wide.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText(/Seleccionar imagen|Reemplazar imagen/), { target: { files: [file] } });

  expect(await screen.findByText("La imagen no puede superar 4096 × 4096 px.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Guardar entrada" })).toBeDisabled();
  expect(api.createEntry).not.toHaveBeenCalled();
});

test("keeps the form open and its values when the server rejects a save", async () => {
  const api = repository();
  api.createEntry.mockRejectedValue(new Error("La categoría no pertenece al menú."));
  renderPage(api);
  await screen.findByLabelText("Seleccionar imagen");
  const image = await chooseValidImage();
  fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "Bowl de pollo" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Pollo con arroz." } });
  fireEvent.click(await screen.findByRole("button", { name: "Guardar entrada" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("La categoría no pertenece al menú.");
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl de pollo");
  expect(api.createEntry).toHaveBeenCalledWith({ brandName: "Bowl de pollo", description: "Pollo con arroz.", categoryIds: [] }, image);
});

test("cancel discards the draft and returns to the catalog filters", async () => {
  const api = repository();
  renderPage(api, "/entries/new", { returnTo: "/?status=ARCHIVED" });
  await screen.findByRole("button", { name: "Guardar entrada" });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

  expect(await screen.findByRole("heading", { name: "Catálogo restaurado ?status=ARCHIVED" })).toBeVisible();
  expect(api.createEntry).not.toHaveBeenCalled();
});

test("unarchiving sets INACTIVE and requires a later explicit activation", async () => {
  const api = repository();
  api.getEntry.mockResolvedValue({ ...entry, status: "ARCHIVED" });
  renderPage(api, "/entries/entry-1/edit");
  await screen.findByDisplayValue("Hamburguesa de la casa");
  fireEvent.change(screen.getByRole("combobox", { name: "Estado administrativo" }), { target: { value: "INACTIVE" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await waitFor(() => expect(api.updateEntry).toHaveBeenCalledWith("entry-1", expect.objectContaining({ status: "INACTIVE" }), undefined));
  expect(screen.getByText(/actívala después de forma expresa/)).toBeVisible();
});

test("retries loading the entry and its categories after an API error", async () => {
  const api = repository();
  api.getEntry.mockRejectedValueOnce(new Error("Temporary failure"));
  renderPage(api, "/entries/entry-1/edit");

  fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

  expect(await screen.findByDisplayValue("Hamburguesa de la casa")).toBeVisible();
  expect(api.getEntry).toHaveBeenCalledTimes(2);
  expect(api.listCategories).toHaveBeenCalledTimes(2);
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

  expect(await screen.findByRole("alert")).toHaveTextContent("Datos inválidos. Categoría ajena al menú.");
  expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bowl");
  expect(api.createEntry).toHaveBeenCalledWith({ brandName: "Bowl", description: "Con arroz", categoryIds: [] }, image);
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

  expect(await screen.findByRole("checkbox", { name: "Categoría ya asignada (category-1)" })).toBeChecked();
  expect(screen.getByText(/puedes retirar las asignaciones anteriores/)).toBeVisible();
});
