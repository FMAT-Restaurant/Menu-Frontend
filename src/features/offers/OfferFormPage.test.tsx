import { GuardedMemoryRouter as MemoryRouter } from "../../shared/GuardedMemoryRouter.test-helper";
import { buildRecipeCreateScope } from "../recipes/RecipeFormDialog";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import type {
  MenuEntryDetail,
  MenuOfferDetail,
  MenuRepository,
  OfferCourse,
  OfferCreateDraft,
  OfferStatus,
  OfferUpdateDraft,
  RecipeSummary,
} from "../../application/catalog";
import type {
  OperationFlowScope,
  PendingOperationChainRecord,
  PendingOperationStorageAdapter,
} from "../../application/operationAttempt";
import {
  buildOperationStorageKey,
  sealJsonPayload,
} from "../../application/operationAttempt";
import { cachedEntries, rememberEntries } from "../../application/catalogCache";
import {
  createControllableIndexedDbHarness,
  createIndexedDbPendingOperationStorage,
} from "../../shared/pendingOperationStorage";
import { buildOfferUpdateScope, OfferFormPage } from "./OfferFormPage";

const mockEntry: MenuEntryDetail = {
  id: "entry-1",
  brandName: "Hamburguesa Clásica",
  description: "Carne de res con queso",
  status: "ACTIVE",
  categoryIds: ["cat-1"],
};

const mockRecipe: RecipeSummary = {
  id: "rec-1",
  name: "Receta Hamburguesa",
  description: "Preparación base",
  supplies: [],
};

const mockOffer: MenuOfferDetail = {
  id: "offer-1",
  entryId: "entry-1",
  presentationTag: "Individual",
  basePrice: 150,
  status: "ACTIVE",
  image: { id: "img-1", url: "https://example.com/burger.jpg", thumbnailUrl: "https://example.com/thumb.jpg" },
  composition: {
    slots: [
      {
        slotId: "slot-1",
        name: "Plato principal",
        quantity: 1,
        course: "plato fuerte",
        status: "ACTIVE",
        options: [
          {
            optionId: "opt-1",
            displayName: "Hamburguesa Doble",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-1",
          },
        ],
      },
    ],
  },
};

type OfferFormRepository = Pick<
  MenuRepository,
  | "getEntry"
  | "getOffer"
  | "uploadEntryImage"
  | "uploadImage"
  | "createOffer"
  | "updateOffer"
  | "listRecipes"
  | "getRecipe"
  | "createRecipe"
  | "updateRecipe"
  | "deleteRecipe"
  | "listInventoryItems"
>;

interface MockOptionInput {
  optionId?: string;
  displayName: string;
  status: OfferStatus;
  sourceType: "RECIPE" | "INVENTORY_ITEM";
  recipeId?: string;
  inventoryItemId?: string;
}

interface MockSlotInput {
  slotId?: string;
  name: string;
  quantity: number;
  course?: OfferCourse | null;
  options: readonly MockOptionInput[];
}

function createMockRepository(): jest.Mocked<OfferFormRepository> {
  return {
    getEntry: jest.fn().mockResolvedValue(mockEntry),
    getOffer: jest.fn().mockResolvedValue({ data: mockOffer, etag: '"offer-rev-1"' }),
    uploadEntryImage: jest.fn().mockResolvedValue("img-offer-uploaded"),
    uploadImage: jest.fn().mockResolvedValue("img-offer-uploaded"),
    createOffer: jest.fn().mockImplementation(async (_entryId: string, draft: OfferCreateDraft, imageId?: string) => {
      const slots = draft.composition.slots as unknown as readonly MockSlotInput[];
      return {
        id: "offer-created-id",
        entryId: "entry-1",
        presentationTag: draft.presentationTag,
        basePrice: draft.basePrice,
        status: "INACTIVE" as const,
        image: {
          id: imageId || "img-default",
          url: imageId ? `https://example.com/${imageId}.jpg` : "https://example.com/default.jpg",
          thumbnailUrl: imageId ? `https://example.com/${imageId}-thumb.jpg` : "https://example.com/default-thumb.jpg",
        },
        composition: {
          slots: slots.map((s, idx) => ({
            slotId: `srv-slot-${idx + 1}`,
            name: s.name,
            quantity: s.quantity,
            course: s.course ?? null,
            status: "ACTIVE" as const,
            options: s.options.map((o, optIdx) => ({
              optionId: `srv-opt-${idx + 1}-${optIdx + 1}`,
              displayName: o.displayName,
              status: o.status,
              sourceType: o.sourceType,
              recipeId: o.recipeId,
              inventoryItemId: o.inventoryItemId,
            })),
          })),
        },
      };
    }),
    updateOffer: jest.fn().mockImplementation(async (id: string, draft: OfferUpdateDraft, _etag?: string, _key?: string, imageId?: string) => {
      const slots = (draft.composition?.slots ?? []) as unknown as readonly MockSlotInput[];
      return {
        id,
        entryId: "entry-1",
        presentationTag: draft.presentationTag,
        basePrice: draft.basePrice,
        status: draft.status,
        image: imageId
          ? {
              id: imageId,
              url: `https://example.com/${imageId}.jpg`,
              thumbnailUrl: `https://example.com/${imageId}-thumb.jpg`,
            }
          : mockOffer.image,
        composition: {
          slots: slots.map((s, idx) => ({
            slotId: s.slotId || `srv-slot-${idx + 1}`,
            name: s.name,
            quantity: s.quantity,
            course: s.course ?? null,
            status: "ACTIVE" as const,
            options: s.options.map((o, optIdx) => ({
              optionId: o.optionId || `srv-opt-${idx + 1}-${optIdx + 1}`,
              displayName: o.displayName,
              status: o.status,
              sourceType: o.sourceType,
              recipeId: o.recipeId,
              inventoryItemId: o.inventoryItemId,
            })),
          })),
        },
      };
    }),
    listRecipes: jest.fn().mockResolvedValue({
      data: [mockRecipe],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    }),
    getRecipe: jest.fn(),
    createRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    deleteRecipe: jest.fn(),
    listInventoryItems: jest.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    }),
  };
}

function createMemoryStorage(): PendingOperationStorageAdapter {
  const map = new Map<string, unknown>();
  return {
    async saveRecord<TDraft = unknown>(record: PendingOperationChainRecord<TDraft>) {
      const canonicalKey = buildOperationStorageKey(record.scope);
      if (record.storageKey) {
        map.set(record.storageKey, record);
      }
      map.set(canonicalKey, record);
    },
    async getRecord<TDraft = unknown>(scopeOrKey: OperationFlowScope | string) {
      if (typeof scopeOrKey === "string") {
        return (map.get(scopeOrKey) as PendingOperationChainRecord<TDraft> | undefined) ?? null;
      }
      const canonicalKey = buildOperationStorageKey(scopeOrKey);
      const colonKey = `${scopeOrKey.tabId}:${scopeOrKey.formKind}:${scopeOrKey.resourceKey}`;
      return (
        (map.get(canonicalKey) as PendingOperationChainRecord<TDraft> | undefined) ??
        (map.get(colonKey) as PendingOperationChainRecord<TDraft> | undefined) ??
        null
      );
    },
    async deleteRecord(scopeOrKey: OperationFlowScope | string) {
      if (typeof scopeOrKey === "string") {
        map.delete(scopeOrKey);
      } else {
        map.delete(buildOperationStorageKey(scopeOrKey));
        map.delete(`${scopeOrKey.tabId}:${scopeOrKey.formKind}:${scopeOrKey.resourceKey}`);
      }
    },
    async listByTab(tabId: string) {
      return Array.from(map.values()).filter(
        (r: unknown) => (r as { scope: { tabId: string } }).scope.tabId === tabId,
      ) as PendingOperationChainRecord[];
    },
  };
}

function renderComponent(
  repository: OfferFormRepository,
  path = "/entries/entry-1/offers/new",
  state?: unknown,
  storage?: PendingOperationStorageAdapter,
) {
  const actualStorage =
    storage ??
    createIndexedDbPendingOperationStorage({
      idbFactory: createControllableIndexedDbHarness().factory,
    });
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route
          path="/entries/:entryId/offers/new"
          element={<OfferFormPage repository={repository} storage={actualStorage} />}
        />
        <Route
          path="/entries/:entryId/offers/:offerId/edit"
          element={<OfferFormPage repository={repository} storage={actualStorage} />}
        />
        <Route path="/entries/:entryId/offers" element={<div>Vista de ofertas</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// Mock createImageBitmap and URL methods for image testing
const originalCreateImageBitmap = globalThis.createImageBitmap;
const originalCreateObjectURL = globalThis.URL.createObjectURL;
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

beforeAll(() => {
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: jest.fn().mockResolvedValue({ width: 1000, height: 1000, close: jest.fn() }),
  });
  globalThis.URL.createObjectURL = jest.fn(() => "mock-blob-url");
  globalThis.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  if (originalCreateImageBitmap) {
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: originalCreateImageBitmap,
    });
  } else {
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  }
  globalThis.URL.createObjectURL = originalCreateObjectURL;
  globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
});

afterEach(() => {
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: jest.fn().mockResolvedValue({ width: 1000, height: 1000, close: jest.fn() }),
  });
});

describe("OfferFormPage (V4)", () => {
  test("renders creation view with commercial info and composition editor", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    expect(await screen.findByText("Hamburguesa Clásica")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Nueva oferta", level: 1 })).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver a ofertas/ })).toHaveAttribute(
      "href",
      "/entries/entry-1/offers"
    );

    // Section 1: Commercial info
    expect(screen.getByRole("heading", { name: "1. Información comercial", level: 2 })).toBeVisible();
    expect(screen.getByLabelText(/Etiqueta de presentación/)).toBeVisible();
    expect(screen.getByLabelText(/Precio base/)).toBeVisible();
    expect(screen.getByText(/La oferta se crea inactiva/)).toBeVisible();

    // Section 2: Composition
    expect(screen.getByRole("heading", { name: "2. Composición", level: 2 })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Copiar composición desde otra oferta" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar grupo" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Agregar grupo" })).toBeEnabled();
  });

  test("omits unavailable composition copy without draft or repository effects", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    await screen.findByRole("button", { name: "Agregar grupo" });
    expect(screen.queryByRole("button", { name: "Copiar composición desde otra oferta" })).not.toBeInTheDocument();
    expect(document.getElementById("copy-composition-pending-hint")).not.toBeInTheDocument();

    const addGroupBtn = screen.getByRole("button", { name: "Agregar grupo" });
    expect(addGroupBtn).toBeEnabled();


    expect(
      screen.getByText("La composición debe contener al menos un grupo con opciones válidas.")
    ).toBeVisible();
    expect(screen.queryByTestId("slot-card-0")).not.toBeInTheDocument();
    expect(repository.getEntry).toHaveBeenCalledTimes(1);
    expect(repository.getOffer).not.toHaveBeenCalled();
    expect(repository.createOffer).not.toHaveBeenCalled();
    expect(repository.updateOffer).not.toHaveBeenCalled();
  });

  test("creates a new slot via SlotModal (C31)", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    const addGroupBtn = await screen.findByRole("button", { name: "Agregar grupo" });
    fireEvent.click(addGroupBtn);

    expect(screen.getByRole("heading", { name: "Definir nuevo grupo" })).toBeVisible();

    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {
      target: { value: "Acompañamiento" },
    });
    fireEvent.change(screen.getByLabelText(/Rondas de selección/), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/Curso \/ tiempo sugerido/), {
      target: { value: "plato fuerte" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    expect(screen.queryByRole("heading", { name: "Definir nuevo grupo" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acompañamiento", level: 3 })).toBeVisible();
    expect(screen.getByText("2 rondas de selección")).toBeVisible();
    expect(screen.getByText("Plato fuerte")).toBeVisible();
    expect(screen.getByText("Inactivo")).toBeVisible(); // Slot with 0 options is Inactivo
  });

  test("edits and deletes a slot", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    const addGroupBtn = await screen.findByRole("button", { name: "Agregar grupo" });

    // Add slot
    fireEvent.click(addGroupBtn);
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Bebida" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    expect(screen.getByRole("heading", { name: "Bebida", level: 3 })).toBeVisible();

    // Edit slot
    fireEvent.click(screen.getByRole("button", { name: "Editar grupo Bebida" }));
    expect(screen.getByRole("heading", { name: "Editar grupo" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Bebida fría" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    expect(screen.getByRole("heading", { name: "Bebida fría", level: 3 })).toBeVisible();

    // Delete slot
    fireEvent.click(screen.getByRole("button", { name: "Eliminar grupo Bebida fría" }));
    expect(screen.queryByRole("heading", { name: "Bebida fría", level: 3 })).not.toBeInTheDocument();
  });

  test("omits unavailable inventory selection while adding a recipe option via V6", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    const addGroupBtn = await screen.findByRole("button", { name: "Agregar grupo" });

    // Add slot first
    fireEvent.click(addGroupBtn);
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    // Open OptionModal
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Principal" }));
    expect(screen.getByRole("heading", { name: /Agregar opción · Principal/ })).toBeVisible();

    // Unavailable inventory selection is omitted; recipe assignment remains available.
    expect(screen.queryByRole("button", { name: /Elegir artículo de inventario/ })).not.toBeInTheDocument();
    expect(document.getElementById("inventory-source-pending-hint")).not.toBeInTheDocument();
    expect(repository.createOffer).not.toHaveBeenCalled();
    expect(repository.updateOffer).not.toHaveBeenCalled();
    expect(repository.listInventoryItems).not.toHaveBeenCalled();
    expect(repository.listRecipes).not.toHaveBeenCalled();
    expect(screen.getByText("Elige una receta de la biblioteca para esta opción.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar opción" })).toBeDisabled();

    // Click recipe button -> opens V6 RecipePage
    const recipeBtn = screen.getByRole("button", { name: /Elegir receta/ });
    expect(recipeBtn).toBeEnabled();
    fireEvent.click(recipeBtn);
    expect(await screen.findByRole("heading", { name: /Elegir receta ·/ })).toBeVisible();

    // Select recipe from list
    const recipeArticle = screen.getByRole("article", { name: "Receta Hamburguesa" });
    fireEvent.click(within(recipeArticle).getByRole("button", { name: "Asignar" }));

    // Back in OptionModal
    expect(screen.getByText("Receta asignada: Receta Hamburguesa")).toBeVisible();

    // Set custom display name and save
    fireEvent.change(screen.getByLabelText(/Nombre mostrado/), {
      target: { value: "Hamburguesa Especial" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Verify option appears in slot card
    expect(screen.getByText("Hamburguesa Especial")).toBeVisible();
    expect(screen.getByText("Receta")).toBeVisible();
    expect(screen.getByRole("button", { name: "Cambiar estado de Hamburguesa Especial" })).toHaveTextContent("Desactivar");

    // Slot derived status is now Activo!
    const slotCard = screen.getByTestId("slot-card-0");
    expect(within(slotCard).getByText("Activo")).toBeVisible();
  });

  test("toggling option status updates slot derived status and offer activation capacity", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    // Wait for edit load
    expect(await screen.findByDisplayValue("Individual")).toBeVisible();
    expect(screen.getByDisplayValue("150")).toBeVisible();

    // Existing slot has active option -> slot is Activo
    const slotCard = screen.getByTestId("slot-card-0");
    expect(within(slotCard).getByText("Activo")).toBeVisible();

    // Toggle option status to Inactiva
    const toggleBtn = screen.getByRole("button", { name: "Cambiar estado de Hamburguesa Doble" });
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Activar");

    // Slot is now Inactivo
    expect(within(slotCard).getByText("Inactivo")).toBeVisible();

    // Warning appears in commercial info explaining auto-inactivation
    expect(
      screen.getByText(/Sin un grupo con opciones activas, la oferta se guardará inactiva/)
    ).toBeVisible();
  });

  test("validates form fields before submitting", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });

    // Try submitting empty
    fireEvent.click(saveButton);
    expect(screen.getByText("El precio base debe ser un número positivo.")).toBeVisible();

    // Set price
    fireEvent.change(screen.getByLabelText(/Precio base/), { target: { value: "100" } });
    fireEvent.click(saveButton);
    expect(screen.getByText("La imagen de la oferta es obligatoria al crear.")).toBeVisible();

    // Provide image
    const file = new File(["bytes"], "test.png", { type: "image/png" });
    const fileInput = document.getElementById("offer-image-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.queryByText("Validando imagen…")).not.toBeInTheDocument();
    });

    // Still missing slots
    fireEvent.click(saveButton);
    expect(screen.getByText("La composición debe incluir al menos un grupo.")).toBeVisible();
  });

  test("submits create offer successfully", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });

    fireEvent.change(screen.getByLabelText(/Etiqueta de presentación/), {
      target: { value: "Combo Familiar" },
    });
    fireEvent.change(screen.getByLabelText(/Precio base/), { target: { value: "250" } });

    // Image
    const file = new File(["bytes"], "test.png", { type: "image/png" });
    const fileInput = document.getElementById("offer-image-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.queryByText("Validando imagen…")).not.toBeInTheDocument();
    });

    // Add slot
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Plato principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    // Add option
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Plato principal" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    const recipeArticle = await screen.findByRole("article", { name: "Receta Hamburguesa" });
    fireEvent.click(within(recipeArticle).getByRole("button", { name: "Asignar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Save offer
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(repository.createOffer).toHaveBeenCalledTimes(1);
    });

    expect(repository.createOffer).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({
        presentationTag: "Combo Familiar",
        basePrice: 250,
        composition: {
          slots: [
            expect.objectContaining({
              name: "Plato principal",
              options: [
                expect.objectContaining({
                  displayName: "Receta Hamburguesa",
                  recipeId: "rec-1",
                  sourceType: "RECIPE",
                }),
              ],
            }),
          ],
        },
      }),
      "img-offer-uploaded",
      expect.any(String)
    );

    // Navigates to offers page
    expect(await screen.findByText("Vista de ofertas")).toBeVisible();
  });

  test("submits update offer without replacing image", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });
    expect(screen.getByDisplayValue("Individual")).toBeVisible();

    fireEvent.change(screen.getByLabelText(/Precio base/), { target: { value: "175" } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    });

    expect(repository.updateOffer).toHaveBeenCalledWith(
      "offer-1",
      expect.objectContaining({
        presentationTag: "Individual",
        basePrice: 175,
        status: "ACTIVE",
      }),
      '"offer-rev-1"',
      expect.any(String),
      undefined
    );

    expect(await screen.findByText("Vista de ofertas")).toBeVisible();
  });

  test("displays structured error and violations from Axios 422 rejection while preserving form draft (O20, O33)", async () => {
    const repository = createMockRepository();
    const axios422Error = {
      isAxiosError: true,
      name: "AxiosError",
      message: "Request failed with status code 422",
      response: {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: { "content-type": "application/json" },
        data: {
          error: {
            message: "Datos de oferta inválidos según las reglas comerciales.",
            details: {
              code: "VALIDATION_FAILED",
              violations: [
                { path: "basePrice", message: "El precio base debe ser mayor a 0." },
              ],
            },
          },
        },
      },
    };
    repository.updateOffer.mockRejectedValueOnce(axios422Error);

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");
    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });

    // Verify initial loaded draft values
    expect(screen.getByDisplayValue("Individual")).toBeVisible();
    expect(screen.getByDisplayValue("150")).toBeVisible();

    fireEvent.click(saveButton);

    // Displays server message and structured violation details (not just generic Axios message)
    expect(
      await screen.findByText(/Datos de oferta inválidos según las reglas comerciales.*El precio base debe ser mayor a 0/)
    ).toBeVisible();

    // Draft values are preserved in the form
    expect(screen.getByDisplayValue("Individual")).toBeVisible();
    expect(screen.getByDisplayValue("150")).toBeVisible();
    expect(screen.queryByText("Vista de ofertas")).not.toBeInTheDocument();
  });

  test("displays error message if initial load fails", async () => {
    const repository = createMockRepository();
    repository.getEntry.mockRejectedValueOnce(new Error("Error al consultar la entrada"));

    renderComponent(repository);

    expect(await screen.findByText("Error al consultar la entrada")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  test("retries loading entry and offer in edit mode and populates recovered form data (O32)", async () => {
    const repository = createMockRepository();
    repository.getOffer.mockRejectedValueOnce(new Error("Error al consultar la oferta"));

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");
    expect(await screen.findByText("Error al consultar la oferta")).toBeVisible();

    // Form inputs must not be present while in loadError state
    expect(screen.queryByDisplayValue("Individual")).not.toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Reintentar" });
    fireEvent.click(retryBtn);

    // After retry, both getEntry and getOffer must have been called twice (1 initial + 1 retry)
    await waitFor(() => {
      expect(repository.getEntry).toHaveBeenCalledTimes(2);
      expect(repository.getOffer).toHaveBeenCalledTimes(2);
    });

    // Expect real recovered offer data displayed in inputs
    expect(await screen.findByDisplayValue("Individual")).toBeVisible();
    expect(screen.getByDisplayValue("150")).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar Oferta" })).toBeVisible();
  });

  test("blocks editing and displays error when offer does not belong to the entry in route (O11)", async () => {
    const repository = createMockRepository();
    repository.getOffer.mockResolvedValueOnce({
      data: {
        ...mockOffer,
        entryId: "entry-other-999", // Mismatch with route entry-1
      },
      etag: '"offer-rev-other"',
    });

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    expect(
      await screen.findByText("La oferta no pertenece a la entrada seleccionada.")
    ).toBeVisible();

    // Form and save controls are not rendered
    expect(screen.queryByRole("button", { name: "Guardar Oferta" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Etiqueta de presentación/)).not.toBeInTheDocument();
    // Retry button is also not rendered for route belonging mismatch
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  test("resets draft state and ignores in-flight validations when route identity changes (O12)", async () => {
    const repository = createMockRepository();
    let resolveBitmap: (val: unknown) => void = () => {};
    const bitmapPromise = new Promise((resolve) => {
      resolveBitmap = resolve;
    });

    const mockCreateImageBitmap = jest.fn().mockImplementation(() => bitmapPromise);
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: mockCreateImageBitmap,
    });

    function TestNavHelper({ to }: { to: string }) {
      const { Link } = jest.requireActual("react-router-dom");
      return <Link to={to}>Cambiar a Entrada 2</Link>;
    }

    render(
      <MemoryRouter initialEntries={["/entries/entry-1/offers/new"]}>
        <Routes>
          <Route
            path="/entries/:entryId/offers/new"
            element={
              <>
                <OfferFormPage repository={repository} />
                <TestNavHelper to="/entries/entry-2/offers/new" />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const tagInput = await screen.findByLabelText(/Etiqueta de presentación/);

    // Fill in presentation tag on entry-1
    fireEvent.change(tagInput, {
      target: { value: "Tag Entrada 1" },
    });
    expect(screen.getByDisplayValue("Tag Entrada 1")).toBeVisible();

    // Select an image on entry-1 (triggers in-flight validation via createImageBitmap)
    const file = new File(["dummy"], "entry1.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Navigate to entry-2 within the same router
    fireEvent.click(screen.getByRole("link", { name: "Cambiar a Entrada 2" }));
    fireEvent.click(await screen.findByRole("button", { name: "Descartar cambios" }));

    // Form draft is completely reset for entry-2
    await screen.findByLabelText(/Etiqueta de presentación/);
    expect(screen.queryByDisplayValue("Tag Entrada 1")).not.toBeInTheDocument();

    // Now resolve previous in-flight validation of entry-1
    resolveBitmap({ width: 1000, height: 1000, close: jest.fn() });

    // Ensure delayed resolution from entry-1 does not corrupt entry-2 state
    expect(screen.queryByText(/Error al validar/)).not.toBeInTheDocument();

    // Restore standard mock
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn().mockResolvedValue({ width: 1000, height: 1000, close: jest.fn() }),
    });
  });

  test("blocks submission while image validation is in progress and locks against concurrent double submits (O16)", async () => {
    const repository = createMockRepository();
    let resolveBitmap: (val: unknown) => void = () => {};
    const bitmapPromise = new Promise((resolve) => {
      resolveBitmap = resolve;
    });

    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn().mockImplementation(() => bitmapPromise),
    });

    renderComponent(repository, "/entries/entry-1/offers/new");
    const basePriceInput = await screen.findByLabelText(/Precio base/);

    // Fill minimum required fields
    fireEvent.change(basePriceInput, { target: { value: "100" } });

    // Select image which starts slow validation
    const file = new File(["dummy"], "slow.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit button should be disabled during image validation
    const submitBtn = screen.getByRole("button", { name: "Guardar Oferta" });
    expect(submitBtn).toBeDisabled();

    // Attempting submit while validating produces validation error
    fireEvent.submit(submitBtn.closest("form")!);
    expect(await screen.findByText("La imagen se está validando. Espera a que termine la validación.")).toBeVisible();
    expect(repository.createOffer).not.toHaveBeenCalled();

    // Restore standard mock and complete validation
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: jest.fn().mockResolvedValue({ width: 1000, height: 1000, close: jest.fn() }),
    });
    resolveBitmap({ width: 1000, height: 1000, close: jest.fn() });

    await waitFor(() => {
      expect(submitBtn).toBeEnabled();
    });

    // Add slot & option so form is valid
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Grupo 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Grupo 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    const recipeArticle = await screen.findByRole("article", { name: "Receta Hamburguesa" });
    fireEvent.click(within(recipeArticle).getByRole("button", { name: "Asignar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Now test concurrent submits: slow createOffer
    let resolveCreate: (val: MenuOfferDetail) => void = () => {};
    repository.createOffer.mockImplementationOnce(() => new Promise<MenuOfferDetail>((resolve) => {
      resolveCreate = resolve;
    }));

    // First click
    fireEvent.click(submitBtn);
    // Concurrent second click
    fireEvent.click(submitBtn);

    // createOffer should only be called once!
    await waitFor(() => {
      expect(repository.createOffer).toHaveBeenCalledTimes(1);
    });

    resolveCreate(mockOffer);
  });

  test("reuses confirmed imageId on uncertain outcome retry without re-uploading the image (O17)", async () => {
    const repository = createMockRepository();
    const storage = createControllableIndexedDbHarness();
    const storageAdapter = createIndexedDbPendingOperationStorage({ idbFactory: storage.factory });
    repository.uploadEntryImage.mockResolvedValueOnce("img-confirmed-999");
    repository.createOffer.mockRejectedValueOnce(new Error("Network timeout on create"));

    renderComponent(repository, "/entries/entry-1/offers/new", undefined, storageAdapter);
    const basePriceInput = await screen.findByLabelText(/Precio base/);

    // Fill form
    fireEvent.change(basePriceInput, { target: { value: "120" } });
    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Add slot & option
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Grupo 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Grupo 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    const recipeArticle = await screen.findByRole("article", { name: "Receta Hamburguesa" });
    fireEvent.click(within(recipeArticle).getByRole("button", { name: "Asignar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Guardar Oferta" });
    fireEvent.click(submitBtn);

    // uploadEntryImage was called
    await waitFor(() => {
      expect(repository.uploadEntryImage).toHaveBeenCalledTimes(1);
      expect(repository.createOffer).toHaveBeenCalledTimes(1);
    });

    // Uncertainty banner shows up
    expect(await screen.findByText(/La operación anterior no pudo confirmarse/)).toBeVisible();

    // Now retry createOffer
    repository.createOffer.mockResolvedValueOnce(mockOffer);
    const retryBtn = screen.getByRole("button", { name: "Reintentar" });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(repository.createOffer).toHaveBeenCalledTimes(2);
    });

    // uploadEntryImage was NOT called again (still 1)
    expect(repository.uploadEntryImage).toHaveBeenCalledTimes(1);
    // createOffer received the same confirmed imageId
    expect(repository.createOffer).toHaveBeenLastCalledWith(
      "entry-1",
      expect.anything(),
      "img-confirmed-999",
      expect.any(String)
    );
  });

  test("invalidates catalog entries cache on successful offer creation (O18)", async () => {
    const repository = createMockRepository();
    rememberEntries(repository, { page: 1, pageSize: 12 }, {
      data: [],
      meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
    });
    expect(cachedEntries(repository, { page: 1, pageSize: 12 })).toBeDefined();

    renderComponent(repository, "/entries/entry-1/offers/new");
    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Precio base/), { target: { value: "100" } });
    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Add slot & option
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Grupo 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Grupo 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    const recipeArticle = await screen.findByRole("article", { name: "Receta Hamburguesa" });
    fireEvent.click(within(recipeArticle).getByRole("button", { name: "Asignar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Guardar Oferta" });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Vista de ofertas")).toBeVisible();

    // Cache has been cleared!
    expect(cachedEntries(repository, { page: 1, pageSize: 12 })).toBeUndefined();
  });

  test("allows editing and deleting an existing slot in the offer", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Edit slot
    fireEvent.click(screen.getByRole("button", { name: "Editar grupo Plato principal" }));
    const slotInput = screen.getByLabelText("Nombre del grupo");
    fireEvent.change(slotInput, { target: { value: "Plato Fuerte Modificado" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));
    expect(screen.getByText("Plato Fuerte Modificado")).toBeVisible();

    // Delete slot
    fireEvent.click(screen.getByRole("button", { name: "Eliminar grupo Plato Fuerte Modificado" }));
    expect(screen.queryByText("Plato Fuerte Modificado")).not.toBeInTheDocument();
  });

  test("allows editing, deleting, and toggling options in the offer", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Toggle option status to inactive
    const toggleBtn = screen.getByRole("button", { name: "Cambiar estado de Hamburguesa Doble" });
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Activar");

    // Edit option
    fireEvent.click(screen.getByRole("button", { name: "Editar opción Hamburguesa Doble" }));
    const nameInput = screen.getByLabelText(/Nombre mostrado/);
    fireEvent.change(nameInput, { target: { value: "Hamburguesa Triple" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    expect(screen.getByText("Hamburguesa Triple")).toBeVisible();

    // Delete option
    fireEvent.click(screen.getByRole("button", { name: "Eliminar opción Hamburguesa Triple" }));
    expect(screen.queryByText("Hamburguesa Triple")).not.toBeInTheDocument();
  });

  test("opens recipe picker modal and closes it on cancel", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Open option modal
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Plato principal" }));
    // Open recipe picker
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    expect(await screen.findByRole("heading", { name: /Elegir receta ·/ })).toBeVisible();

    // Close recipe picker
    fireEvent.click(within(screen.getByRole("dialog", { name: /Elegir receta ·/ })).getByRole("button", { name: "Volver a la opción" }));
    expect(screen.queryByRole("heading", { name: /Elegir receta ·/ })).not.toBeInTheDocument();
  });

  test("handles image drop with format validation", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    const dropzone = screen.getByRole("button", {
      name: "Seleccionar o arrastrar imagen de la oferta",
    });

    // Drop valid image
    const validFile = new File(["valid"], "offer.jpg", { type: "image/jpeg" });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [validFile] },
    });

    await waitFor(() => {
      expect(screen.queryByText("Validando imagen…")).not.toBeInTheDocument();
    });

    // Drop invalid format (text/plain)
    const invalidFile = new File(["not image"], "notes.txt", { type: "text/plain" });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [invalidFile] },
    });

    expect(await screen.findByText("Selecciona una imagen JPEG, PNG o WebP.")).toBeVisible();
  });

  test("saves update offer as INACTIVE when all options are inactive", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });
    // Toggle option to inactive
    fireEvent.click(screen.getByRole("button", { name: "Cambiar estado de Hamburguesa Doble" }));
    // Submit
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    });

    expect(repository.updateOffer).toHaveBeenCalledWith(
      "offer-1",
      expect.objectContaining({
        status: "INACTIVE",
      }),
      '"offer-rev-1"',
      expect.any(String),
      undefined
    );
  });

  test("closes slot modal and option modal when clicking cancel", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Open SlotModal and cancel
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    expect(screen.getByRole("heading", { name: "Definir nuevo grupo" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar modal de grupo" }));
    expect(screen.queryByRole("heading", { name: "Definir nuevo grupo" })).not.toBeInTheDocument();

    // Open OptionModal and cancel
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Plato principal" }));
    expect(screen.getByRole("heading", { name: "Agregar opción · Plato principal" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar modal de opción" }));
    expect(screen.queryByRole("heading", { name: "Agregar opción · Plato principal" })).not.toBeInTheDocument();
  });

  test("handles safeReturnPath and catalogReturnTo from navigation state", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new", {
      returnTo: "/custom/return",
      catalogReturnTo: "/?q=custom",
    });

    await screen.findByRole("button", { name: "Guardar Oferta" });
    const backLink = screen.getByRole("link", { name: /Volver a ofertas/i });
    expect(backLink).toHaveAttribute("href", "/custom/return");

    const cancelLink = screen.getByRole("link", { name: "Cancelar" });
    expect(cancelLink).toHaveAttribute("href", "/custom/return");
  });

  test("rejects unsafe returnTo and catalogReturnTo paths", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new", {
      returnTo: "//malicious.com",
      catalogReturnTo: "http://malicious.com",
    });

    await screen.findByRole("button", { name: "Guardar Oferta" });
    const backLink = screen.getByRole("link", { name: /Volver a ofertas/i });
    expect(backLink).toHaveAttribute("href", "/entries/entry-1/offers");

    const cancelLink = screen.getByRole("link", { name: "Cancelar" });
    expect(cancelLink).toHaveAttribute("href", "/entries/entry-1/offers");
  });

  test("loads and updates an offer with an INVENTORY_ITEM option", async () => {
    const inventoryOffer: MenuOfferDetail = {
      ...mockOffer,
      composition: {
        slots: [
          {
            slotId: "slot-inv",
            name: "Bebida",
            quantity: 1,
            course: null,
            options: [
              {
                optionId: "opt-inv",
                displayName: "Refresco 500ml",
                status: "ACTIVE",
                sourceType: "INVENTORY_ITEM",
                inventoryItemId: "item-refresco",
                quantity: 1,
                unit: "botella",
              },
            ],
          },
        ],
      },
    };

    const repository = createMockRepository();
    repository.getOffer.mockResolvedValueOnce({ data: inventoryOffer, etag: '"offer-rev-inv"' });

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });
    expect(screen.getByText("Refresco 500ml")).toBeVisible();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    });

    expect(repository.updateOffer).toHaveBeenCalledWith(
      "offer-1",
      expect.objectContaining({
        composition: {
          slots: [
            expect.objectContaining({
              options: [
                expect.objectContaining({
                  sourceType: "INVENTORY_ITEM",
                  inventoryItemId: "item-refresco",
                  displayName: "Refresco 500ml",
                }),
              ],
            }),
          ],
        },
      }),
      '"offer-rev-inv"',
      expect.any(String),
      undefined
    );
  });

  test("validates when a slot has no options", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Fill valid base price
    fireEvent.change(screen.getByLabelText(/Precio base/), {
      target: { value: "150" },
    });

    // Upload valid image
    const validImage = new File(["dummy"], "offer.png", { type: "image/png" });
    const fileInput = document.getElementById("offer-image-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [validImage] } });

    await waitFor(() => {
      expect(screen.queryByText("Validando imagen…")).not.toBeInTheDocument();
    });

    // Add a slot without adding any options
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    const slotInput = await screen.findByLabelText("Nombre del grupo");
    fireEvent.change(slotInput, { target: { value: "Grupo Vacío" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    // Now submit
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));

    expect(
      await screen.findByText('El grupo "Grupo Vacío" debe incluir al menos una opción.')
    ).toBeVisible();
    expect(repository.createOffer).not.toHaveBeenCalled();
  });

  test("validates when image has an error before saving", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Fill valid base price
    fireEvent.change(screen.getByLabelText(/Precio base/), {
      target: { value: "150" },
    });

    // Upload an invalid image to cause an image error
    const invalidImage = new File(["dummy"], "bad.pdf", { type: "application/pdf" });
    const fileInput = document.getElementById("offer-image-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [invalidImage] } });

    expect(await screen.findByText("Selecciona una imagen JPEG, PNG o WebP.")).toBeVisible();

    // Now submit
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));

    expect(
      await screen.findByText("Corrige el error de la imagen antes de guardar.")
    ).toBeVisible();
    expect(repository.createOffer).not.toHaveBeenCalled();
  });

  test("handles non-Error objects gracefully when save fails", async () => {
    const repository = createMockRepository();
    repository.updateOffer.mockRejectedValueOnce("Error de servidor en texto plano");

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });
    fireEvent.click(saveButton);

    expect(
      await screen.findByText("Error de servidor en texto plano")
    ).toBeVisible();
  });

  test("handles dialog cancel event on recipe picker modal", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Open option modal
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Plato principal" }));
    // Open recipe picker
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    const dialog = screen.getByRole("dialog", { name: /Elegir receta ·/ });
    expect(dialog).toBeInTheDocument();

    // Fire native cancel event
    fireEvent(dialog, new Event("cancel"));

    expect(screen.queryByRole("dialog", { name: /Elegir receta ·/ })).not.toBeInTheDocument();
  });

  test("preserves option modal input when opening and canceling recipe picker (O13 single source)", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Open option modal for "Plato principal"
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Plato principal" }));

    // Type a custom display name in OptionModal
    const nameInput = screen.getByLabelText("Nombre mostrado (opcional)");
    fireEvent.change(nameInput, { target: { value: "Mi Opción Personalizada" } });
    expect(nameInput).toHaveValue("Mi Opción Personalizada");

    // Open recipe picker
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    expect(screen.getByRole("dialog", { name: /Elegir receta ·/ })).toBeInTheDocument();

    // Cancel recipe picker
    fireEvent.click(within(screen.getByRole("dialog", { name: /Elegir receta ·/ })).getByRole("button", { name: "Volver a la opción" }));
    expect(screen.queryByRole("dialog", { name: /Elegir receta ·/ })).not.toBeInTheDocument();

    // The display name must remain preserved in OptionModal
    expect(screen.getByLabelText("Nombre mostrado (opcional)")).toHaveValue("Mi Opción Personalizada");
  });

  test("assigns chosen recipe while preserving previously typed display name", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Plato principal" }));

    const nameInput = screen.getByLabelText("Nombre mostrado (opcional)");
    fireEvent.change(nameInput, { target: { value: "Etiqueta Especial" } });

    // Open recipe picker
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));

    // Choose the recipe from list
    await screen.findByRole("heading", { name: "Receta Hamburguesa", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

    // Recipe dialog closes and option modal has the recipe assigned, keeping the custom name
    expect(screen.queryByRole("dialog", { name: /Elegir receta ·/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre mostrado (opcional)")).toHaveValue("Etiqueta Especial");
    expect(screen.getByText("Receta asignada: Receta Hamburguesa")).toBeVisible();
  });

  test("restores nested parent context from pending recipe operation on mount", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();

    // Pre-populate storage with an interrupted recipe creation having nested offer context
    await storage.saveRecord({
      storageKey: buildOperationStorageKey(buildRecipeCreateScope()),
      scope: buildRecipeCreateScope(),
      createdAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
      currentStageIndex: 0,
      stages: [
        {
          attemptId: "att-1",
          operationKind: "recipe.create",
          method: "POST",
          endpointPath: "/menu/recipes",
          idempotencyKey: "11111111-1111-4111-8111-111111111111",
          payload: { kind: "json", serializedBody: "{}", payloadSnapshot: {} },
          createdAt: Date.now() - 5000,
          firstSentAt: Date.now() - 5000,
          firstConfirmedAt: null,
          lastAttemptAt: Date.now() - 5000,
          attemptCount: 1,
          status: "uncertain",
          submittedDraftVersion: 1,
          retryAfterSeconds: null,
          retryAfterUntil: null,
          retryAfterInvalid: false,
          possibleWriteApplied: true,
          lastErrorCode: "TIMEOUT",
          lastErrorMessage: "Tiempo de espera agotado",
        },
      ],
      confirmedImageId: null,
      ifMatch: null,
      editableDraft: {
        name: "Receta Recuperada",
        description: "Desc recuperada",
        instructions: "Inst recuperadas",
        supplies: [],
      },
      submittedDraftVersion: 1,
      currentDraftVersion: 1,
      nestedContext: {
        entryId: "entry-1",
        presentationTag: "Super Promo Anidada",
        basePrice: "250",
        desiredStatus: "ACTIVE",
        slots: [
          {
            slotId: "slot-anidado",
            name: "Plato Fuerte",
            quantity: 1,
            course: null,
            options: [],
          },
        ],
        targetSlotIndex: 0,
        editingOptionIndex: null,
        currentOptionDraft: {
          displayName: "Opción con borrador preservado",
          status: "ACTIVE",
          sourceType: "RECIPE",
        },
        optionModalOpen: true,
        recipePickerOpen: true,
      },
    });

    renderComponent(repository, "/entries/entry-1/offers/new", undefined, storage);

    // The parent commercial fields are restored
    expect(await screen.findByDisplayValue("Super Promo Anidada")).toBeVisible();
    expect(screen.getByDisplayValue("250")).toBeVisible();

    // Recovery opens the creation step in the single option task dialog.
    expect(await screen.findByRole("dialog", { name: "Nueva receta" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(await screen.findByRole("heading", { name: "Nueva receta", level: 2 })).toBeVisible();
    expect(screen.getByDisplayValue("Receta Recuperada")).toBeVisible();
  });

  test("UX12 rounds presentation only and submits the original price precision", async () => {
    const repository = createMockRepository();
    repository.getOffer.mockResolvedValueOnce({ data: { ...mockOffer, basePrice: 245.125 }, etag: '"offer-rev-1"' });
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");
    const price = await screen.findByLabelText("Precio base (MXN)");
    expect(price).toHaveValue(245.125);
    expect(document.querySelector("#offer-price-preview")?.textContent).toBe("MXN\u00a0245.13");
    fireEvent.change(price, { target: { value: "145.125" } });
    expect(price).toHaveValue(145.125);
    expect(document.querySelector("#offer-price-preview")?.textContent).toBe("MXN\u00a0145.13");
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
    await waitFor(() => expect(repository.updateOffer).toHaveBeenCalledTimes(1));
    expect(repository.updateOffer.mock.calls[0][1].basePrice).toBe(145.125);
  });

  test.each(["0", "-1", ""])("UX12 retains positive-price validation for %s without sending a request", async raw => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");
    const price = await screen.findByLabelText("Precio base (MXN)");
    fireEvent.change(price, { target: { value: raw } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
    expect(await screen.findByText("El precio base debe ser un número positivo.")).toBeVisible();
    expect(repository.updateOffer).not.toHaveBeenCalled();
    expect(repository.createOffer).not.toHaveBeenCalled();
  });

  test("UX12 server review formats its price without overwriting or adopting local edits", async () => {
    const repository = createMockRepository();
    repository.updateOffer.mockRejectedValueOnce(Object.assign(new Error("Precondition Failed"), { status: 412, response: { status: 412 } }));
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");
    const price = await screen.findByLabelText("Precio base (MXN)");
    fireEvent.change(price, { target: { value: "145.125" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
    const review = await screen.findByRole("button", { name: "Revisar oferta actual" });
    repository.getOffer.mockResolvedValueOnce({ data: { ...mockOffer, basePrice: 123456789.5 }, etag: '"offer-rev-2"' });
    fireEvent.click(review);
    const region = await screen.findByRole("region", { name: "Versión del servidor" });
    expect(within(region).getByText("MXN\u00a0123,456,789.50", { normalizer: text => text })).toBeVisible();
    expect(within(region).queryByText(/offer-rev-2/)).not.toBeInTheDocument();
    expect(price).toHaveValue(145.125);
    expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    expect(repository.updateOffer.mock.calls[0][1].basePrice).toBe(145.125);
    fireEvent.click(within(region).getByRole("button", { name: "Adoptar versión del servidor" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Versión del servidor" })).not.toBeInTheDocument());
    expect(price).toHaveValue(145.125);
    expect(document.querySelector("#offer-price-preview")?.textContent).toBe("MXN\u00a0145.13");
    expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
    await waitFor(() => expect(repository.updateOffer).toHaveBeenCalledTimes(2));
    expect(repository.updateOffer.mock.calls[1][1].basePrice).toBe(145.125);
    expect(repository.updateOffer.mock.calls[1][2]).toBe('"offer-rev-2"');
  });

  test("handles 412 Precondition Failed by preserving local draft and offering review / adoption (A01, A08)", async () => {
    const repository = createMockRepository();
    // Simulate initial offer read at rev 1
    repository.getOffer.mockResolvedValueOnce({
      data: mockOffer,
      etag: '"offer-rev-1"',
    });

    const error412 = Object.assign(new Error("Precondition Failed"), {
      response: { status: 412 },
      status: 412,
    });
    repository.updateOffer.mockRejectedValueOnce(error412);

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });
    const tagInput = screen.getByLabelText(/Etiqueta de presentación/);

    // User edits draft
    fireEvent.change(tagInput, { target: { value: "Edición Local de Usuario" } });
    expect(tagInput).toHaveValue("Edición Local de Usuario");

    fireEvent.click(saveButton);

    // Expect 412 notice banner
    expect(
      await screen.findByText(
        /Los datos de la oferta cambiaron en el servidor desde que se abrieron. Revisa la versión actual para decidir si adoptarla./
      )
    ).toBeVisible();

    // The user's typed draft is preserved (NOT overwritten by v2)
    expect(tagInput).toHaveValue("Edición Local de Usuario");

    // Click "Revisar oferta actual"
    const serverOfferV2 = {
      ...mockOffer,
      presentationTag: "Tag Actualizado en Servidor v2",
      basePrice: 999,
    };
    repository.getOffer.mockResolvedValueOnce({
      data: serverOfferV2,
      etag: '"offer-rev-2"',
    });

    const reviewButton = screen.getByRole("button", { name: "Revisar oferta actual" });
    fireEvent.click(reviewButton);

    // Review banner appears
    expect(
      await screen.findByRole("region", { name: "Versión del servidor" })
    ).toBeVisible();
    expect(screen.getByText(/Versión actual en el servidor:/)).toBeVisible();

    // Click "Adoptar versión del servidor"
    const adoptButton = screen.getByRole("button", { name: "Adoptar versión del servidor" });
    fireEvent.click(adoptButton);

    // Adoption updates composition/version while retaining the visible commercial draft.
    await waitFor(() => {
      expect(screen.getByLabelText(/Etiqueta de presentación/)).toHaveValue(
        "Edición Local de Usuario"
      );
    });
    expect(screen.getByLabelText(/Precio base/)).toHaveValue(mockOffer.basePrice);
  });

  test("restores uncertain attempt on mount without auto-submitting and allows retry with same idempotency key (A01, A08)", async () => {
    const repository = createMockRepository();
    const storage = createMemoryStorage();
    const idempotencyKey = "22222222-2222-4222-8222-222222222222";
    const scope = buildOfferUpdateScope("offer-1");
    const storageKey = buildOperationStorageKey(scope);

    const restoredPayload: OfferUpdateDraft = {
      presentationTag: "Oferta Recuperada de Intento Incierto",
      basePrice: 350,
      status: "ACTIVE",
      composition: {
        slots: [
          {
            slotId: "slot-1",
            name: "Base",
            quantity: 1,
            course: null,
            options: [
              {
                optionId: "opt-1",
                displayName: "Hamburguesa Doble",
                status: "ACTIVE",
                sourceType: "RECIPE",
                recipeId: "rec-1",
              },
            ],
          },
        ],
      },
    };

    await storage.saveRecord({
      storageKey,
      scope,
      currentStageIndex: 0,
      createdAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
      stages: [
        {
          attemptId: "att-offer-patch-1",
          operationKind: "offer.patch",
          method: "PATCH",
          endpointPath: "/menu/offers/offer-1",
          idempotencyKey,
          payload: sealJsonPayload(restoredPayload, '"offer-rev-1"'),
          createdAt: Date.now() - 5000,
          firstSentAt: Date.now() - 5000,
          firstConfirmedAt: null,
          lastAttemptAt: Date.now() - 5000,
          attemptCount: 1,
          status: "uncertain",
          submittedDraftVersion: 1,
          retryAfterSeconds: null,
          retryAfterUntil: null,
          retryAfterInvalid: false,
          possibleWriteApplied: true,
          lastErrorCode: "TIMEOUT",
          lastErrorMessage: "Tiempo de espera agotado al contactar al servidor",
        },
      ],
      confirmedImageId: null,
      ifMatch: '"offer-rev-1"',
      editableDraft: {
        presentationTag: "Oferta Recuperada de Intento Incierto",
        basePrice: "350",
        desiredStatus: "ACTIVE",
        slots: [
          {
            slotId: "slot-1",
            localId: "loc-slot-1",
            name: "Base",
            quantity: 1,
            course: null,
            options: [
              {
                optionId: "opt-1",
                localId: "loc-opt-1",
                displayName: "Hamburguesa Doble",
                status: "ACTIVE",
                sourceType: "RECIPE",
                recipeId: "rec-1",
              },
            ],
          },
        ],
      },
      submittedDraftVersion: 1,
      currentDraftVersion: 1,
    });

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit", undefined, storage);

    // Restores draft in form without auto-sending
    expect(await screen.findByDisplayValue("Oferta Recuperada de Intento Incierto")).toBeVisible();
    expect(repository.updateOffer).not.toHaveBeenCalled();

    // Banner indicates uncertain attempt
    expect(
      screen.getByText(/La operación anterior no pudo confirmarse./)
    ).toBeVisible();

    // Click "Reintentar"
    const retryButton = screen.getByRole("button", { name: "Reintentar" });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    });

    // Reused original idempotency key and original if-match
    expect(repository.updateOffer).toHaveBeenCalledWith(
      "offer-1",
      expect.objectContaining({
        presentationTag: "Oferta Recuperada de Intento Incierto",
        basePrice: 350,
      }),
      '"offer-rev-1"',
      idempotencyKey,
      undefined
    );

    // Navigates successfully
    expect(await screen.findByText("Vista de ofertas")).toBeVisible();
  });

  test("does not send recipeRevision in create or update draft JSON payloads (Invariant 5)", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    });

    const updatePayload = repository.updateOffer.mock.calls[0][1];
    expect(updatePayload).toBeDefined();
    for (const slot of updatePayload.composition?.slots ?? []) {
      for (const opt of slot.options ?? []) {
        expect(opt).not.toHaveProperty("recipeRevision");
      }
    }
  });

  test("omits recipeId in PATCH when existing recipe option was not re-selected, but includes it upon explicit selection of the same or another recipe (O13, O14, O35)", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Step A: Edit display name of existing option without selecting recipe
    fireEvent.click(screen.getByRole("button", { name: "Editar opción Hamburguesa Doble" }));
    const nameInput = screen.getByLabelText("Nombre mostrado (opcional)");
    fireEvent.change(nameInput, { target: { value: "Hamburguesa Doble Renombrada" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Save offer
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));

    await waitFor(() => {
      expect(repository.updateOffer).toHaveBeenCalledTimes(1);
    });

    const call1Payload = repository.updateOffer.mock.calls[0][1];
    const call1Option = call1Payload.composition?.slots?.[0]?.options?.[0];
    expect(call1Option).toBeDefined();
    expect(call1Option?.optionId).toBe("opt-1");
    expect(call1Option?.displayName).toBe("Hamburguesa Doble Renombrada");
    expect(call1Option).not.toHaveProperty("recipeId");
    expect(call1Option).not.toHaveProperty("recipeRevision");

    // Step B: In another instance, open picker and cancel -> still omits recipeId
    const repository2 = createMockRepository();
    renderComponent(repository2, "/entries/entry-1/offers/offer-1/edit");
    await screen.findByRole("button", { name: "Guardar Oferta" });

    fireEvent.click(screen.getByRole("button", { name: "Editar opción Hamburguesa Doble" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    // Cancel recipe picker without selecting
    fireEvent.click(within(screen.getByRole("dialog", { name: /Elegir receta ·/ })).getByRole("button", { name: "Volver a la opción" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));

    await waitFor(() => {
      expect(repository2.updateOffer).toHaveBeenCalledTimes(1);
    });
    const call2Option = repository2.updateOffer.mock.calls[0][1].composition?.slots?.[0]?.options?.[0];
    expect(call2Option).not.toHaveProperty("recipeId");

    // Step C: Explicitly select the same recipe ("rec-1") -> sets intent and includes recipeId
    const repository3 = createMockRepository();
    renderComponent(repository3, "/entries/entry-1/offers/offer-1/edit");
    await screen.findByRole("button", { name: "Guardar Oferta" });

    fireEvent.click(screen.getByRole("button", { name: "Editar opción Hamburguesa Doble" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    await screen.findByRole("heading", { name: "Receta Hamburguesa", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));

    await waitFor(() => {
      expect(repository3.updateOffer).toHaveBeenCalledTimes(1);
    });
    const call3Option = repository3.updateOffer.mock.calls[0][1].composition?.slots?.[0]?.options?.[0];
    expect(call3Option).toBeDefined();
    if (call3Option && call3Option.sourceType === "RECIPE") {
      expect(call3Option.recipeId).toBe("rec-1");
    }
    expect(call3Option).not.toHaveProperty("recipeRevision");
  });

  test("omits option status in POST draft payload on offer creation (O15, O35)", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Fill valid commercial info
    fireEvent.change(screen.getByLabelText(/Etiqueta de presentación/), {
      target: { value: "Promo Estudiante" },
    });
    fireEvent.change(screen.getByLabelText("Precio base (MXN)"), {
      target: { value: "199" },
    });

    // Provide image
    const fakeFile = new File(["fake"], "combo.png", { type: "image/png" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.queryByText("Validando imagen…")).not.toBeInTheDocument();
    });

    // Add slot
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Combo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    // Add recipe option
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Combo" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    await screen.findByRole("heading", { name: "Receta Hamburguesa", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Submit offer create
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));

    await waitFor(() => {
      expect(repository.createOffer).toHaveBeenCalledTimes(1);
    });

    const createPayload = repository.createOffer.mock.calls[0][1];
    expect(createPayload).toBeDefined();
    const createdOption = createPayload.composition.slots[0].options[0];
    expect(createdOption.displayName).toBe("Receta Hamburguesa");
    expect(createdOption.sourceType).toBe("RECIPE");
    if (createdOption.sourceType === "RECIPE") {
      expect(createdOption.recipeId).toBe("rec-1");
    }
    expect(createdOption).not.toHaveProperty("status");
    expect(createdOption).not.toHaveProperty("optionId");
    expect(createdOption).not.toHaveProperty("recipeRevision");
  });

  test("Escape returns from recipe selection preserving draft/focus, then confirms discard before closing (O19, O34) (O19, O34)", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    // Add a slot
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    // Open option modal
    const addOptBtn = screen.getByRole("button", { name: "Agregar opción a Principal" });
    fireEvent.click(addOptBtn);

    // Type custom display name
    const nameInput = screen.getByLabelText("Nombre mostrado (opcional)");
    fireEvent.change(nameInput, { target: { value: "Mi Selección Favorita" } });

    // Open recipe picker
    const pickerBtn = screen.getByRole("button", { name: /Elegir receta/ });
    fireEvent.click(pickerBtn);
    expect(screen.getByRole("dialog", { name: /Elegir receta ·/ })).toBeInTheDocument();

    // First Escape -> closes ONLY the nested recipe picker
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog", { name: /Elegir receta ·/ })).not.toBeInTheDocument();

    // OptionModal remains open with draft preserved
    expect(screen.getByRole("dialog", { name: /Agregar opción/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre mostrado (opcional)")).toHaveValue("Mi Selección Favorita");

    expect(pickerBtn).toHaveFocus();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    // Second Escape requests explicit discard of the edited option.
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("heading", { name: "¿Descartar los cambios sin guardar?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(nameInput).toHaveValue("Mi Selección Favorita");
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Slot "Principal" remains intact in the form
    expect(screen.getByRole("heading", { name: "Principal", level: 3 })).toBeVisible();
  });

  test("validates option fields and slots rejecting invalid attempts with 0 repository calls, and succeeds with exact payload upon correction (O09, O21, O35, O38)", async () => {
    const repository = createMockRepository();
    renderComponent(repository, "/entries/entry-1/offers/new");

    await screen.findByRole("button", { name: "Guardar Oferta" });

    fireEvent.change(screen.getByLabelText(/Etiqueta de presentación/), {
      target: { value: "Oferta Válida" },
    });
    fireEvent.change(screen.getByLabelText("Precio base (MXN)"), {
      target: { value: "150" },
    });

    const fakeFile = new File(["fake"], "combo.png", { type: "image/png" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.queryByText("Validando imagen…")).not.toBeInTheDocument();
    });

    // Attempt 1: submit with 0 slots -> rejected, 0 calls
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
    expect(await screen.findByText("La composición debe incluir al menos un grupo.")).toBeVisible();
    expect(repository.createOffer).not.toHaveBeenCalled();

    // Add slot with 0 options
    fireEvent.click(screen.getByRole("button", { name: "Agregar grupo" }));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), { target: { value: "Entrada" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    // Attempt 2: submit slot with 0 options -> rejected, 0 calls
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
    expect(await screen.findByText('El grupo "Entrada" debe incluir al menos una opción.')).toBeVisible();
    expect(repository.createOffer).not.toHaveBeenCalled();

    // Correct: add valid recipe option
    fireEvent.click(screen.getByRole("button", { name: "Agregar opción a Entrada" }));
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    await screen.findByRole("heading", { name: "Receta Hamburguesa", level: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar opción" }));

    // Attempt 3: submit valid offer -> exact 1 call
    fireEvent.click(screen.getByRole("button", { name: "Guardar Oferta" }));
    await waitFor(() => {
      expect(repository.createOffer).toHaveBeenCalledTimes(1);
    });
    expect(repository.createOffer).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({
        presentationTag: "Oferta Válida",
        basePrice: 150,
        composition: {
          slots: [
            {
              name: "Entrada",
              quantity: 1,
              course: null,
              options: [
                {
                  sourceType: "RECIPE",
                  recipeId: "rec-1",
                  displayName: "Receta Hamburguesa",
                },
              ],
            },
          ],
        },
      }),
      "img-offer-uploaded",
      expect.any(String)
    );
  });
});
