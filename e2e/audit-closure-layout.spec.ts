import { expect, test } from "@playwright/test";

const recipe = { id: "rec-1", name: "Receta de hamburguesa clásica con queso", description: "Preparación de la casa",
  supplies: [{ inventoryItemId: "inv-carne", inventoryItem: { id: "inv-carne", name: "Carne molida", unit: "g" }, quantity: 180 }] };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/inventory/items?*", route => route.fulfill({ json: { data: [{ id: "inv-carne", name: "Carne molida", unit: "g" }],
    meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: { data: [recipe],
    meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/entries/entry-1", route => route.fulfill({ json: { data: {
    id: "entry-1", brandName: "Hamburguesa", description: "Descripción", status: "ACTIVE", categoryIds: [], image: null,
  } } }));
});

test("R05/R06: recipe fields and supply controls fit inside the dialog at all required sizes", async ({ page }) => {
  for (const [width, height] of [[1366, 768], [390, 844], [320, 568], [390, 320]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/recipes");
    await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva receta", exact: true });
    for (const label of ["Nombre", "Descripción", "Instrucciones", "Buscar insumos de inventario", "Insumo 1", "Cantidad del insumo 1"]) {
      const field = dialog.getByLabel(label, { exact: true });
      await field.scrollIntoViewIfNeeded();
      await field.focus();
      const box = await field.boundingBox();
      const dialogBox = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(dialogBox!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width);
      await expect(field).toBeInViewport();
    }
    for (const action of ["Guardar receta", "Cancelar"]) {
      const button = dialog.getByRole("button", { name: action, exact: true });
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
    }
  }
});

test("R05: populated recipe cards keep title and management actions inside 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/recipes");
  const card = page.locator(".recipe-card");
  await expect(card.getByRole("heading", { name: recipe.name })).toBeVisible();
  for (const element of [card, card.getByRole("button", { name: `Editar ${recipe.name}` }),
    card.getByRole("button", { name: `Eliminar ${recipe.name}` })]) {
    const box = await element.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("R06: nested recipe picker obeys 90% height, scrolls and returns focus at all required sizes", async ({ page }) => {
  for (const [width, height] of [[1366, 768], [390, 844], [320, 568], [390, 320]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/entries/entry-1/offers/new");
    await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
    await page.getByLabel("Nombre del grupo").fill("Principal");
    await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
    await page.getByRole("button", { name: "Agregar opción a Principal", exact: true }).click();
    const option = page.getByRole("dialog", { name: "Agregar opción · Principal" });
    const trigger = option.getByRole("button", { name: /Elegir receta/ });
    await trigger.click();
    const picker = page.getByRole("dialog", { name: "Biblioteca de recetas", exact: true });
    await expect(picker).toBeVisible();
    const box = await picker.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(height * 0.9 + 1);
    expect(box!.width).toBeLessThanOrEqual(width);
    await expect(picker.getByRole("heading", { name: recipe.name })).toBeVisible();
    await picker.getByRole("button", { name: "Asignar", exact: true }).scrollIntoViewIfNeeded();
    await expect(picker.getByRole("button", { name: "Asignar", exact: true })).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(picker).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(option).toBeVisible();
  }
});
