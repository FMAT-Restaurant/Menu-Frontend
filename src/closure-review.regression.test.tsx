import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MenuOffer, MenuOfferDetail, MenuRepository, VersionedResource, MenuCategory } from "./application/catalog";
import { createOperationAttemptController, IDEMPOTENT_WINDOW_MS, sealJsonPayload } from "./application/operationAttempt";
import { analyzeIdempotentAttemptError } from "./api/idempotencyResponse";
import { CategoryFormDialog, type CategoryDialogRepository } from "./features/categories/CategoryFormDialog";
import { OfferFormPage, buildOfferCreateScope, type OfferFormDraftState, type OfferFormRepository } from "./features/offers/OfferFormPage";
import { OffersPage } from "./features/offers/OffersPage";
import { createControllableIndexedDbHarness, createIndexedDbPendingOperationStorage } from "./shared/pendingOperationStorage";

const storageForTest = () => createIndexedDbPendingOperationStorage({ idbFactory: createControllableIndexedDbHarness().factory });
const offer: MenuOfferDetail = { id: "offer-1", entryId: "entry-1", presentationTag: "Combo", basePrice: 10,
  status: "INACTIVE", image: null, composition: { slots: [{ slotId: "slot-1", name: "Principal", quantity: 1, course: null,
    options: [{ optionId: "option-1", sourceType: "RECIPE", recipeId: "recipe-1", displayName: "Receta", status: "ACTIVE" }] }] } };
const entry = { id: "entry-1", brandName: "Entrada", description: "D", status: "ACTIVE" as const, categoryIds: [] };
const formRepository = (): jest.Mocked<OfferFormRepository> => ({ getEntry: jest.fn().mockResolvedValue(entry),
  getOffer: jest.fn().mockResolvedValue({ data: offer, etag: '"v1"' }), uploadEntryImage: jest.fn(), uploadImage: jest.fn(),
  createOffer: jest.fn().mockResolvedValue(offer), updateOffer: jest.fn().mockResolvedValue({ ...offer, etag: '"v2"' }),
  listRecipes: jest.fn(), getRecipe: jest.fn(), createRecipe: jest.fn(), updateRecipe: jest.fn(), deleteRecipe: jest.fn(), listInventoryItems: jest.fn() });
const keyError = (code: "IDEMPOTENCY_KEY_REUSED" | "INVALID_IDEMPOTENCY_KEY") => ({ response: { status: code === "IDEMPOTENCY_KEY_REUSED" ? 409 : 400,
  data: { error: { message: `Clave rechazada: ${code}`, details: { code } } } } });
const originalCreateUrl = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeUrl = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:restored-image") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
});
afterEach(() => {
  if (originalCreateUrl) Object.defineProperty(URL, "createObjectURL", originalCreateUrl);
  else Reflect.deleteProperty(URL, "createObjectURL");
  if (originalRevokeUrl) Object.defineProperty(URL, "revokeObjectURL", originalRevokeUrl);
  else Reflect.deleteProperty(URL, "revokeObjectURL");
});

test("RC01: Save awaiting the opening category GET cannot authorize stale fields; explicit review can", async () => {
  let resolveOpening!: (value: VersionedResource<MenuCategory>) => void;
  const response = new Promise<VersionedResource<MenuCategory>>(resolve => { resolveOpening = resolve; });
  const remote = { data: { id: "c1", name: "Remoto", description: "Descripción concurrente" }, etag: '"v2"' };
  const repository: jest.Mocked<CategoryDialogRepository> = { getCategory: jest.fn().mockReturnValueOnce(response).mockResolvedValue(remote),
    createCategory: jest.fn(), updateCategory: jest.fn().mockResolvedValue({ id: "c1", name: "Local", description: "Anterior" }) };
  render(<CategoryFormDialog category={{ id: "c1", name: "Original", description: "Anterior" }} repository={repository} storage={storageForTest()}
    onClose={jest.fn()} onCreated={jest.fn()} onCreatedWithPendingEdits={jest.fn()} onUpdated={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Local" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(repository.updateCategory).not.toHaveBeenCalled();
  await act(async () => { resolveOpening(remote); });
  expect(repository.updateCategory).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Nombre")).toHaveValue("Local");
  fireEvent.click(screen.getByRole("button", { name: "Revisar categoría actual" }));
  fireEvent.click(await screen.findByRole("button", { name: "Continuar con mi borrador y versión revisada" }));
  expect(repository.updateCategory).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(repository.updateCategory).toHaveBeenCalledWith("c1", { name: "Local", description: "Anterior" }, '"v2"'));
});

test.each(["IDEMPOTENCY_KEY_REUSED", "INVALID_IDEMPOTENCY_KEY"] as const)("RC05: %s requires explicit preparation without writes and keeps draft/If-Match", async code => {
  const repository = formRepository();
  repository.updateOffer.mockRejectedValueOnce(keyError(code));
  render(<MemoryRouter initialEntries={["/entries/entry-1/offers/offer-1/edit"]}><Routes>
    <Route path="/entries/:entryId/offers/:offerId/edit" element={<OfferFormPage repository={repository} storage={storageForTest()} />} />
    <Route path="/entries/entry-1/offers" element={<h1>Ofertas guardadas</h1>} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Guardar Oferta" }));
  await screen.findByText(`Clave rechazada: ${code}`);
  const oldKey = repository.updateOffer.mock.calls[0][3];
  fireEvent.change(screen.getByLabelText("Etiqueta de presentación (opcional)"), { target: { value: "Cambios conservados" } });
  const prepare = screen.getByRole("button", { name: "Iniciar nueva operación" });
  fireEvent.submit(screen.getByRole("button", { name: "Guardar Oferta" }).closest("form")!);
  await act(async () => {});
  expect(repository.updateOffer).toHaveBeenCalledTimes(1);
  fireEvent.click(prepare);
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Oferta" })).toBeEnabled());
  expect(repository.updateOffer).toHaveBeenCalledTimes(1);
  expect(repository.getOffer).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Etiqueta de presentación (opcional)")).toHaveValue("Cambios conservados");
  fireEvent.change(screen.getByLabelText("Precio base"), { target: { value: "17" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
  await screen.findByRole("heading", { name: "Ofertas guardadas" });
  expect(repository.updateOffer).toHaveBeenCalledTimes(2);
  expect(repository.updateOffer.mock.calls[1][3]).not.toBe(oldKey);
  expect(repository.updateOffer.mock.calls[1][2]).toBe('"v1"');
  expect(repository.updateOffer.mock.calls[1][1]).toMatchObject({ presentationTag: "Cambios conservados", basePrice: 17 });
});

test("RC05: a restored rejected creation preserves the confirmed image and prepares without uploading or POSTing", async () => {
  const storage = storageForTest();
  const image = new File(["original image bytes"], "original.png", { type: "image/png" });
  const draft: OfferFormDraftState = { presentationTag: "Combo", basePrice: "10", desiredStatus: "INACTIVE", imageFile: image,
    slots: [{ localId: "local-slot", name: "Principal", quantity: 1, course: null, options: [{ localId: "local-option", displayName: "Receta",
      sourceType: "RECIPE", recipeId: "recipe-1", status: "ACTIVE", hasRecipeAssignmentIntent: true, recipeAssignmentToken: "intent-1" }] }] };
  const controller = createOperationAttemptController<OfferFormDraftState, MenuOfferDetail>({ scope: buildOfferCreateScope("entry-1"), storage,
    initialDraft: draft, getImageFile: () => image, executeImageUpload: async () => ({ id: "confirmed-image" }),
    buildFinalStageInput: ({ submittedDraftVersion, now }) => ({ operationKind: "offer.create", method: "POST", endpointPath: "/menu/entries/entry-1/offers",
      payload: sealJsonPayload({ presentationTag: "Combo" }), submittedDraftVersion, now }),
    executeFinalStage: async () => { throw keyError("IDEMPOTENCY_KEY_REUSED"); },
    classifyError: (error, attempt) => analyzeIdempotentAttemptError(error, attempt.operationKind) });
  await controller.submit();
  const oldKey = controller.getCurrentAttempt()!.idempotencyKey;
  const repository = formRepository();
  render(<MemoryRouter initialEntries={["/entries/entry-1/offers/new"]}><Routes>
    <Route path="/entries/:entryId/offers/new" element={<OfferFormPage repository={repository} storage={storage} />} />
    <Route path="/entries/entry-1/offers" element={<h1>Oferta creada</h1>} />
  </Routes></MemoryRouter>);
  const prepare = await screen.findByRole("button", { name: "Iniciar nueva operación" });
  fireEvent.click(prepare);
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Oferta" })).toBeEnabled());
  expect(repository.createOffer).not.toHaveBeenCalled();
  expect(repository.uploadEntryImage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
  await screen.findByRole("heading", { name: "Oferta creada" });
  expect(repository.createOffer).toHaveBeenCalledTimes(1);
  expect(repository.createOffer.mock.calls[0][2]).toBe("confirmed-image");
  expect(repository.createOffer.mock.calls[0][3]).not.toBe(oldKey);
  expect(repository.uploadEntryImage).not.toHaveBeenCalled();
});

test("RC03: status retries keep their first-send deadline and require a successful read after expiry", async () => {
  let now = Date.now();
  const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
  try {
    const listed: MenuOffer = { ...offer, entryName: "Entrada", slotCount: 1 };
    const repository: jest.Mocked<Pick<MenuRepository, "getEntry" | "getOffer" | "listOffers" | "setOfferStatus" | "deleteInactiveOffer">> = {
      getEntry: jest.fn().mockResolvedValue(entry), getOffer: jest.fn().mockResolvedValue({ data: offer, etag: '"v1"' }),
      listOffers: jest.fn().mockResolvedValue({ data: [listed], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } }),
      setOfferStatus: jest.fn().mockRejectedValue(Object.assign(new Error("timeout"), { code: "ECONNABORTED" })), deleteInactiveOffer: jest.fn() };
    render(<MemoryRouter initialEntries={["/entries/entry-1/offers"]}><Routes>
      <Route path="/entries/:entryId/offers" element={<OffersPage repository={repository} />} />
    </Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar estado de oferta Combo: Inactiva" }));
    let retry = await screen.findByRole("button", { name: "Reintentar cambio de estado" });
    const firstCall = repository.setOfferStatus.mock.calls[0];
    now += IDEMPOTENT_WINDOW_MS - 1000;
    fireEvent.click(retry);
    await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reintentar cambio de estado" })).toBeEnabled());
    expect(repository.setOfferStatus.mock.calls[1]).toEqual(firstCall);
    retry = screen.getByRole("button", { name: "Reintentar cambio de estado" });
    now += 2000;
    fireEvent.click(retry);
    await act(async () => {});
    expect(repository.setOfferStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toHaveTextContent(/24 horas/);
    repository.listOffers.mockRejectedValueOnce(new Error("read failed"));
    fireEvent.click(screen.getByRole("button", { name: "Actualizar datos" }));
    await screen.findByText(/No se pudieron cargar las ofertas/);
    expect(repository.setOfferStatus).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar ofertas" }));
    await waitFor(() => expect(screen.queryByText(/No se pudieron cargar las ofertas/)).not.toBeInTheDocument());
    repository.getOffer.mockResolvedValue({ data: offer, etag: '"v2"' });
    repository.setOfferStatus.mockResolvedValue({ ...offer, status: "ACTIVE" });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de oferta Combo: Inactiva" }));
    await waitFor(() => expect(repository.setOfferStatus).toHaveBeenCalledTimes(3));
    expect(repository.setOfferStatus.mock.calls[2][3]).not.toBe(firstCall[3]);
    expect(repository.setOfferStatus.mock.calls[2][2]).toBe('"v2"');
  } finally { clock.mockRestore(); }
});
