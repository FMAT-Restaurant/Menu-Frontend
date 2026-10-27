import { consumeConfirmedRecipeAssignments } from "./features/offers/compositionReconciliation";
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GuardedMemoryRouter } from './shared/GuardedMemoryRouter.test-helper';
import { OfferFormPage, buildOfferCreateScope, buildOfferUpdateScope, type OfferFormDraftState } from './features/offers/OfferFormPage';
import { RecipePage } from './features/recipes/RecipePage';
import { RecipeFormDialog } from './features/recipes/RecipeFormDialog';
import { EntryFormPage } from './features/entries/EntryFormPage';
import { createOperationAttemptController, sealJsonPayload, applyAttemptFailure, canManualRetryAttempt, createSealedAttempt } from './application/operationAttempt';
import { createIndexedDbPendingOperationStorage, createControllableIndexedDbHarness } from './shared/pendingOperationStorage';

const entry = { id: 'e1', brandName: 'Entrada', description: 'Descripción', status: 'ACTIVE', categoryIds: [] };
const offer = { id: 'o1', entryId: 'e1', presentationTag: 'Original', basePrice: 100, status: 'ACTIVE', image: null,
  composition: { slots: [{ slotId: 's1', name: 'Principal', quantity: 1, course: null,
    options: [{ optionId: 'op1', sourceType: 'RECIPE', recipeId: 'r1', displayName: 'Receta', status: 'ACTIVE' }] }] } };
const recipe = { id: 'r1', name: 'Receta', description: 'Descripción', instructions: 'Instrucciones v1', supplies: [{ inventoryItemId: 'i1', quantity: 1, inventoryItem: { id: 'i1', name: 'Harina', unit: 'kg' } }] };
const meta = { page: 1, pageSize: 50, total: 1, totalPages: 1 };
const timeout = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
function storage() { return createIndexedDbPendingOperationStorage({ idbFactory: createControllableIndexedDbHarness().factory }); }
function repo() {
  return { getEntry: jest.fn().mockResolvedValue(entry), getOffer: jest.fn().mockResolvedValue({ data: offer, etag: '"v1"' }),
    listCategories: jest.fn().mockResolvedValue([]), uploadImage: jest.fn().mockResolvedValue('img'), uploadEntryImage: jest.fn().mockResolvedValue('img'),
    createEntry: jest.fn().mockResolvedValue(entry), updateEntry: jest.fn().mockResolvedValue(entry),
    createOffer: jest.fn().mockResolvedValue(offer), updateOffer: jest.fn().mockResolvedValue(offer),
    listRecipes: jest.fn().mockResolvedValue({ data: [recipe], meta }), getRecipe: jest.fn().mockResolvedValue({ data: recipe, etag: '"r1"' }),
    createRecipe: jest.fn().mockResolvedValue(recipe), updateRecipe: jest.fn().mockResolvedValue(recipe), deleteRecipe: jest.fn(),
    listInventoryItems: jest.fn().mockResolvedValue({ data: [{ id: 'i1', name: 'Harina', unit: 'kg' }], meta }) };
}
function mountOffer(r: ReturnType<typeof repo>, s: ReturnType<typeof storage>) {
  return render(<GuardedMemoryRouter initialEntries={['/entries/e1/offers/o1/edit']}><Routes>
    <Route path='/entries/:entryId/offers/:offerId/edit' element={<OfferFormPage repository={r} storage={s} />} />
    <Route path='/entries/e1/offers' element={<h1>Listado destino</h1>} />
  </Routes></GuardedMemoryRouter>);
}
beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: jest.fn(() => 'blob:review') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: jest.fn(async () => ({ width: 600, height: 600, close: jest.fn() })) });
});
afterEach(cleanup);
async function initialOfferFailure(r: ReturnType<typeof repo>, s: ReturnType<typeof storage>) {
  r.updateOffer.mockRejectedValueOnce(timeout);
  const view = mountOffer(r, s);
  await screen.findByDisplayValue('Original');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await screen.findByRole('button', { name: 'Reintentar' });
  return view;
}

test('oferta: recuperar el envío anterior conserva cambios posteriores visibles', async () => {
  const r = repo(); const s = storage();
  await initialOfferFailure(r, s);
  fireEvent.change(screen.getByLabelText('Etiqueta de presentación (opcional)'), { target: { value: 'Cambio posterior' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(r.updateOffer).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByLabelText('Etiqueta de presentación (opcional)')).toHaveValue('Cambio posterior'));
});

test('oferta: recargar conserva el borrador editado después del timeout', async () => {
  const r = repo(); const s = storage();
  const view = await initialOfferFailure(r, s);
  fireEvent.change(screen.getByLabelText('Etiqueta de presentación (opcional)'), { target: { value: 'Cambio posterior' } });
  view.unmount();
  mountOffer(r, s);
  await screen.findByRole('button', { name: 'Reintentar' });
  expect(screen.getByLabelText('Etiqueta de presentación (opcional)')).toHaveValue('Cambio posterior');
});

test('oferta: cambiar imagen no reemplaza la clave del PATCH incierto', async () => {
  const r = repo(); const s = storage();
  await initialOfferFailure(r, s);
  const firstKey = r.updateOffer.mock.calls[0][3];
  fireEvent.change(document.querySelector('#offer-image-input')!, { target: { files: [new File(['bytes'], 'nueva.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar Oferta' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(r.updateOffer).toHaveBeenCalledTimes(2));
  expect(r.updateOffer.mock.calls[1][3]).toBe(firstKey);
});

test('oferta: desmontar durante upload detiene el PATCH posterior', async () => {
  const r = repo(); const s = storage();
  let resolveUpload!: (id: string) => void;
  r.uploadEntryImage.mockImplementation(() => new Promise(resolve => { resolveUpload = resolve; }));
  const view = mountOffer(r, s);
  await screen.findByDisplayValue('Original');
  fireEvent.change(document.querySelector('#offer-image-input')!, { target: { files: [new File(['bytes'], 'nueva.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar Oferta' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(r.uploadEntryImage).toHaveBeenCalledTimes(1));
  view.unmount();
  await act(async () => { resolveUpload('img'); });
  expect(r.updateOffer).not.toHaveBeenCalled();
});

test('oferta: Retry-After habilita Reintentar al cumplirse el plazo', async () => {
  const r = repo(); const s = storage();
  r.updateOffer.mockRejectedValueOnce({ response: { status: 409, headers: { 'retry-after': '1' }, data: { error: { code: 'CONFLICT', message: 'En progreso', details: { code: 'IDEMPOTENCY_IN_PROGRESS' } } } } });
  mountOffer(r, s); await screen.findByDisplayValue('Original');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  const retry = await screen.findByRole('button', { name: 'Reintentar' });
  await waitFor(() => expect(retry).toBeEnabled(), { timeout: 2200 });
});

test('receta: el PATCH usa la versión del detalle abierto, no una segunda lectura', async () => {
  const r = repo(); const s = storage();
  r.getRecipe.mockResolvedValueOnce({ data: recipe, etag: '"r1"' }).mockResolvedValue({ data: { ...recipe, instructions: 'Instrucciones v2' }, etag: '"r2"' });
  render(<MemoryRouter initialEntries={['/recipes']}><RecipePage repository={r} storage={s} /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Editar Receta' }));
  await screen.findByRole('dialog');
  await waitFor(() => expect(r.getRecipe).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Renombrada' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(r.updateRecipe).toHaveBeenCalledTimes(1));
  expect(r.updateRecipe.mock.calls[0][2]).toBe('"r1"');
});

test('entrada: recuperar upload incierto tras recarga reenvía los bytes originales', async () => {
  const r = repo(); const s = storage();
  r.uploadEntryImage.mockRejectedValueOnce(timeout);
  function mount() { return render(<MemoryRouter initialEntries={['/entries/new']}><Routes><Route path='/entries/new' element={<EntryFormPage repository={r} storage={s} />} /></Routes></MemoryRouter>); }
  const view = mount();
  await waitFor(() => expect(r.listCategories).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('Nombre comercial'), { target: { value: 'Nueva' } });
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción' } });
  const fileInput = document.querySelector('input[type=file]')!;
  fireEvent.change(fileInput, { target: { files: [new File(['bytes'], 'nueva.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar entrada' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Guardar entrada' }));
  await screen.findByRole('button', { name: /He verificado/ });
  view.unmount(); mount();
  fireEvent.click(await screen.findByRole('button', { name: /He verificado/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar entrada' }));
  await waitFor(() => expect(r.uploadEntryImage).toHaveBeenCalledTimes(2));
});

test('receta: corregir datos después de un 422 envía la corrección con otra clave', async () => {
  const r = repo(); const s = storage();
  r.createRecipe.mockRejectedValueOnce({ response: { status: 422, data: { error: { code: 'VALIDATION_ERROR', message: 'Nombre rechazado' } } } });
  render(<MemoryRouter><RecipeFormDialog repository={r} storage={s} onClose={() => {}} recipe={null} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nombre rechazado' } });
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción' } });
  fireEvent.change(screen.getByLabelText('Instrucciones'), { target: { value: 'Preparar' } });
  await screen.findByRole('option', { name: /Harina/ });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'i1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar receta' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Nombre rechazado'));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nombre corregido' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar receta' }));
  await waitFor(() => expect(r.createRecipe).toHaveBeenCalledTimes(2));
  expect(r.createRecipe.mock.calls[1][0].name).toBe('Nombre corregido');
  expect(r.createRecipe.mock.calls[1][1]).not.toBe(r.createRecipe.mock.calls[0][1]);
});

test('oferta: corregir datos después de un 422 envía la corrección con otra clave', async () => {
  const r = repo(); const s = storage();
  r.updateOffer.mockRejectedValueOnce({ response: { status: 422, data: { error: { code: 'VALIDATION_ERROR', message: 'Etiqueta rechazada' } } } });
  mountOffer(r, s); await screen.findByDisplayValue('Original');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Etiqueta rechazada'));
  fireEvent.change(screen.getByLabelText('Etiqueta de presentación (opcional)'), { target: { value: 'Corregida' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(r.updateOffer).toHaveBeenCalledTimes(2));
  expect(r.updateOffer.mock.calls[1][1].presentationTag).toBe('Corregida');
  expect(r.updateOffer.mock.calls[1][3]).not.toBe(r.updateOffer.mock.calls[0][3]);
});

test('cadena de imagen: no envía el POST si no puede persistir su clave antes del envío', async () => {
  const s = storage();
  const saveOriginal = s.saveRecord.bind(s);
  s.saveRecord = jest.fn(async record => {
    if (record.stages.length > 1) throw new Error('QuotaExceededError');
    return saveOriginal(record);
  });
  const persist = jest.fn().mockResolvedValue({ id: 'nuevo' });
  const controller = createOperationAttemptController({
    scope: { tabId: 'review-tab', formKind: 'entry-form', resourceKey: 'new' }, storage: s,
    initialDraft: { name: 'Entrada' },
    stage1ImageUpload: { file: new File(['bytes'], 'imagen.png', { type: 'image/png' }), executeUpload: async () => ({ id: 'imagen' }) },
    buildFinalStageInput: ({ draft, confirmedImageId, submittedDraftVersion, now }) => ({
      operationKind: 'entry.create', method: 'POST', endpointPath: '/menu/entries',
      payload: sealJsonPayload({ ...draft, imageId: confirmedImageId }), submittedDraftVersion, now,
    }), executeFinalStage: persist,
    classifyError: () => ({ kind: 'uncertain_outcome', message: 'Incierto' }),
  });
  await controller.submit().catch(() => {});
  expect(persist).not.toHaveBeenCalled();
});

test('receta: recuperar una creación desde la biblioteca conserva el nombre editado posteriormente', async () => {
  const r = repo(); const s = storage();
  r.createRecipe.mockRejectedValueOnce(timeout);
  render(<MemoryRouter initialEntries={['/recipes']}><RecipePage repository={r} storage={s} /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Nueva receta/ }));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Receta' } });
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción' } });
  fireEvent.change(screen.getByLabelText('Instrucciones'), { target: { value: 'Instrucciones v1' } });
  await screen.findByRole('option', { name: /Harina/ });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'i1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar receta' }));
  await screen.findByRole('button', { name: 'Reintentar' });
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Cambio posterior' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(r.createRecipe).toHaveBeenCalledTimes(2));
  await screen.findByRole('button', { name: 'Guardar cambios' });
  expect(screen.getByLabelText('Nombre')).toHaveValue('Cambio posterior');
});


test('oferta: una creación ambigua sobrevive F5, consulta el ID confirmado y sólo adopta composición', async () => {
  const r = repo(); const s = storage();
  const draft: OfferFormDraftState = { presentationTag: 'Mi borrador', basePrice: '250', desiredStatus: 'INACTIVE', slots: [
    { localId: 'local-1', name: 'Duplicado', quantity: 1, course: null, options: [{ localId: 'opt-local', displayName: 'Receta', sourceType: 'RECIPE', recipeId: 'r1', status: 'ACTIVE' }] },
    { localId: 'local-2', name: 'Duplicado', quantity: 1, course: null, options: [{ localId: 'opt-local-2', displayName: 'Receta', sourceType: 'RECIPE', recipeId: 'r1', status: 'ACTIVE' }] },
  ] };
  const confirmed = { ...offer, id: 'created-on-server', presentationTag: 'Enviado', basePrice: 100, composition: { slots: [
    { ...offer.composition.slots[0], slotId: 'server-1', name: 'Duplicado' },
    { ...offer.composition.slots[0], slotId: 'server-2', name: 'Duplicado' },
  ] } };
  const controller = createOperationAttemptController({ scope: buildOfferCreateScope('e1'), storage: s, initialDraft: draft,
    retainConfirmedResult: true,
    buildFinalStageInput: () => ({ operationKind: 'offer.create', method: 'POST', endpointPath: '/menu/entries/e1/offers', payload: sealJsonPayload({ presentationTag: 'Enviado' }) }),
    executeFinalStage: async () => confirmed, classifyError: () => ({ kind: 'uncertain_outcome', message: 'timeout' }),
  });
  await controller.submit();
  function mount() { return render(<MemoryRouter initialEntries={['/entries/e1/offers/new']}><Routes>
    <Route path='/entries/:entryId/offers/new' element={<OfferFormPage repository={r} storage={s} />} />
    <Route path='/entries/e1/offers' element={<h1>Listado destino</h1>} />
  </Routes></MemoryRouter>); }
  const first = mount();
  await screen.findByRole('button', { name: 'Revisar oferta actual' });
  expect(screen.getByLabelText('Etiqueta de presentación (opcional)')).toHaveValue('Mi borrador');
  first.unmount(); mount();
  r.getOffer.mockResolvedValue({ data: confirmed, etag: '"confirmed-version"' });
  fireEvent.click(await screen.findByRole('button', { name: 'Revisar oferta actual' }));
  await screen.findByRole('region', { name: 'Versión del servidor' });
  expect(r.getOffer.mock.calls[0][0]).toBe('created-on-server');
  fireEvent.click(screen.getByRole('button', { name: 'Adoptar versión del servidor' }));
  expect(screen.getByLabelText('Etiqueta de presentación (opcional)')).toHaveValue('Mi borrador');
  expect(screen.getByLabelText('Precio base (MXN)')).toHaveValue(250);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(r.updateOffer).toHaveBeenCalledTimes(1));
  expect(r.updateOffer.mock.calls[0][0]).toBe('created-on-server');
  expect(r.updateOffer.mock.calls[0][2]).toBe('"confirmed-version"');
  expect(r.createOffer).not.toHaveBeenCalled();
});

test('Retry-After ausente o inválido mantiene la operación pausada sin autorizar otro envío', () => {
  const attempt = createSealedAttempt({ operationKind: 'offer.patch', method: 'PATCH', endpointPath: '/offers/o1', payload: sealJsonPayload({ status: 'ACTIVE' }) });
  const failed = applyAttemptFailure(attempt, { kind: 'in_progress_conflict', message: 'En progreso', retryAfterInvalid: true });
  expect(canManualRetryAttempt(failed, Date.now() + 100000).allowed).toBe(false);
  expect(canManualRetryAttempt(failed).reason).toBe('retry_after_invalid');
});

test('entrada: una creación recuperada conserva los cambios posteriores y sigue como edición del ID confirmado', async () => {
  const r = repo(); const s = storage();
  r.createEntry.mockRejectedValueOnce(timeout).mockResolvedValue({ ...entry, id: 'entry-confirmed' });
  render(<MemoryRouter initialEntries={['/entries/new']}><Routes><Route path='/entries/new' element={<EntryFormPage repository={r} storage={s} />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(r.listCategories).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('Nombre comercial'), { target: { value: 'Nombre enviado' } });
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción' } });
  fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [new File(['bytes'], 'foto.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar entrada' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Guardar entrada' }));
  await screen.findByRole('button', { name: /He verificado/ });
  fireEvent.change(screen.getByLabelText('Nombre comercial'), { target: { value: 'Nombre posterior' } });
  fireEvent.click(screen.getByRole('button', { name: /He verificado/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar entrada' }));
  await screen.findByRole('button', { name: 'Guardar cambios' });
  expect(screen.getByLabelText('Nombre comercial')).toHaveValue('Nombre posterior');
  r.getEntry.mockResolvedValue({ ...entry, id: 'entry-confirmed', etag: '"confirmed-entry"' });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar entrada actual' }));
  await screen.findByRole('button', { name: 'Continuar con mi borrador y versión revisada' });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar con mi borrador y versión revisada' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(r.updateEntry).toHaveBeenCalledTimes(1));
  expect(r.updateEntry.mock.calls[0][0]).toBe('entry-confirmed');
  expect(r.updateEntry.mock.calls[0][1].brandName).toBe('Nombre posterior');
  expect(r.createEntry).toHaveBeenCalledTimes(2);
});


test('oferta: confirmar una asignación sólo consume esa intención y conserva una selección posterior de la misma receta', () => {
  const option = { localId: 'opt', displayName: 'Receta', status: 'ACTIVE' as const, sourceType: 'RECIPE' as const,
    recipeId: 'r1', hasRecipeAssignmentIntent: true, recipeAssignmentToken: 'selection-1' };
  const sent = [{ localId: 'slot', name: 'Principal', quantity: 1, course: null, options: [option] }];
  expect(consumeConfirmedRecipeAssignments(sent, sent)[0].options[0].hasRecipeAssignmentIntent).toBe(false);
  const current = [{ ...sent[0], options: [{ ...option, recipeAssignmentToken: 'selection-2' }] }];
  expect(consumeConfirmedRecipeAssignments(current, sent)[0].options[0].hasRecipeAssignmentIntent).toBe(true);
});


test('oferta: una carga pendiente bloquea la salida y una respuesta tras desmontar no escribe ni pierde la recuperación', async () => {
  const r = repo(); const s = storage();
  let resolveUpload!: (id: string) => void;
  r.uploadEntryImage.mockImplementation(() => new Promise(resolve => { resolveUpload = resolve; }));
  const view = mountOffer(r, s); await screen.findByDisplayValue('Original');
  fireEvent.change(document.querySelector('#offer-image-input')!, { target: { files: [new File(['bytes'], 'nueva.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar Oferta' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(r.uploadEntryImage).toHaveBeenCalledTimes(1));
  const pending = await s.getRecord(buildOfferUpdateScope('o1'));
  expect(pending).not.toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Cancelar' }));
  expect(screen.queryByRole('heading', { name: 'Listado destino' })).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Original')).toBeVisible();
  expect(await s.getRecord(buildOfferUpdateScope('o1'))).not.toBeNull();
  view.unmount();
  await act(async () => { resolveUpload('img'); });
  const retained = await s.getRecord(buildOfferUpdateScope('o1'));
  expect(retained).not.toBeNull();
  expect(retained!.stages[0].idempotencyKey).toBe(pending!.stages[0].idempotencyKey);
  expect(r.uploadEntryImage).toHaveBeenCalledTimes(1);
  expect(r.updateOffer).not.toHaveBeenCalled();
});

test('oferta: recuperar con ETag confirmado permite otro guardado explícito sin exigir adopción de composición', async () => {
  const r = repo(); const s = storage();
  r.updateOffer.mockRejectedValueOnce(timeout).mockResolvedValueOnce({ ...offer, etag: '"confirmed"' });
  mountOffer(r, s); await screen.findByDisplayValue('Original');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await screen.findByRole('button', { name: 'Reintentar' });
  fireEvent.change(screen.getByLabelText('Etiqueta de presentación (opcional)'), { target: { value: 'Borrador posterior' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByRole('status');
  expect(screen.queryByRole('button', { name: 'Revisar oferta actual' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(r.updateOffer).toHaveBeenCalledTimes(3));
  expect(r.updateOffer.mock.calls[2][1].presentationTag).toBe('Borrador posterior');
  expect(r.updateOffer.mock.calls[2][2]).toBe('"confirmed"');
  expect(r.updateOffer.mock.calls[2][3]).not.toBe(r.updateOffer.mock.calls[1][3]);
});


test('oferta: F5 conserva identidades enviadas, eliminaciones y opciones añadidas después del timeout', async () => {
  const r = repo(); const s = storage();
  const submitted: OfferFormDraftState = { presentationTag: 'Original', basePrice: '100', desiredStatus: 'ACTIVE', slots: [
    { localId: 'first-local', slotId: 'first-server', name: 'Primero', quantity: 1, course: null,
      options: [{ localId: 'first-option', optionId: 'first-option-server', sourceType: 'RECIPE', recipeId: 'r1', displayName: 'Primera', status: 'ACTIVE' }] },
    { localId: 'second-local', slotId: 'second-server', name: 'Segundo', quantity: 1, course: null,
      options: [{ localId: 'second-option', optionId: 'second-option-server', sourceType: 'RECIPE', recipeId: 'r1', displayName: 'Segunda', status: 'ACTIVE' }] },
  ] };
  const controller = createOperationAttemptController({ scope: buildOfferUpdateScope('o1'), storage: s, initialDraft: submitted,
    buildFinalStageInput: ({ draft }) => ({ operationKind: 'offer.patch', method: 'PATCH', endpointPath: '/menu/offers/o1', payload: sealJsonPayload({ presentationTag: draft.presentationTag }, '"original"') }),
    executeFinalStage: async () => { throw timeout; }, classifyError: () => ({ kind: 'uncertain_outcome', message: 'timeout' }),
  });
  await controller.submit();
  await controller.updateEditableDraft({ ...submitted, slots: [{ ...submitted.slots[1], name: 'Segundo editado', options: [
    ...submitted.slots[1].options,
    { localId: 'new-option', sourceType: 'RECIPE', recipeId: 'r1', displayName: 'Nueva después', status: 'ACTIVE' },
  ] }] });
  controller.detachForReload();
  r.updateOffer.mockResolvedValue({ ...offer, etag: '"confirmed"', composition: { slots: [
    { slotId: 'second-server', name: 'Segundo', quantity: 1, course: null,
      options: [{ optionId: 'second-option-server', sourceType: 'RECIPE', recipeId: 'r1', displayName: 'Segunda', status: 'ACTIVE' }] },
    { slotId: 'first-server', name: 'Primero', quantity: 1, course: null,
      options: [{ optionId: 'first-option-server', sourceType: 'RECIPE', recipeId: 'r1', displayName: 'Primera', status: 'ACTIVE' }] },
  ] } });
  mountOffer(r, s);
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
  await screen.findByRole('status');
  expect(screen.getByText('Segundo editado')).toBeVisible();
  expect(screen.queryByText('Primero')).not.toBeInTheDocument();
  expect(screen.getByText('Nueva después')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Oferta' }));
  await waitFor(() => expect(r.updateOffer).toHaveBeenCalledTimes(2));
  const sent = r.updateOffer.mock.calls[1][1].composition.slots;
  expect(sent).toHaveLength(1);
  expect(sent[0].slotId).toBe('second-server');
  expect(sent[0].name).toBe('Segundo editado');
  expect(sent[0].options[0].optionId).toBe('second-option-server');
  expect(sent[0].options[1].optionId).toBeUndefined();
});
