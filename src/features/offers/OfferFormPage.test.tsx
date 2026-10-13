import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type {
  MenuEntryDetail,
  MenuOfferDetail,
  MenuRepository,
  RecipeSummary,
} from "../../application/catalog";
import { OfferFormPage } from "./OfferFormPage";

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
            recipeRevision: 1,
          },
        ],
      },
    ],
  },
};

function createMockRepository(): jest.Mocked<MenuRepository> {
  return {
    listEntries: jest.fn(),
    listCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    setEntryStatus: jest.fn(),
    deleteArchivedEntry: jest.fn(),
    getEntry: jest.fn().mockResolvedValue(mockEntry),
    createEntry: jest.fn(),
    updateEntry: jest.fn(),
    listOffers: jest.fn(),
    getOffer: jest.fn().mockResolvedValue(mockOffer),
    createOffer: jest.fn().mockResolvedValue(mockOffer),
    updateOffer: jest.fn().mockResolvedValue(mockOffer),
    setOfferStatus: jest.fn(),
    deleteInactiveOffer: jest.fn(),
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

function renderComponent(
  repository: MenuRepository,
  path = "/entries/entry-1/offers/new",
  state?: unknown
) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/entries/:entryId/offers/new" element={<OfferFormPage repository={repository} />} />
        <Route path="/entries/:entryId/offers/:offerId/edit" element={<OfferFormPage repository={repository} />} />
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
    expect(screen.getByText(/Toda oferta se crea con estado inactivo/)).toBeVisible();

    // Section 2: Composition
    expect(screen.getByRole("heading", { name: "2. Composición", level: 2 })).toBeVisible();
    expect(screen.getByRole("button", { name: "Copiar composición desde otra oferta" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Agregar grupo" })).toBeVisible();
  });

  test("shows notice when clicking copy composition button (V8 placeholder)", async () => {
    const repository = createMockRepository();
    renderComponent(repository);

    const copyBtn = await screen.findByRole("button", {
      name: "Copiar composición desde otra oferta",
    });
    fireEvent.click(copyBtn);

    expect(
      screen.getByText("La copia de composición desde otra oferta se implementará en V8.")
    ).toBeVisible();
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
    fireEvent.change(screen.getByLabelText(/Unidades incluidas/), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/Curso \/ tiempo sugerido/), {
      target: { value: "plato fuerte" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar grupo" }));

    expect(screen.queryByRole("heading", { name: "Definir nuevo grupo" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acompañamiento", level: 3 })).toBeVisible();
    expect(screen.getByText("2 rondas")).toBeVisible();
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

  test("adds an option via OptionModal (C32) and selects a recipe via V6", async () => {
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

    // Click inventory button -> shows notice for V7
    fireEvent.click(screen.getByRole("button", { name: /Elegir artículo de inventario/ }));
    expect(
      screen.getByText("La selección interactiva de artículos de inventario se implementará en V7.")
    ).toBeVisible();

    // Click recipe button -> opens V6 RecipePage
    fireEvent.click(screen.getByRole("button", { name: /Elegir receta/ }));
    expect(await screen.findByRole("heading", { name: "Biblioteca de recetas — elegir opción" })).toBeVisible();

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
    expect(screen.getByRole("button", { name: "Cambiar estado de Hamburguesa Especial" })).toHaveTextContent("Activa");

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
    expect(toggleBtn).toHaveTextContent("Inactiva");

    // Slot is now Inactivo
    expect(within(slotCard).getByText("Inactivo")).toBeVisible();

    // Warning appears in commercial info explaining auto-inactivation
    expect(
      screen.getByText(/La oferta se mantiene inactiva porque no tiene ningún grupo activo/)
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
    expect(screen.getByText("La composición debe incluir al menos un grupo (slot).")).toBeVisible();
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
      file
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
      undefined
    );

    expect(await screen.findByText("Vista de ofertas")).toBeVisible();
  });

  test("displays error message if server rejects save", async () => {
    const repository = createMockRepository();
    repository.updateOffer.mockRejectedValueOnce(new Error("Error 422: Datos de oferta inválidos"));

    renderComponent(repository, "/entries/entry-1/offers/offer-1/edit");
    const saveButton = await screen.findByRole("button", { name: "Guardar Oferta" });

    fireEvent.click(saveButton);

    expect(await screen.findByText("Error 422: Datos de oferta inválidos")).toBeVisible();
    expect(screen.queryByText("Vista de ofertas")).not.toBeInTheDocument();
  });

  test("displays error message if initial load fails", async () => {
    const repository = createMockRepository();
    repository.getEntry.mockRejectedValueOnce(new Error("Error al consultar la entrada"));

    renderComponent(repository);

    expect(await screen.findByText("Error al consultar la entrada")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});
