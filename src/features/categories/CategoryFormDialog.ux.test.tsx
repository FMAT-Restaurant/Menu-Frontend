import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CategoryFormDialog, type CategoryDialogRepository } from "./CategoryFormDialog";
import { createControllableIndexedDbHarness, createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";

function mount(editing = false) {
  const category = { id: "cat-ux05", name: "Postres", description: "Para compartir" };
  const repository: jest.Mocked<CategoryDialogRepository> = {
    getCategory: jest.fn().mockResolvedValue({ data: category, etag: '"ux05-v1"' }),
    createCategory: jest.fn().mockImplementation(async draft => ({ id: category.id, ...draft })),
    updateCategory: jest.fn().mockImplementation(async (id, draft) => ({ id, ...draft })),
  };
  const harness = createControllableIndexedDbHarness();
  const onCreated = jest.fn();
  const onUpdated = jest.fn();
  render(<CategoryFormDialog category={editing ? category : undefined} repository={repository}
    storage={createIndexedDbPendingOperationStorage({ idbFactory: harness.factory })}
    onClose={jest.fn()} onCreated={onCreated} onCreatedWithPendingEdits={jest.fn()} onUpdated={onUpdated} />);
  return { repository, onCreated, onUpdated };
}

test("a blank name keeps an associated inline error and draft, then a correction permits one valid create", async () => {
  const { repository, onCreated } = mount();
  const name = screen.getByRole("textbox", { name: "Nombre" });
  const description = screen.getByRole("textbox", { name: "Descripción" });
  expect(screen.getByText("Obligatorio. Hasta 255 caracteres.")).toBeVisible();
  expect(screen.getByText("Opcional. Hasta 255 caracteres.")).toBeVisible();
  fireEvent.change(description, { target: { value: "Borrador que se conserva" } });
  fireEvent.change(name, { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar categoría" }));
  expect(name).toHaveAttribute("aria-invalid", "true");
  expect(name).toHaveAttribute("aria-describedby", "category-name-hint category-name-error");
  expect(screen.getByText("Indica el nombre de la categoría.")).toHaveAttribute("id", "category-name-error");
  expect(name).toHaveFocus();
  expect(description).toHaveValue("Borrador que se conserva");
  expect(repository.createCategory).not.toHaveBeenCalled();
  expect(repository.updateCategory).not.toHaveBeenCalled();
  description.focus();
  fireEvent.click(screen.getByRole("button", { name: "Ir al nombre" }));
  expect(name).toHaveFocus();
  fireEvent.change(name, { target: { value: "Postres" } });
  expect(name).toHaveAttribute("aria-invalid", "false");
  expect(screen.queryByText("Indica el nombre de la categoría.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Guardar categoría" }));
  await waitFor(() => expect(onCreated).toHaveBeenCalled());
  expect(repository.createCategory).toHaveBeenCalledTimes(1);
  expect(repository.createCategory).toHaveBeenCalledWith({ name: "Postres", description: "Borrador que se conserva" }, expect.any(String));
});

test("an invalid edit cannot update the resource and correction retains the opening version", async () => {
  const { repository, onUpdated } = mount(true);
  await waitFor(() => expect(repository.getCategory).toHaveBeenCalledTimes(1));
  const name = screen.getByRole("textbox", { name: "Nombre" });
  fireEvent.change(name, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(name).toHaveAttribute("aria-invalid", "true");
  expect(repository.updateCategory).not.toHaveBeenCalled();
  fireEvent.change(name, { target: { value: "Postres editados" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(onUpdated).toHaveBeenCalled());
  expect(repository.updateCategory).toHaveBeenCalledWith("cat-ux05", { name: "Postres editados", description: "Para compartir" }, '"ux05-v1"');
});

test("a retry after an uncertain create preserves the sealed valid payload even when the editable name is blank", async () => {
  const { repository } = mount();
  repository.createCategory.mockRejectedValueOnce({ isTimeout: true, message: "Timeout" });
  const name = screen.getByRole("textbox", { name: "Nombre" });
  fireEvent.change(name, { target: { value: "Nombre enviado" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar categoría" }));
  const retry = await screen.findByRole("button", { name: "Reintentar" });
  expect(screen.getByRole("alert")).toHaveTextContent("Timeout");
  fireEvent.change(name, { target: { value: "" } });
  fireEvent.click(retry);
  await waitFor(() => expect(repository.createCategory).toHaveBeenCalledTimes(2));
  expect(repository.createCategory.mock.calls[1]).toEqual(repository.createCategory.mock.calls[0]);
  expect(name).toHaveValue("");
  expect(screen.queryByText("Indica el nombre de la categoría.")).not.toBeInTheDocument();
});
