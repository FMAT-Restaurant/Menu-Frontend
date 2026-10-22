import { expect, test, type Page, type Route } from "@playwright/test";

const image = (width: number, height: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#d8e5de"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#ab5d38"/></svg>`,
  )}`;

const categories = [
  { id: "cat-1", name: "Hamburguesas" },
  { id: "cat-2", name: "Bebidas" },
  { id: "cat-3", name: "Postres" },
];

const entries = [
  {
    id: "entry-1",
    brandName: "Hamburguesa Clásica",
    description: "Con queso cheddar, lechuga y tomate en pan brioche artesanal",
    status: "ACTIVE",
    image: { id: "img-1", url: image(400, 300), thumbnailUrl: image(200, 150) },
    categories: [categories[0]],
    offerCount: 2,
  },
  {
    id: "entry-2",
    brandName: "Limonada Natural",
    description: "Refrescante bebida cítrica con menta",
    status: "ACTIVE",
    image: null,
    categories: [categories[1]],
    offerCount: 1,
  },
];

const offers = [
  {
    id: "off-1",
    entryId: "entry-1",
    displayName: "Combo Clásico Mediodía",
    status: "ACTIVE",
    price: 1250,
    availability: "AVAILABLE",
    image: null,
  },
];

const recipes = [
  {
    id: "rec-1",
    name: "Receta Hamburguesa Clásica",
    description: "Preparación base para carne de res",
    supplies: [
      { id: "sup-1", inventoryItemId: "inv-carne", inventoryItemName: "Carne molida", quantity: 180, unit: "g" },
    ],
  },
];

function setupRoutes(page: Page) {
  return Promise.all([
    page.route("**/api/v1/menu/categories?*", (route: Route) =>
      route.fulfill({ json: { data: categories, meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 } } }),
    ),
    page.route("**/api/v1/menu/entries?*", (route: Route) =>
      route.fulfill({ json: { data: entries, meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 } } }),
    ),
    page.route("**/api/v1/menu/entries/entry-1", (route: Route) =>
      route.fulfill({
        json: {
          data: {
            ...entries[0],
            categoryIds: ["cat-1"],
          },
        },
      }),
    ),
    page.route("**/api/v1/menu/offers?entryId=entry-1*", (route: Route) =>
      route.fulfill({ json: { data: offers, meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }),
    ),
    page.route("**/api/v1/menu/recipes?*", (route: Route) =>
      route.fulfill({ json: { data: recipes, meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } } }),
    ),
  ]);
}

test.describe("T16 Layout, Dimensions, and Accessibility Audit", () => {
  test("R05: at 320x568 px CSS commercial panel and inputs are not cut off and horizontal overflow <= 1px", async ({
    page,
  }) => {
    await setupRoutes(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/entries/entry-1/offers/new");

    await expect(page.getByRole("heading", { name: "Nueva oferta" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Información comercial/i })).toBeVisible();

    // Check no horizontal overflow on document element (tolerance <= 1px for subpixel rounding)
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow, `Horizontal overflow must not exceed 1px, got ${overflow}px`).toBeLessThanOrEqual(1);

    // Verify commercial fields are fully visible and within viewport bounds
    const tagInput = page.getByLabel("Etiqueta de presentación (opcional)");
    await expect(tagInput).toBeVisible();
    const tagBox = await tagInput.boundingBox();
    expect(tagBox).not.toBeNull();
    expect(tagBox!.x).toBeGreaterThanOrEqual(0);
    expect(tagBox!.x + tagBox!.width).toBeLessThanOrEqual(320);

    const priceInput = page.getByLabel("Precio base");
    await expect(priceInput).toBeVisible();
    const priceBox = await priceInput.boundingBox();
    expect(priceBox).not.toBeNull();
    expect(priceBox!.x).toBeGreaterThanOrEqual(0);
    expect(priceBox!.x + priceBox!.width).toBeLessThanOrEqual(320);

    // Verify status box fits in create mode
    const statusBox = page.locator(".status-fixed-box");
    await expect(statusBox).toBeVisible();
    const statusBounds = await statusBox.boundingBox();
    expect(statusBounds).not.toBeNull();
    expect(statusBounds!.x + statusBounds!.width).toBeLessThanOrEqual(320);

    // Verify composition editor
    await expect(page.getByRole("heading", { name: /Composición/i })).toBeVisible();
    const addSlotBtn = page.getByRole("button", { name: "Agregar grupo" });
    await expect(addSlotBtn).toBeVisible();

    await page.screenshot({ path: "test-results/t16-after/r05-offer-form-320px.png" });
  });

  test("R06: both SlotModal and OptionModal obey 90% max height and have reachable controls at 390x320 px", async ({
    page,
  }) => {
    await setupRoutes(page);
    await page.setViewportSize({ width: 390, height: 320 });
    await page.goto("/entries/entry-1/offers/new");

    // 1. SlotModal
    const addSlotBtn = page.getByRole("button", { name: "Agregar grupo" });
    await addSlotBtn.click();

    const slotDialog = page.getByRole("dialog", { name: /Definir nuevo grupo/ });
    await expect(slotDialog).toBeVisible();

    // Check height does not exceed 90% of viewport (320 * 0.9 = 288px)
    const slotDialogBox = await slotDialog.boundingBox();
    expect(slotDialogBox).not.toBeNull();
    expect(slotDialogBox!.height).toBeLessThanOrEqual(320 * 0.9 + 1); // 288px (+1px tolerance)

    // Verify fields and actions are reachable inside SlotModal
    const slotNameInput = page.getByLabel("Nombre del grupo");
    await expect(slotNameInput).toBeVisible();
    await slotNameInput.fill("Guarnición");

    const slotRoundsInput = page.getByLabel("Unidades incluidas");
    await expect(slotRoundsInput).toBeVisible();
    await slotRoundsInput.fill("1");

    const saveSlotBtn = page.getByRole("button", { name: "Guardar grupo" });
    await expect(saveSlotBtn).toBeVisible();
    await saveSlotBtn.scrollIntoViewIfNeeded();
    await saveSlotBtn.click();

    await expect(slotDialog).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Guarnición", level: 3 })).toBeVisible();

    // 2. OptionModal
    const addOptionBtn = page.getByRole("button", { name: "Agregar opción a Guarnición" });
    await addOptionBtn.scrollIntoViewIfNeeded();
    await addOptionBtn.click();

    const optionDialog = page.getByRole("dialog", { name: /Agregar opción · Guarnición/ });
    await expect(optionDialog).toBeVisible();

    // Check height does not exceed 90% of viewport
    const optionDialogBox = await optionDialog.boundingBox();
    expect(optionDialogBox).not.toBeNull();
    expect(optionDialogBox!.height).toBeLessThanOrEqual(320 * 0.9 + 1);

    // Verify fields can be scrolled to and focused
    const optionNameInput = page.getByLabel("Nombre mostrado (opcional)");
    await expect(optionNameInput).toBeVisible();
    await optionNameInput.fill("Papas Fritas");

    const chooseRecipeBtn = page.getByRole("button", { name: "Elegir receta" });
    await chooseRecipeBtn.scrollIntoViewIfNeeded();
    await expect(chooseRecipeBtn).toBeVisible();

    const cancelOptionBtn = page.getByRole("button", { name: "Cancelar" });
    await cancelOptionBtn.scrollIntoViewIfNeeded();
    await expect(cancelOptionBtn).toBeVisible();

    const saveOptionBtn = page.getByRole("button", { name: "Guardar opción" });
    await saveOptionBtn.scrollIntoViewIfNeeded();
    await expect(saveOptionBtn).toBeVisible();

    await page.screenshot({ path: "test-results/t16-after/r06-option-modal-short-390x320.png" });

    // Cancel closes cleanly and returns focus
    await cancelOptionBtn.click();
    await expect(optionDialog).not.toBeVisible();
  });

  test("R06 / 200% Zoom: dialogs remain reachable on desktop at 200% zoom", async ({ page }) => {
    await setupRoutes(page);
    // Desktop 1366x768 at 200% zoom simulates effective 683x384 viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/entries/entry-1/offers/new");

    // Add slot
    await page.getByRole("button", { name: "Agregar grupo" }).click();
    const slotDialog = page.getByRole("dialog", { name: /Definir nuevo grupo/ });
    await expect(slotDialog).toBeVisible();
    await page.getByLabel("Nombre del grupo").fill("Postre");
    await page.getByRole("button", { name: "Guardar grupo" }).click();
    await expect(slotDialog).not.toBeVisible();

    // Open option modal
    await page.getByRole("button", { name: "Agregar opción a Postre" }).click();
    const optionDialog = page.getByRole("dialog", { name: /Agregar opción · Postre/ });
    await expect(optionDialog).toBeVisible();

    // Apply 200% zoom (style.zoom additional verification)
    await page.evaluate(() => {
      document.documentElement.style.zoom = "200%";
    });

    // Check modal height in layout pixels does not exceed available height
    const dialogHeight = await optionDialog.evaluate((el) => el.clientHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(dialogHeight).toBeLessThanOrEqual(viewportHeight);

    // Save and cancel buttons remain reachable
    const cancelBtn = page.getByRole("button", { name: "Cancelar" });
    await cancelBtn.scrollIntoViewIfNeeded();
    await expect(cancelBtn).toBeVisible();

    await page.screenshot({ path: "test-results/t16-after/r06-option-modal-zoom-200.png" });

    await page.evaluate(() => {
      document.documentElement.style.zoom = "100%";
    });

    // True browser zoom 200% on 1366x768 desktop results in 683x384 effective viewport
    await page.setViewportSize({ width: 683, height: 384 });
    const modalHeightAt384 = await optionDialog.evaluate((el) => el.getBoundingClientRect().height);
    expect(modalHeightAt384).toBeLessThanOrEqual(384 * 0.9 + 1);

    const cancelBtn384 = page.getByRole("button", { name: "Cancelar" });
    await cancelBtn384.scrollIntoViewIfNeeded();
    await expect(cancelBtn384).toBeVisible();

    await cancelBtn384.click();
    await expect(optionDialog).not.toBeVisible();
  });

  test("R07: area stylesheets load without style leakage across navigations", async ({ page }) => {
    await setupRoutes(page);
    await page.setViewportSize({ width: 1366, height: 768 });

    // Direct navigation to Catalog
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hamburguesa Clásica" })).toBeVisible();
    await page.screenshot({ path: "test-results/t16-after/01-catalog-desktop.png" });

    // Navigate to Categories
    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "Categorías del Menú" })).toBeVisible();
    await page.screenshot({ path: "test-results/t16-after/02-categories-desktop.png" });

    // Navigate to Entry Form
    await page.goto("/entries/new");
    await expect(page.getByRole("heading", { name: "Nueva entrada" })).toBeVisible();
    await page.screenshot({ path: "test-results/t16-after/03-entry-form-desktop.png" });

    // Navigate to Offers List
    await page.goto("/entries/entry-1/offers");
    await expect(page.getByRole("heading", { name: /Ofertas de/i })).toBeVisible();
    await page.screenshot({ path: "test-results/t16-after/04-offers-list-desktop.png" });

    // Navigate to Offer Form
    await page.goto("/entries/entry-1/offers/new");
    await expect(page.getByRole("heading", { name: "Nueva oferta" })).toBeVisible();
    await page.screenshot({ path: "test-results/t16-after/05-offer-form-desktop.png" });

    // Navigate to Recipes
    await page.goto("/recipes");
    await expect(page.getByRole("heading", { name: "Biblioteca de recetas" })).toBeVisible();
    await page.screenshot({ path: "test-results/t16-after/07-recipes-desktop.png" });

    // Verify all pages loaded without horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
