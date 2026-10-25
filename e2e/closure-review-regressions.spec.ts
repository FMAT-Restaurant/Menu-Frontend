import { expect, test, type Page } from "@playwright/test";

const recipe = { id: "recipe-1", name: "Receta base", description: "Preparación", instructions: "Cocinar",
  supplies: [{ inventoryItemId: "item-1", quantity: 1, inventoryItem: { id: "item-1", name: "Insumo", unit: "kg" } }] };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/menu/entries/entry-1", route => route.fulfill({ json: { data: {
    id: "entry-1", brandName: "Entrada", description: "Descripción", status: "ACTIVE", categoryIds: [], image: null,
  } } }));
  await page.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: { data: [recipe],
    meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/inventory/items?*", route => route.fulfill({ json: { data: [recipe.supplies[0].inventoryItem],
    meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
});

async function openOption(page: Page, groupName = "Principal") {
  await page.goto("/entries/entry-1/offers/new");
  await page.getByLabel("Etiqueta de presentación (opcional)").fill("Borrador conservado");
  await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
  await page.getByLabel("Nombre del grupo").fill(groupName);
  await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
  const trigger = page.getByRole("button", { name: `Agregar opción a ${groupName}`, exact: true });
  await trigger.click();
  return trigger;
}

test("RC02: quoted group names preserve editor, draft and focus after option cancellation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const trigger = await openOption(page, 'Menú "especial" \\ [casa]');
  const option = page.getByRole("dialog", { name: 'Agregar opción · Menú "especial" \\ [casa]', exact: true });
  await option.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nueva oferta", exact: true })).toBeVisible();
  await expect(page.getByLabel("Etiqueta de presentación (opcional)")).toHaveValue("Borrador conservado");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(option).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("RC04: each Escape affects only the active step and restores focus within one dialog", async ({ page }) => {
  const trigger = await openOption(page);
  const option = page.getByRole("dialog", { name: "Agregar opción · Principal", exact: true });
  const node = await option.elementHandle();
  const chooseRecipe = option.getByRole("button", { name: /Elegir receta/ });
  await chooseRecipe.click();
  const picker = page.getByRole("dialog", { name: "Elegir receta · Principal", exact: true });
  const createRecipe = picker.getByRole("button", { name: "+ Nueva receta", exact: true });
  await createRecipe.click();
  const form = page.getByRole("dialog", { name: "Nueva receta", exact: true });
  await form.getByLabel("Nombre", { exact: true }).fill("Receta anidada");
  await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(form.getByRole("button", { name: "Seguir editando receta", exact: true })).toBeFocused();
  await expect(form.getByLabel("Nombre", { exact: true })).toHaveValue("Receta anidada");
  await form.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  await expect(form).not.toBeVisible();
  await expect(picker).toBeVisible();
  await expect(createRecipe).toBeFocused();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(picker).not.toBeVisible();
  await expect(chooseRecipe).toBeFocused();
  expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Continuar editando", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await expect(option).not.toBeVisible();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("Etiqueta de presentación (opcional)")).toHaveValue("Borrador conservado");
});

test("RC04: Escape cannot dismiss a nested recipe while its POST is pending", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let writes = 0;
  await page.route("**/api/v1/menu/recipes", async route => {
    if (route.request().method() !== "POST") throw new Error("Expected recipe POST");
    writes += 1;
    await pending;
    await route.fulfill({ status: 201, headers: { ETag: '"recipe-v1"' }, json: { data: { ...recipe, name: "Receta guardada" } } });
  });
  await openOption(page);
  await page.getByRole("button", { name: /Elegir receta/ }).click();
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Nueva receta", exact: true });
  await form.getByLabel("Nombre", { exact: true }).fill("Receta guardada");
  await form.getByLabel("Descripción", { exact: true }).fill("Preparación");
  await form.getByLabel("Instrucciones", { exact: true }).fill("Cocinar");
  await form.getByLabel("Insumo 1", { exact: true }).selectOption("item-1");
  await form.getByRole("button", { name: "Guardar receta", exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  try {
    await page.keyboard.press("Escape");
    await expect(form).toBeVisible();
    await expect(form.getByLabel("Nombre", { exact: true })).toHaveValue("Receta guardada");
    const backActions = form.getByRole("button", { name: "Volver a elegir receta", exact: true });
    await expect(backActions).toHaveCount(2);
    for (const action of await backActions.all()) await expect(action).toBeDisabled();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  } finally { release(); }
  await expect(form).not.toBeVisible();
  const option = page.getByRole("dialog", { name: "Agregar opción · Principal", exact: true });
  await expect(option).toBeVisible();
  await expect(option.getByText("Receta asignada: Receta guardada", { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  await option.getByRole("button", { name: "Guardar opción", exact: true }).click();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
});
