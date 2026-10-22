import { expect, test } from "@playwright/test";

test("creates and deletes an offer updating catalog offerCount within cache TTL without page reload (O18)", async ({
  page,
}) => {
  let offerCount = 0;
  const entry = {
    id: "entry-1",
    brandName: "Hamburguesa Hawaiana",
    description: "Con piña",
    status: "ACTIVE",
    image: null,
    categories: [],
    get offerCount() {
      return offerCount;
    },
  };

  const recipe = {
    id: "rec-1",
    name: "Receta Hamburguesa",
    description: "Preparación base",
    supplies: [],
  };

  const createdOffer = {
    id: "offer-1",
    entryId: "entry-1",
    entryName: entry.brandName,
    presentationTag: "Combo Especial",
    basePrice: 250,
    status: "INACTIVE",
    image: {
      id: "img-offer-1",
      url: "https://example.com/combo.jpg",
      thumbnailUrl: "https://example.com/thumb.jpg",
    },
    slotCount: 1,
    composition: {
      slots: [
        {
          slotId: "slot-1",
          name: "Principal",
          quantity: 1,
          status: "ACTIVE",
          options: [
            {
              optionId: "opt-1",
              displayName: "Receta Hamburguesa",
              status: "ACTIVE",
              sourceType: "RECIPE",
              recipeId: "rec-1",
            },
          ],
        },
      ],
    },
  };

  let currentOffers: Array<typeof createdOffer> = [];

  await page.route("**/api/v1/menu/categories?*", (route) =>
    route.fulfill({
      json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
    }),
  );

  await page.route("**/api/v1/menu/recipes?*", (route) =>
    route.fulfill({
      json: { data: [recipe], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } },
    }),
  );

  await page.route("**/api/v1/menu/entries?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: entry.id,
            brandName: entry.brandName,
            description: entry.description,
            status: entry.status,
            image: entry.image,
            categories: entry.categories,
            offerCount: entry.offerCount,
          },
        ],
        meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
      },
    }),
  );

  await page.route("**/api/v1/menu/entries/entry-1", (route) =>
    route.fulfill({
      json: {
        data: {
          id: entry.id,
          brandName: entry.brandName,
          description: entry.description,
          status: entry.status,
          image: entry.image,
          categories: entry.categories,
          offerCount: entry.offerCount,
          categoryIds: [],
        },
      },
    }),
  );

  await page.route("**/api/v1/menu/offers?*", (route) =>
    route.fulfill({
      json: {
        data: currentOffers,
        meta: { page: 1, pageSize: 12, total: currentOffers.length, totalPages: currentOffers.length > 0 ? 1 : 0 },
      },
    }),
  );

  await page.route("**/api/v1/media/images", (route) =>
    route.fulfill({
      status: 201,
      json: {
        data: {
          id: "img-offer-1",
          url: "https://example.com/combo.jpg",
          thumbnailUrl: "https://example.com/thumb.jpg",
        },
      },
    }),
  );

  await page.route("**/api/v1/menu/entries/entry-1/offers", async (route) => {
    if (route.request().method() === "POST") {
      offerCount = 1;
      currentOffers = [createdOffer];
      await route.fulfill({
        status: 201,
        headers: { ETag: '"offer-rev-1"' },
        json: { data: createdOffer },
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/v1/menu/offers/offer-1", async (route) => {
    if (route.request().method() === "DELETE") {
      offerCount = 0;
      currentOffers = [];
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({
      headers: { ETag: '"offer-rev-1"' },
      json: { data: createdOffer },
    });
  });

  // Step 1: Open catalog and populate cache (30s TTL). Shows 0 offers.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entradas del menú" })).toBeVisible();
  const entryCard = page.getByRole("article");
  await expect(entryCard.getByRole("heading", { name: "Hamburguesa Hawaiana", level: 2 })).toBeVisible();
  await expect(entryCard).toContainText("Ofertas: 0");

  // Step 2: Navigate to entry's offers page without F5
  await page.getByRole("link", { name: "Ver ofertas de Hamburguesa Hawaiana" }).click();
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  await expect(page.getByText("No hay ofertas configuradas.")).toBeVisible();

  // Step 3: Open create offer form
  await page.getByRole("link", { name: "Crear primera oferta" }).click();
  await expect(page.getByRole("heading", { name: "Nueva oferta" })).toBeVisible();

  // Step 4: Fill offer form
  await page.getByLabel("Etiqueta de presentación").fill("Combo Especial");
  await page.getByLabel("Precio base").fill("250");

  // Upload image (1x1 transparent PNG)
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "combo.png",
    mimeType: "image/png",
    buffer: png1x1,
  });

  // Add composition slot
  await page.getByRole("button", { name: "Agregar grupo" }).click();
  await page.getByLabel("Nombre del grupo").fill("Principal");
  await page.getByRole("button", { name: "Guardar grupo" }).click();

  // Add option to slot
  await page.getByRole("button", { name: "Agregar opción a Principal" }).click();
  await page.getByRole("button", { name: "Elegir receta" }).click();
  const recipeArticle = page.getByRole("article", { name: "Receta Hamburguesa" });
  await recipeArticle.getByRole("button", { name: "Asignar" }).click();
  await page.getByRole("button", { name: "Guardar opción" }).click();

  // Step 5: Save offer -> invalidates catalog entries cache and navigates to offers view
  await page.getByRole("button", { name: "Guardar Oferta" }).click();
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Combo Especial" })).toBeVisible();

  // Step 6: Return to catalog within 30s TTL without F5 -> verifies offerCount incremented to 1
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(page.getByRole("heading", { name: "Entradas del menú" })).toBeVisible();
  await expect(entryCard.getByRole("heading", { name: "Hamburguesa Hawaiana", level: 2 })).toBeVisible();
  await expect(entryCard).toContainText("Ofertas: 1");

  // Step 7: Re-enter offers view without F5
  await page.getByRole("link", { name: "Ver ofertas de Hamburguesa Hawaiana" }).click();
  await expect(page.getByRole("heading", { name: "Combo Especial" })).toBeVisible();

  // Step 8: Delete offer -> invalidates catalog entries cache
  await page.getByRole("button", { name: "Eliminar oferta Combo Especial" }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Eliminar oferta", exact: true }).click();

  await expect(page.getByText("Oferta eliminada.")).toBeVisible();
  await expect(page.getByText("No hay ofertas configuradas.")).toBeVisible();

  // Step 9: Return to catalog within 30s TTL without F5 -> verifies offerCount decremented to 0
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(page.getByRole("heading", { name: "Entradas del menú" })).toBeVisible();
  await expect(entryCard.getByRole("heading", { name: "Hamburguesa Hawaiana", level: 2 })).toBeVisible();
  await expect(entryCard).toContainText("Ofertas: 0");
});

test("manages multi-modal Escape hierarchy preserving option draft and restoring focus without losing composition (O19, O34)", async ({
  page,
}) => {
  const entry = {
    id: "entry-1",
    brandName: "Hamburguesa Hawaiana",
    description: "Con piña",
    status: "ACTIVE",
    image: null,
    categories: [],
    offerCount: 0,
  };

  const recipe = {
    id: "rec-1",
    name: "Receta Hamburguesa",
    description: "Preparación base",
    supplies: [],
  };

  await page.route("**/api/v1/menu/categories?*", (route) =>
    route.fulfill({
      json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
    }),
  );

  await page.route("**/api/v1/menu/recipes?*", (route) =>
    route.fulfill({
      json: { data: [recipe], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } },
    }),
  );

  await page.route("**/api/v1/menu/entries/entry-1", (route) =>
    route.fulfill({
      json: {
        data: {
          id: entry.id,
          brandName: entry.brandName,
          description: entry.description,
          status: entry.status,
          image: entry.image,
          categories: entry.categories,
          offerCount: entry.offerCount,
          categoryIds: [],
        },
      },
    }),
  );

  // Navigate directly to new offer form for entry-1
  await page.goto("/entries/entry-1/offers/new");
  await expect(page.getByRole("heading", { name: "Nueva oferta" })).toBeVisible();

  // Add composition slot "Acompañamiento"
  const addSlotBtn = page.getByRole("button", { name: "Agregar grupo" });
  await addSlotBtn.click();
  await page.getByLabel("Nombre del grupo").fill("Acompañamiento");
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await expect(page.getByRole("heading", { name: "Acompañamiento", level: 3 })).toBeVisible();

  // Open option modal
  const addOptionBtn = page.getByRole("button", { name: "Agregar opción a Acompañamiento" });
  await addOptionBtn.click();
  const optionDialog = page.getByRole("dialog", { name: /Agregar opción/ });
  await expect(optionDialog).toBeVisible();

  // Type a custom display name in the option draft
  const displayNameInput = page.getByLabel("Nombre mostrado (opcional)");
  await displayNameInput.fill("Papas Rústicas");

  // Open nested recipe picker
  const chooseRecipeBtn = page.getByRole("button", { name: "Elegir receta" });
  await chooseRecipeBtn.click();
  const recipeDialog = page.getByRole("dialog", { name: "Biblioteca de recetas" });
  await expect(recipeDialog).toBeVisible();

  // Press Escape while nested recipe picker is open
  await page.keyboard.press("Escape");

  // Verify only recipeDialog closes while optionDialog remains open and draft is intact
  await expect(recipeDialog).not.toBeVisible();
  await expect(optionDialog).toBeVisible();
  await expect(displayNameInput).toHaveValue("Papas Rústicas");

  // Focus is restored to the "Elegir receta" button inside OptionModal
  await expect(chooseRecipeBtn).toBeFocused();

  // Press Escape again while OptionModal is top dialog
  await page.keyboard.press("Escape");

  // Verify OptionModal closes and composition slot remains intact
  await expect(optionDialog).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Acompañamiento", level: 3 })).toBeVisible();
  await expect(addOptionBtn).toBeFocused();
});
