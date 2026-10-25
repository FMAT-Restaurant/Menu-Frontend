import { useRef, useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OptionModal, type OptionDraft } from "../offers/OptionModal";
import { createControllableIndexedDbHarness, createIndexedDbPendingOperationStorage } from "../../shared/pendingOperationStorage";
import type { PendingOperationStorageAdapter } from "../../application/operationAttempt";
import type { RecipeDraft } from "../../application/catalog";
import { RecipeSelectionTask, type RecipeSelectionTaskHandle } from "./RecipeSelectionTask";
import type { RecipeRepository } from "./RecipePage";
import { buildRecipeCreateScope } from "./RecipeFormContent";

const item = { id: "i1", name: "Harina", unit: "kg" };
const recipe = { id: "r1", name: "Pan", description: "Descripción", instructions: "Hornear", supplies: [{ inventoryItemId: "i1", quantity: 1, inventoryItem: item }], etag: '"r1-v1"' };
const option: OptionDraft = { localId: "option-local", optionId: "option-server", displayName: "Etiqueta propia", status: "INACTIVE", sourceType: "RECIPE", recipeId: "old", recipeName: "Anterior", originalSourceType: "RECIPE" };
function repository(): jest.Mocked<RecipeRepository> {
  return {
    listRecipes: jest.fn().mockImplementation(async query => ({ data: query?.q === "sin coincidencias" ? [] : [recipe], meta: { page: query?.page ?? 1, totalPages: 2, pageSize: 50, total: 51 } })),
    listInventoryItems: jest.fn().mockResolvedValue({ data: [item], meta: { page: 1, totalPages: 1, pageSize: 50, total: 1 } }),
    getRecipe: jest.fn().mockResolvedValue({ data: recipe, etag: '"r1-v1"' }),
    createRecipe: jest.fn().mockResolvedValue(recipe), updateRecipe: jest.fn().mockResolvedValue({ ...recipe, name: "Cambio posterior" }), deleteRecipe: jest.fn(),
  };
}
function storage() { return createIndexedDbPendingOperationStorage({ idbFactory: createControllableIndexedDbHarness().factory }); }
function Task({ repo, store, onSelect = jest.fn(), onSave = jest.fn() }: { repo: RecipeRepository; store: PendingOperationStorageAdapter; onSelect?: jest.Mock; onSave?: jest.Mock }) {
  const [draft, setDraft] = useState(option);
  const [active, setActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const taskRef = useRef<RecipeSelectionTaskHandle>(null);
  return <OptionModal isOpen slotName="Principal" initialData={draft} isNestedPickerOpen={active} recipeStep={creating}
    onNestedBack={() => taskRef.current?.back()} hasNestedChanges={() => taskRef.current?.hasChanges() ?? false} onDiscardNested={() => taskRef.current?.discard()} onSave={onSave} onClose={jest.fn()} onOpenRecipePicker={() => setActive(true)} onChangeDraft={setDraft}>
    <RecipeSelectionTask taskRef={taskRef} repository={repo} storage={store} active={active} slotName="Principal"
      nestedContext={{ entryId: "entry", offerId: "offer", targetSlotIndex: 0, editingOptionIndex: 0, currentOptionDraft: draft }}
      onStepChange={setCreating} onBack={() => setActive(false)} onSelect={selected => { onSelect(selected); setDraft(value => ({ ...value, recipeId: selected.id, recipeName: selected.name })); setActive(false); }} />
  </OptionModal>;
}
async function openCreate() {
  const create = await screen.findByRole("button", { name: "+ Nueva receta" });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  await screen.findByRole("option", { name: "Harina" });
}
function fillRecipe() {
  fireEvent.change(screen.getByLabelText("Nombre", { exact: true }), { target: { value: "Pan" } });
  fireEvent.change(screen.getByLabelText("Descripción", { exact: true }), { target: { value: "Descripción" } });
  fireEvent.change(screen.getByLabelText("Instrucciones", { exact: true }), { target: { value: "Hornear" } });
  fireEvent.change(screen.getByLabelText("Insumo 1", { exact: true }), { target: { value: "i1" } });
}
function cancel() { fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true })); }

test("one dialog keeps option identity, query/page and recipe draft through back/continue, then assigns exactly once", async () => {
  const repo = repository(); const store = storage(); const selected = jest.fn();
  render(<Task repo={repo} store={store} onSelect={selected} />);
  await screen.findByRole("heading", { name: "Pan" });
  const dialog = screen.getByRole("dialog");
  fireEvent.change(screen.getByLabelText("Buscar recetas"), { target: { value: "pan" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));
  await waitFor(() => expect(repo.listRecipes).toHaveBeenLastCalledWith({ q: "pan", page: 1, pageSize: 50 }, expect.any(AbortSignal)));
  fireEvent.click(await screen.findByRole("button", { name: "Siguiente página" }));
  await waitFor(() => expect(repo.listRecipes).toHaveBeenLastCalledWith({ q: "pan", page: 2, pageSize: 50 }, expect.any(AbortSignal)));
  await openCreate(); fillRecipe();
  expect(screen.getAllByRole("dialog")).toEqual([dialog]);
  cancel();
  expect(screen.getByRole("button", { name: "Seguir editando receta" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando receta" }));
  expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("Pan");
  cancel(); fireEvent.click(screen.getByRole("button", { name: "Conservar borrador y volver" }));
  expect(screen.getByLabelText("Buscar recetas")).toHaveValue("pan");
  expect(screen.getByText("Página 2 de 2")).toBeVisible();
  expect(screen.getByRole("button", { name: "+ Nueva receta" })).toHaveFocus();
  expect(repo.createRecipe).not.toHaveBeenCalled();
  await openCreate();
  expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("Pan");
  fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
  await waitFor(() => expect(selected).toHaveBeenCalledTimes(1));
  expect(repo.createRecipe).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Nombre mostrado (opcional)")).toHaveValue("Etiqueta propia");
  expect(screen.getByLabelText("Inactiva")).toBeChecked();
  expect(screen.getAllByRole("dialog")).toEqual([dialog]);
  expect(screen.getByRole("button", { name: /Elegir receta/ })).toHaveFocus();
});

test("uncertain creation survives remount without POST and retries sealed payload/key before preserving later edits as a versioned update", async () => {
  const repo = repository(); const store = storage(); const selected = jest.fn();
  repo.createRecipe.mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "ECONNABORTED" }));
  const view = render(<Task repo={repo} store={store} onSelect={selected} />);
  await openCreate(); fillRecipe();
  fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
  await screen.findByRole("button", { name: "Reintentar" });
  const first = repo.createRecipe.mock.calls[0];
  fireEvent.change(screen.getByLabelText("Nombre", { exact: true }), { target: { value: "Cambio posterior" } });
  cancel();
  expect(screen.getByRole("dialog", { name: "Nueva receta" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Conservar borrador y volver" })).not.toBeInTheDocument();
  await waitFor(async () => expect((await store.getRecord<unknown>(buildRecipeCreateScope()))?.editableDraft).toMatchObject({ name: "Cambio posterior" }));
  view.unmount();
  render(<Task repo={repo} store={store} onSelect={selected} />);
  const retry = await screen.findByRole("button", { name: "Reintentar" });
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("Cambio posterior");
  expect(repo.createRecipe).toHaveBeenCalledTimes(1);
  fireEvent.click(retry);
  await screen.findByRole("button", { name: "Guardar cambios" });
  expect(repo.createRecipe).toHaveBeenCalledTimes(2);
  expect(repo.createRecipe.mock.calls[1]).toEqual(first);
  expect(selected).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("Cambio posterior");
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(selected).toHaveBeenCalledTimes(1));
  expect(repo.updateRecipe).toHaveBeenCalledWith("r1", expect.objectContaining({ name: "Cambio posterior" }), '"r1-v1"');
});

test("clearing no-match search restores results and focus without opening another layer", async () => {
  render(<Task repo={repository()} store={storage()} />);
  await screen.findByRole("heading", { name: "Pan" });
  fireEvent.change(screen.getByLabelText("Buscar recetas"), { target: { value: "sin coincidencias" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));
  fireEvent.click(await screen.findByRole("button", { name: "Limpiar búsqueda" }));
  expect(screen.getByLabelText("Buscar recetas")).toHaveFocus();
  expect(await screen.findByRole("heading", { name: "Pan" })).toBeVisible();
  expect(within(screen.getByRole("dialog")).queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
});

test("an expired creation with a possible applied write cannot discard its recovery or leave the recipe step", async () => {
  const repo = repository(); const store = storage();
  repo.createRecipe.mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "ECONNABORTED" }));
  const view = render(<Task repo={repo} store={store} />);
  await openCreate(); fillRecipe();
  fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
  await screen.findByRole("button", { name: "Reintentar" });
  const pending = await store.getRecord<RecipeDraft>(buildRecipeCreateScope());
  expect(pending).not.toBeNull();
  view.unmount();
  await store.saveRecord({ ...pending!, stages: pending!.stages.map((stage, index) => index === pending!.currentStageIndex
    ? { ...stage, status: "expired" as const, possibleWriteApplied: true } : stage) });
  render(<Task repo={repo} store={store} />);
  await waitFor(() => expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("Pan"));
  await screen.findByRole("dialog", { name: "Nueva receta" });
  cancel();
  fireEvent.keyDown(screen.getByLabelText("Nombre", { exact: true }), { key: "Escape" });
  expect(screen.getByRole("dialog", { name: "Nueva receta" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Descartar cambios" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Conservar borrador y volver" })).not.toBeInTheDocument();
  const retained = await store.getRecord<RecipeDraft>(buildRecipeCreateScope());
  expect(retained?.stages[retained.currentStageIndex].idempotencyKey).toBe(pending!.stages[pending!.currentStageIndex].idempotencyKey);
  expect(repo.createRecipe).toHaveBeenCalledTimes(1);
});

test("saving an option requires an explicit decision for its preserved recipe draft", async () => {
  const repo = repository(); const saved = jest.fn();
  render(<Task repo={repo} store={storage()} onSave={saved} />);
  await openCreate(); fillRecipe();
  cancel(); fireEvent.click(screen.getByRole("button", { name: "Conservar borrador y volver" }));
  fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
  expect(saved).not.toHaveBeenCalled();
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
  expect(screen.getByRole("button", { name: "Guardar opción" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
  await openCreate();
  expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("Pan");
  cancel(); fireEvent.click(screen.getByRole("button", { name: "Conservar borrador y volver" }));
  cancel();
  fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
  fireEvent.click(screen.getByRole("button", { name: "Descartar receta y guardar opción" }));
  expect(saved).toHaveBeenCalledTimes(1);
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ localId: "option-local", displayName: "Etiqueta propia", status: "INACTIVE", recipeId: "r1" }));
  expect(repo.createRecipe).not.toHaveBeenCalled();
});

test("local Escape handles repeated steps before the browser requests a native close", async () => {
  const repo = repository();
  render(<Task repo={repo} store={storage()} />);
  await openCreate(); fillRecipe();
  const dialog = screen.getByRole("dialog");
  const escape = () => fireEvent.keyDown(document.activeElement ?? dialog, { key: "Escape", cancelable: true });
  expect(escape()).toBe(false);
  expect(screen.getByRole("button", { name: "Seguir editando receta" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Conservar borrador y volver" }));
  expect(escape()).toBe(false);
  expect(screen.getByRole("button", { name: /Elegir receta/ })).toHaveFocus();
  expect(dialog).toHaveAttribute("open");
  expect(screen.getByLabelText("Nombre mostrado (opcional)")).toHaveValue("Etiqueta propia");
  expect(escape()).toBe(false);
  expect(screen.getByRole("button", { name: "Seguir editando" })).toHaveFocus();
  expect(repo.createRecipe).not.toHaveBeenCalled();
});
