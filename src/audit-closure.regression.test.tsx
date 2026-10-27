import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CategoryFormDialog, type CategoryDialogRepository } from "./features/categories/CategoryFormDialog";
import { OptionModal } from "./features/offers/OptionModal";
import type { MenuCategory, VersionedResource } from "./application/catalog";
import { createControllableIndexedDbHarness, createIndexedDbPendingOperationStorage } from "./shared/pendingOperationStorage";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { OfferFormPage, buildOfferUpdateScope, type OfferFormDraftState } from "./features/offers/OfferFormPage";
import { createOperationAttemptController, IDEMPOTENT_WINDOW_MS, sealJsonPayload } from "./application/operationAttempt";
import { analyzeIdempotentAttemptError } from "./api/idempotencyResponse";

test("A01/A09: editing while category opening GET is pending requires explicit review before using its ETag", async () => {
  let resolveOpening!: (resource: VersionedResource<MenuCategory>) => void;
  const response = new Promise<VersionedResource<MenuCategory>>(resolve => { resolveOpening = resolve; });
  const repository: jest.Mocked<CategoryDialogRepository> = { getCategory: jest.fn().mockReturnValue(response),
    createCategory: jest.fn(), updateCategory: jest.fn().mockResolvedValue({ id: "c1", name: "Local", description: "Remota" }) };
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: createControllableIndexedDbHarness().factory });
  render(<CategoryFormDialog category={{ id: "c1", name: "Original", description: "Anterior" }} repository={repository} storage={storage}
    onClose={jest.fn()} onCreated={jest.fn()} onCreatedWithPendingEdits={jest.fn()} onUpdated={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Local" } });
  await act(async () => { resolveOpening({ data: { id: "c1", name: "Remoto", description: "Remota" }, etag: '"v2"' }); });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(repository.updateCategory).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Nombre")).toHaveValue("Local");
  await waitFor(() => expect(screen.getByRole("button", { name: /Revisar categoría actual/ })).toBeVisible());
});

test("O10/O21: an existing recipe may keep its assignment without recipeId, a new one cannot save", () => {
  const onSave = jest.fn();
  const props = { isOpen: true, slotName: "Principal", onSave, onClose: jest.fn(), onOpenRecipePicker: jest.fn() };
  const { rerender } = render(<OptionModal {...props} initialData={{ sourceType: "RECIPE", optionId: "option-1", displayName: "Nombre nuevo", status: "ACTIVE" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ optionId: "option-1", displayName: "Nombre nuevo" }));
  rerender(<OptionModal {...props} initialData={{ sourceType: "RECIPE", displayName: "Nueva incompleta", status: "ACTIVE" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Debes elegir una receta");
  expect(onSave).toHaveBeenCalledTimes(1);
});

test("O11: restoring an uncertain offer must still reject an entry/offer ownership mismatch", async () => {
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: createControllableIndexedDbHarness().factory });
  const controller = createOperationAttemptController<OfferFormDraftState, never>({ scope: buildOfferUpdateScope("offer-1"), storage,
    initialDraft: { presentationTag: "Pendiente", basePrice: "10", desiredStatus: "INACTIVE", slots: [] },
    buildFinalStageInput: ({ submittedDraftVersion, now }) => ({ operationKind: "offer.patch", method: "PATCH", endpointPath: "/menu/offers/offer-1",
      payload: sealJsonPayload({ presentationTag: "Pendiente" }, '"v1"'), submittedDraftVersion, now }),
    executeFinalStage: async () => { throw Object.assign(new Error("timeout"), { code: "ECONNABORTED" }); },
    classifyError: (error, attempt) => analyzeIdempotentAttemptError(error, attempt.operationKind),
  });
  await controller.submit();
  const offer = { id: "offer-1", entryId: "real-parent", presentationTag: "Servidor", basePrice: 10, status: "INACTIVE" as const,
    image: null, composition: { slots: [] } };
  let resolveOffer!: (value: VersionedResource<typeof offer>) => void;
  const offerRead = new Promise<VersionedResource<typeof offer>>(resolve => { resolveOffer = resolve; });
  const getRecord = jest.spyOn(storage, "getRecord");
  const repository = { getEntry: jest.fn().mockResolvedValue({ id: "wrong-parent", brandName: "Ajena", description: "D", status: "ACTIVE", categoryIds: [] }),
    getOffer: jest.fn().mockReturnValue(offerRead),
    uploadEntryImage: jest.fn(), uploadImage: jest.fn(), createOffer: jest.fn(), updateOffer: jest.fn(), listRecipes: jest.fn(), getRecipe: jest.fn(),
    createRecipe: jest.fn(), updateRecipe: jest.fn(), deleteRecipe: jest.fn(), listInventoryItems: jest.fn() };
  render(<MemoryRouter initialEntries={["/entries/wrong-parent/offers/offer-1/edit"]}><Routes>
    <Route path="/entries/:entryId/offers/:offerId/edit" element={<OfferFormPage repository={repository} storage={storage} />} />
  </Routes></MemoryRouter>);
  await waitFor(() => expect(getRecord).toHaveBeenCalledWith(controller.getRecord()!.storageKey));
  await act(async () => { await Promise.all(getRecord.mock.results.map(result => result.value)); });
  await act(async () => { resolveOffer({ data: offer, etag: '"v2"' }); });
  expect(await screen.findByText("La oferta no pertenece a la entrada seleccionada.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Guardar Oferta" })).not.toBeInTheDocument();
  expect(repository.updateOffer).not.toHaveBeenCalled();
  expect(repository.createOffer).not.toHaveBeenCalled();
});

test("24h: an expired offer PATCH requires review and explicit adoption before a new key can write", async () => {
  const storage = createIndexedDbPendingOperationStorage({ idbFactory: createControllableIndexedDbHarness().factory });
  const slots: OfferFormDraftState["slots"] = [{ localId: "local-slot", slotId: "slot-1", name: "Principal", quantity: 1, course: null,
    options: [{ localId: "local-option", optionId: "option-1", displayName: "Receta", status: "ACTIVE", sourceType: "RECIPE",
      originalSourceType: "RECIPE", recipeId: "recipe-1" }] }];
  const controller = createOperationAttemptController<OfferFormDraftState, never>({ scope: buildOfferUpdateScope("offer-1"), storage,
    now: () => Date.now() - IDEMPOTENT_WINDOW_MS - 1000,
    initialDraft: { presentationTag: "Mi borrador", basePrice: "10", desiredStatus: "INACTIVE", slots },
    buildFinalStageInput: ({ submittedDraftVersion, now }) => ({ operationKind: "offer.patch", method: "PATCH", endpointPath: "/menu/offers/offer-1",
      payload: sealJsonPayload({ presentationTag: "Mi borrador" }, '"v1"'), submittedDraftVersion, now }),
    executeFinalStage: async () => { throw Object.assign(new Error("timeout"), { code: "ECONNABORTED" }); },
    classifyError: (error, attempt) => analyzeIdempotentAttemptError(error, attempt.operationKind),
  });
  await controller.submit();
  const originalKey = controller.getCurrentAttempt()!.idempotencyKey;
  const offer = { id: "offer-1", entryId: "entry-1", presentationTag: "Remota", basePrice: 10, status: "INACTIVE" as const,
    image: null, composition: { slots: [{ ...slots[0], options: [{ optionId: "option-1", displayName: "Receta", status: "ACTIVE" as const,
      sourceType: "RECIPE" as const, recipeId: "recipe-1" }] }] } };
  const repository = { getEntry: jest.fn().mockResolvedValue({ id: "entry-1", brandName: "Entrada", description: "D", status: "ACTIVE", categoryIds: [] }),
    getOffer: jest.fn().mockResolvedValue({ data: offer, etag: '"v2"' }),
    uploadEntryImage: jest.fn(), uploadImage: jest.fn(), createOffer: jest.fn(), updateOffer: jest.fn().mockResolvedValue({ ...offer, etag: '"v3"' }),
    listRecipes: jest.fn(), getRecipe: jest.fn(), createRecipe: jest.fn(), updateRecipe: jest.fn(), deleteRecipe: jest.fn(), listInventoryItems: jest.fn() };
  render(<MemoryRouter initialEntries={["/entries/entry-1/offers/offer-1/edit"]}><Routes>
    <Route path="/entries/:entryId/offers/:offerId/edit" element={<OfferFormPage repository={repository} storage={storage} />} />
    <Route path="/entries/entry-1/offers" element={<h1>Ofertas</h1>} />
  </Routes></MemoryRouter>);
  const review = await screen.findByRole("button", { name: "Revisar oferta actual" });
  expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Guardar Oferta" })).toBeDisabled();
  fireEvent.submit(screen.getByRole("button", { name: "Guardar Oferta" }).closest("form")!);
  expect(screen.getByLabelText("Etiqueta de presentación (opcional)")).toHaveValue("Mi borrador");
  expect(repository.updateOffer).not.toHaveBeenCalled();
  fireEvent.click(review);
  const adopt = await screen.findByRole("button", { name: "Adoptar versión del servidor" });
  expect(repository.updateOffer).not.toHaveBeenCalled();
  fireEvent.click(adopt);
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Oferta" })).toBeEnabled());
  expect(repository.updateOffer).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Etiqueta de presentación (opcional)")).toHaveValue("Mi borrador");
  fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
  await waitFor(() => expect(repository.updateOffer).toHaveBeenCalledTimes(1));
  expect(repository.updateOffer.mock.calls[0][2]).toBe('"v2"');
  expect(repository.updateOffer.mock.calls[0][3]).not.toBe(originalKey);
  expect(repository.updateOffer.mock.calls[0][1]).toMatchObject({ presentationTag: "Mi borrador" });
});
