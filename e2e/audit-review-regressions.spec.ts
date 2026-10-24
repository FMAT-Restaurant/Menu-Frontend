import { expect, test, type Page } from "@playwright/test";

const meta = { page: 1, pageSize: 50, total: 0, totalPages: 0 };

async function fillRecipe(page: Page, name: string) {
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva receta", exact: true });
  await dialog.getByLabel("Nombre", { exact: true }).fill(name);
  await dialog.getByLabel("Descripción", { exact: true }).fill("Descripción");
  await dialog.getByLabel("Instrucciones", { exact: true }).fill("Preparar");
  await dialog.getByLabel("Insumo 1", { exact: true }).selectOption("i1");
  await dialog.getByRole("button", { name: "Guardar receta", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Reintentar", exact: true })).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: { data: [], meta } }));
  await context.route("**/api/v1/inventory/items?*", route => route.fulfill({ json: {
    data: [{ id: "i1", name: "Harina", unit: "kg" }], meta: { ...meta, total: 1, totalPages: 1 },
  } }));
  await context.route("**/api/v1/menu/categories?*", route => route.fulfill({ json: { data: [], meta } }));
  await context.route("**/api/v1/menu/entries?*", route => route.fulfill({ json: { data: [], meta } }));
});

test("RV09: cada pestaña conserva su receta pendiente, también al cancelar en otra pestaña", async ({ page, context }) => {
  await context.route("**/api/v1/menu/recipes", route => route.abort("timedout"));
  await page.goto("/recipes");
  await fillRecipe(page, "Privado A");
  await page.getByLabel("Nombre", { exact: true }).fill("Cambio posterior A");
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Nueva receta", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Cambio posterior A");

  const second = await context.newPage();
  await second.goto("/recipes");
  await expect(second.getByRole("heading", { name: "Biblioteca de recetas", exact: true })).toBeVisible();
  await fillRecipe(second, "Privado B");
  const aTabId = await page.evaluate(() => sessionStorage.getItem("menu.operationAttempt.tabId"));
  const bTabId = await second.evaluate(() => sessionStorage.getItem("menu.operationAttempt.tabId"));
  expect(aTabId).toBeTruthy();
  expect(bTabId).toBeTruthy();
  expect(aTabId).not.toBe(bTabId);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await second.reload();
  await expect(second.getByLabel("Nombre", { exact: true })).toHaveValue("Privado B");
});

test("RV13: recetas carga sus primitivas al entrar directamente y conserva estilos después de navegar", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "Biblioteca de recetas", exact: true })).toBeVisible();
  const styles = () => page.locator(".category-screen__header").evaluate(el => ({
    display: getComputedStyle(el).display, padding: getComputedStyle(el).padding,
    background: getComputedStyle(el).backgroundColor,
  }));
  const direct = await styles();
  expect(direct.display).toBe("grid");
  expect(direct.background).toBe("rgba(0, 0, 0, 0)");
  expect(direct.padding).not.toBe("0px");
  await expect(page.getByRole("link", { name: /Volver al menú/ })).toHaveCSS("color", "rgb(194, 65, 12)");
  await expect(page.getByRole("heading", { name: "Biblioteca de recetas", exact: true })).toHaveCSS("font-size", "28px");
  await expect(page.locator(".search-field__control")).toHaveCSS("display", "flex");
  await page.screenshot({ path: test.info().outputPath("recipes-direct-fixed.png"), fullPage: true });
  await page.getByRole("link", { name: /Volver al menú/ }).click();
  await page.getByRole("link", { name: "Categorías", exact: true }).click();
  await page.getByRole("link", { name: /Volver/ }).click();
  await page.getByRole("link", { name: "Biblioteca de recetas", exact: true }).click();
  expect(await styles()).toEqual(direct);
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 568 });
    await expect(page.locator(".category-screen__header .task-header__row")).toHaveCSS("flex-direction", "column");
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  }
});

test("RV04: F5 durante una carga incierta conserva bytes y clave sin enviar automáticamente", async ({ page, context }) => {
  const uploads: { key: string; body: Buffer }[] = [];
  let allowUpload = false;
  await context.route("**/api/v1/media/images", route => {
    uploads.push({ key: route.request().headers()["idempotency-key"], body: route.request().postDataBuffer()! });
    if (!allowUpload) return route.abort("timedout");
    return route.fulfill({ status: 201, json: { data: { id: "image-confirmed", url: "https://example.com/image.png", thumbnailUrl: "https://example.com/thumb.png" } } });
  });
  const creations: unknown[] = [];
  await context.route("**/api/v1/menu/entries", route => {
    const body = route.request().postDataJSON(); creations.push(body);
    return route.fulfill({ status: 201, headers: { ETag: '"entry-v1"' }, json: { data: { ...body, id: "e1", status: "INACTIVE" } } });
  });
  await page.goto("/entries/new");
  await page.getByLabel("Nombre comercial").fill("Nueva entrada");
  await page.getByLabel("Descripción", { exact: true }).fill("Descripción");
  await page.getByLabel("Archivo de imagen").setInputFiles({ name: "imagen.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
  });
  await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
  await expect(page.getByRole("button", { name: /He verificado/ })).toBeVisible();
  expect(uploads).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("button", { name: /He verificado/ })).toBeVisible();
  expect(uploads).toHaveLength(1);
  allowUpload = true;
  await page.getByRole("button", { name: /He verificado/ }).click();
  await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(uploads).toHaveLength(2);
  expect(uploads[1].key).toBe(uploads[0].key);
  // Multipart boundaries may change; the original file bytes must be present in both bodies.
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  expect(uploads.every(upload => upload.body.includes(bytes))).toBe(true);
  expect(creations).toHaveLength(1);
  expect(creations[0]).toMatchObject({ imageId: "image-confirmed" });
});


test("RV07: una receta confirmada conserva la edición posterior y su versión después de F5", async ({ page, context }) => {
  let posts = 0;
  const patches: { body: { name: string }; version: string }[] = [];
  let original: { name: string; description: string; instructions: string; supplies: unknown[] };
  await context.route("**/api/v1/menu/recipes", async route => {
    posts += 1;
    original = route.request().postDataJSON();
    if (posts === 1) return route.abort("timedout");
    return route.fulfill({ status: 201, headers: { ETag: '"created-version"' }, json: { data: { ...original, id: "recipe-confirmed" } } });
  });
  await context.route("**/api/v1/menu/recipes/recipe-confirmed", async route => {
    expect(route.request().method()).toBe("PATCH");
    const body = route.request().postDataJSON();
    patches.push({ body, version: route.request().headers()["if-match"] });
    return route.fulfill({ status: 200, json: { data: { ...body, id: "recipe-confirmed" } } });
  });
  await page.goto("/recipes");
  await fillRecipe(page, "Nombre enviado");
  await page.getByLabel("Nombre", { exact: true }).fill("Edición posterior");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Edición posterior");
  await page.reload();
  await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Edición posterior");
  expect(posts).toBe(2);
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(patches).toEqual([{ body: expect.objectContaining({ name: "Edición posterior" }), version: '"created-version"' }]);
  expect(posts).toBe(2);
});
