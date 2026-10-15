import { expect, test, type Page } from "@playwright/test";

async function fixture(page: Page, count = 3, rejectCreation = false, conflictEdit = false) {
  let categoryReads = 0, entryReads = 0, uploads = 0, creates = 0, patches = 0, revision = 1;
  let current = { id: "entry-fixture", brandName: "Entrada de prueba", description: "Descripción vigente", status: "INACTIVE", categoryIds: ["category-1"], image: null };
  const categories = Array.from({ length: count }, (_, i) => ({ id: `category-${i + 1}`, name: i === count - 1 ? `Categoría con un nombre muy largo ${"comercial".repeat(12)}` : `Categoría ${i + 1}` }));
  await page.route("**/api/v1/menu/categories?*", (route) => {
    categoryReads += 1;
    return route.fulfill({ json: { data: categories, meta: { page: 1, pageSize: 100, total: count, totalPages: Math.ceil(count / 100) } } });
  });
  await page.route("**/api/v1/media/images", (route) => {
    uploads += 1;
    return route.fulfill({ status: 201, json: { data: { id: "image-uploaded" } } });
  });
  await page.route("**/api/v1/menu/entries", (route) => {
    creates += 1;
    if (rejectCreation && creates === 1) return route.fulfill({ status: 422, json: { error: { message: "El nombre ya existe.", details: { violations: [{ path: "/brandName", message: "Elige otro nombre comercial." }] } } } });
    return route.fulfill({ status: 201, json: { data: { ...current, ...route.request().postDataJSON() } } });
  });
  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  await page.route("**/api/v1/menu/entries/entry-fixture", (route) => {
    if (route.request().method() === "GET") {
      entryReads += 1;
      return route.fulfill({ headers: { ETag: `"version-${revision}"` }, json: { data: current } });
    }
    patches += 1;
    if (conflictEdit && patches === 1) {
      expect(route.request().headers()["if-match"]).toBe('"version-1"');
      revision = 2; current = { ...current, brandName: "Cambio concurrente confirmado" };
      return route.fulfill({ status: 412, json: { error: { message: "La entrada cambió desde su apertura." } } });
    }
    expect(route.request().headers()["if-match"]).toBe(`"version-${revision}"`);
    return route.fulfill({ headers: { ETag: '"version-3"' }, json: { data: { ...current, ...route.request().postDataJSON() } } });
  });
  return { reads: () => ({ categories: categoryReads, entry: entryReads }), writes: () => ({ uploads, creates, patches }) };
}

async function image(page: Page, width: number, height: number) {
  const dataUrl = await page.evaluate(([w, h]) => {
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const context = canvas.getContext("2d")!; context.fillStyle = "#f1f5f9"; context.fillRect(0, 0, w, h);
    return canvas.toDataURL("image/png");
  }, [width, height]);
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
}

test("V2 aligns navigation, keeps actions reachable and bounds 100 categories across six viewports", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await fixture(page, 100);
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/entries/new");
    await expect(page.getByRole("link", { name: /Volver a entradas/ })).toBeInViewport();
    await page.getByRole("button", { name: "Seleccionar categorías" }).click();
    await expect(page.getByRole("checkbox")).toHaveCount(100);
    const list = page.locator(".entry-category-selector__list");
    const size = await list.evaluate((element) => ({ height: element.clientHeight, total: element.scrollHeight }));
    expect(size.height).toBeLessThanOrEqual(192); expect(size.total).toBeGreaterThan(size.height);
    await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(page.getByRole("checkbox").last()).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar categorías" }).press("Escape");
    const nav = await page.locator(".entry-form-nav").boundingBox();
    const main = await page.locator(".entry-form-page").boundingBox();
    expect(Math.abs(nav!.x - main!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(nav!.width - main!.width)).toBeLessThanOrEqual(1);
    const save = page.getByRole("button", { name: "Guardar entrada" });
    await expect(save).toBeInViewport();
    if (width === 1366) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.getByRole("button", { name: "Seleccionar imagen" })).toBeInViewport();
      await page.screenshot({ path: "test-results/t33-desktop.png" });
    }
    if (width === 320) await page.screenshot({ path: "test-results/t33-mobile.png", fullPage: true });
    await noHorizontalOverflow(page);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await noHorizontalOverflow(page);
  await expect(page.getByRole("button", { name: "Guardar entrada" })).toBeInViewport();
  await page.getByLabel("Descripción").focus();
  await expect.poll(async () => {
    const field = await page.getByLabel("Descripción").boundingBox();
    const actions = await page.locator(".entry-form__actions").boundingBox();
    return field!.y >= 0 && field!.y + field!.height <= actions!.y;
  }).toBe(true);
  await page.screenshot({ path: "test-results/t33-zoom-200.png" });
  await page.evaluate(() => { document.documentElement.style.zoom = "1"; });
  await page.setViewportSize({ width: 390, height: 320 });
  const name = page.getByLabel("Nombre comercial");
  await name.focus();
  for (let index = 0; index < 4; index += 1) {
    await expect.poll(async () => {
      const focused = await page.locator(":focus").boundingBox();
      const actions = await page.locator(".entry-form__actions").boundingBox();
      return focused!.y >= 0 && focused!.y + focused!.height <= actions!.y;
    }).toBe(true);
    await page.keyboard.press("Tab");
  }
  await expect(page.getByRole("button", { name: "Guardar entrada" })).toBeInViewport({ ratio: 1 });
  await noHorizontalOverflow(page);
  expect(consoleErrors).toEqual([]);
});

test("category search and image zone work with keyboard without per-keystroke queries", async ({ page }) => {
  const api = await fixture(page, 3);
  await page.goto("/entries/new");
  const trigger = page.getByRole("button", { name: "Seleccionar categorías" });
  await trigger.focus(); await trigger.press("Enter");
  await page.getByRole("searchbox", { name: "Buscar categorías" }).fill("Categoría 1");
  await page.getByRole("checkbox", { name: "Categoría 1", exact: true }).check();
  await page.getByRole("searchbox", { name: "Buscar categorías" }).fill("sin coincidencias");
  await expect(page.getByText(/No hay coincidencias/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retirar categoría Categoría 1" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar categorías" }).press("Escape");
  await expect(page.getByRole("button", { name: "1 categoría seleccionada" })).toBeFocused();
  const zone = page.getByRole("button", { name: "Seleccionar imagen" });
  const vertical = await image(page, 80, 160);
  const [picker] = await Promise.all([page.waitForEvent("filechooser"), zone.press("Enter")]);
  await picker.setFiles({ name: "vertical.png", mimeType: "image/png", buffer: vertical });
  await expect(page.getByText("vertical.png")).toBeVisible();
  const imageZone = await page.locator(".entry-image-field__preview").boundingBox();
  expect(imageZone!.height).toBe(176);
  const [cancelPicker] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Cambiar imagen" }).press("Space")]);
  await cancelPicker.setFiles([]);
  await expect(page.getByText("vertical.png")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const longFilename = `${"nombredeimagen".repeat(20)}.png`;
  await page.getByLabel("Archivo de imagen").setInputFiles({ name: longFilename, mimeType: "image/png", buffer: vertical });
  await expect(page.getByText(longFilename)).toBeVisible();
  await noHorizontalOverflow(page);
  await page.getByLabel("Nombre comercial").fill("Identidad independiente");
  await page.getByLabel("Descripción").fill("Texto que no dispara consultas");
  expect(api.reads().categories).toBe(1);
  expect(api.writes().uploads).toBe(0);
});

test("a server rejection preserves the draft and a retry reuses the successful upload", async ({ page }) => {
  const api = await fixture(page, 0, true);
  await page.goto("/entries/new");
  await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  await expect(page.getByText(/Aún no hay categorías/)).toBeVisible();
  await page.getByRole("searchbox").press("Escape");
  await page.getByLabel("Nombre comercial").fill("Bowl"); await page.getByLabel("Descripción").fill("Con arroz");
  await page.getByLabel("Archivo de imagen").setInputFiles({ name: "horizontal.png", mimeType: "image/png", buffer: await image(page, 160, 80) });
  await page.getByRole("button", { name: "Guardar entrada" }).click();
  const summary = page.getByRole("alert", { name: "Error al guardar entrada" });
  await expect(summary).toContainText("El nombre ya existe.");
  await expect(summary).toBeFocused();
  await expect(page.getByLabel("Nombre comercial")).toHaveValue("Bowl");
  await expect(page.getByLabel("Nombre comercial")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Nombre comercial").fill("Bowl corregido");
  await expect(page.getByLabel("Nombre comercial")).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Guardar entrada" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(api.writes()).toEqual({ uploads: 1, creates: 2, patches: 0 });
});

test("an edit conflict requires review before using a new ETag and never refreshes it silently", async ({ page }) => {
  const api = await fixture(page, 3, false, true);
  await page.goto("/entries/entry-fixture/edit");
  await expect(page.getByLabel("Nombre comercial")).toHaveValue("Entrada de prueba");
  await page.getByLabel("Nombre comercial").fill("Mi borrador");
  const initialReads = api.reads().entry;
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("button", { name: "Revisar entrada actual" })).toBeVisible();
  expect(api.reads().entry).toBe(initialReads);
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  await page.getByRole("button", { name: "Revisar entrada actual" }).click();
  await expect(page.getByText("Cambio concurrente confirmado")).toBeVisible();
  await expect(page.getByLabel("Nombre comercial")).toHaveValue("Mi borrador");
  await page.getByRole("button", { name: "Continuar con mi borrador y versión revisada" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(api.reads().entry).toBe(initialReads + 1);
  expect(api.writes().patches).toBe(2);
});
