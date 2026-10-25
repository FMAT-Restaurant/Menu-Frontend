# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: entry-form-remediation.spec.ts >> V2 aligns navigation, keeps actions reachable and bounds 100 categories across six viewports
- Location: e2e\entry-form-remediation.spec.ts:52:1

# Error details

```
Error: expect(locator).toBeInViewport() failed

Locator:  getByRole('button', { name: 'Guardar entrada' })
Expected: in viewport
Received: viewport ratio 0
Timeout:  5000ms

Call log:
  - Expect "toBeInViewport" getByRole('button', { name: 'Guardar entrada' }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Guardar entrada' })
    14 × locator resolved to <button type="submit" class="button button--primary">Guardar entrada</button>
       - unexpected value "viewport ratio 0"

```

```yaml
- button "Guardar entrada"
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | 
  3   | async function fixture(page: Page, count = 3, rejectCreation = false, conflictEdit = false) {
  4   |   let categoryReads = 0, entryReads = 0, uploads = 0, creates = 0, patches = 0, revision = 1;
  5   |   let current = { id: "entry-fixture", brandName: "Entrada de prueba", description: "Descripción vigente", status: "INACTIVE", categoryIds: ["category-1"], image: null };
  6   |   const categories = Array.from({ length: count }, (_, i) => ({ id: `category-${i + 1}`, name: i === count - 1 ? `Categoría con un nombre muy largo ${"comercial".repeat(12)}` : `Categoría ${i + 1}` }));
  7   |   await page.route("**/api/v1/menu/categories?*", (route) => {
  8   |     categoryReads += 1;
  9   |     return route.fulfill({ json: { data: categories, meta: { page: 1, pageSize: 100, total: count, totalPages: Math.ceil(count / 100) } } });
  10  |   });
  11  |   await page.route("**/api/v1/media/images", (route) => {
  12  |     uploads += 1;
  13  |     return route.fulfill({ status: 201, json: { data: { id: "image-uploaded", url: "/images/uploaded.png", thumbnailUrl: "/images/uploaded-thumb.png" } } });
  14  |   });
  15  |   await page.route("**/api/v1/menu/entries", (route) => {
  16  |     creates += 1;
  17  |     if (rejectCreation && creates === 1) return route.fulfill({ status: 422, json: { error: { message: "El nombre ya existe.", details: { violations: [{ path: "/brandName", message: "Elige otro nombre comercial." }] } } } });
  18  |     return route.fulfill({ status: 201, json: { data: { ...current, ...route.request().postDataJSON() } } });
  19  |   });
  20  |   await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  21  |   await page.route("**/api/v1/menu/entries/entry-fixture", (route) => {
  22  |     if (route.request().method() === "GET") {
  23  |       entryReads += 1;
  24  |       return route.fulfill({ headers: { ETag: `"version-${revision}"` }, json: { data: current } });
  25  |     }
  26  |     patches += 1;
  27  |     if (conflictEdit && patches === 1) {
  28  |       expect(route.request().headers()["if-match"]).toBe('"version-1"');
  29  |       revision = 2; current = { ...current, brandName: "Cambio concurrente confirmado" };
  30  |       return route.fulfill({ status: 412, json: { error: { message: "La entrada cambió desde su apertura." } } });
  31  |     }
  32  |     expect(route.request().headers()["if-match"]).toBe(`"version-${revision}"`);
  33  |     return route.fulfill({ headers: { ETag: '"version-3"' }, json: { data: { ...current, ...route.request().postDataJSON() } } });
  34  |   });
  35  |   return { reads: () => ({ categories: categoryReads, entry: entryReads }), writes: () => ({ uploads, creates, patches }) };
  36  | }
  37  | 
  38  | async function image(page: Page, width: number, height: number) {
  39  |   const dataUrl = await page.evaluate(([w, h]) => {
  40  |     const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  41  |     const context = canvas.getContext("2d")!; context.fillStyle = "#f1f5f9"; context.fillRect(0, 0, w, h);
  42  |     return canvas.toDataURL("image/png");
  43  |   }, [width, height]);
  44  |   return Buffer.from(dataUrl.split(",")[1], "base64");
  45  | }
  46  | 
  47  | async function noHorizontalOverflow(page: Page) {
  48  |   const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
  49  |   expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  50  | }
  51  | 
  52  | test("V2 aligns navigation, keeps actions reachable and bounds 100 categories across six viewports", async ({ page }) => {
  53  |   const consoleErrors: string[] = [];
  54  |   page.on("pageerror", (error) => consoleErrors.push(error.message));
  55  |   await fixture(page, 100);
  56  |   for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]]) {
  57  |     await page.setViewportSize({ width, height });
  58  |     await page.goto("/entries/new");
  59  |     await expect(page.getByRole("link", { name: /Volver a entradas/ })).toBeInViewport();
  60  |     await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  61  |     await expect(page.getByRole("checkbox")).toHaveCount(100);
  62  |     const list = page.locator(".entry-category-selector__list");
  63  |     const size = await list.evaluate((element) => ({ height: element.clientHeight, total: element.scrollHeight }));
  64  |     expect(size.height).toBeLessThanOrEqual(192); expect(size.total).toBeGreaterThan(size.height);
  65  |     await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  66  |     await expect(page.getByRole("checkbox").last()).toBeVisible();
  67  |     await page.getByRole("searchbox", { name: "Buscar categorías" }).press("Escape");
  68  |     const nav = await page.locator(".entry-form-page__heading").boundingBox();
  69  |     const main = await page.locator(".entry-form-page").boundingBox();
  70  |     expect(Math.abs(nav!.x - main!.x)).toBeLessThanOrEqual(1);
  71  |     expect(Math.abs(nav!.width - main!.width)).toBeLessThanOrEqual(1);
  72  |     const save = page.getByRole("button", { name: "Guardar entrada" });
> 73  |     await expect(save).toBeInViewport();
      |                        ^ Error: expect(locator).toBeInViewport() failed
  74  |     if (width === 1366) {
  75  |       await page.evaluate(() => window.scrollTo(0, 0));
  76  |       await expect(page.getByRole("button", { name: "Seleccionar imagen" })).toBeInViewport();
  77  |       await page.screenshot({ path: "test-results/t33-desktop.png" });
  78  |     }
  79  |     if (width === 320) await page.screenshot({ path: "test-results/t33-mobile.png", fullPage: true });
  80  |     await noHorizontalOverflow(page);
  81  |   }
  82  |   await page.setViewportSize({ width: 1366, height: 768 });
  83  |   await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  84  |   await noHorizontalOverflow(page);
  85  |   await expect(page.getByRole("button", { name: "Guardar entrada" })).toBeInViewport();
  86  |   await page.getByLabel("Descripción").focus();
  87  |   await expect.poll(async () => {
  88  |     const field = await page.getByLabel("Descripción").boundingBox();
  89  |     const actions = await page.locator(".entry-form__actions").boundingBox();
  90  |     return field!.y >= 0 && field!.y + field!.height <= actions!.y;
  91  |   }).toBe(true);
  92  |   await page.screenshot({ path: "test-results/t33-zoom-200.png" });
  93  |   await page.evaluate(() => { document.documentElement.style.zoom = "1"; });
  94  |   await page.setViewportSize({ width: 390, height: 320 });
  95  |   const name = page.getByLabel("Nombre comercial");
  96  |   await name.focus();
  97  |   for (let index = 0; index < 4; index += 1) {
  98  |     await expect.poll(async () => {
  99  |       const focused = await page.locator(":focus").boundingBox();
  100 |       const actions = await page.locator(".entry-form__actions").boundingBox();
  101 |       return focused!.y >= 0 && focused!.y + focused!.height <= actions!.y;
  102 |     }).toBe(true);
  103 |     await page.keyboard.press("Tab");
  104 |   }
  105 |   await expect(page.getByRole("button", { name: "Guardar entrada" })).toBeInViewport({ ratio: 1 });
  106 |   await noHorizontalOverflow(page);
  107 |   expect(consoleErrors).toEqual([]);
  108 | });
  109 | 
  110 | test("category search and image zone work with keyboard without per-keystroke queries", async ({ page }) => {
  111 |   const api = await fixture(page, 3);
  112 |   await page.goto("/entries/new");
  113 |   const trigger = page.getByRole("button", { name: "Seleccionar categorías" });
  114 |   await trigger.focus(); await trigger.press("Enter");
  115 |   await page.getByRole("searchbox", { name: "Buscar categorías" }).fill("Categoría 1");
  116 |   await page.getByRole("checkbox", { name: "Categoría 1", exact: true }).check();
  117 |   await page.getByRole("searchbox", { name: "Buscar categorías" }).fill("sin coincidencias");
  118 |   await expect(page.getByText(/No hay coincidencias/)).toBeVisible();
  119 |   await expect(page.getByRole("button", { name: "Retirar categoría Categoría 1" })).toBeVisible();
  120 |   await page.getByRole("searchbox", { name: "Buscar categorías" }).press("Escape");
  121 |   await expect(page.getByRole("button", { name: "1 categoría seleccionada" })).toBeFocused();
  122 |   const zone = page.getByRole("button", { name: "Seleccionar imagen" });
  123 |   const vertical = await image(page, 80, 160);
  124 |   const [picker] = await Promise.all([page.waitForEvent("filechooser"), zone.press("Enter")]);
  125 |   await picker.setFiles({ name: "vertical.png", mimeType: "image/png", buffer: vertical });
  126 |   await expect(page.getByText("vertical.png")).toBeVisible();
  127 |   const imageZone = await page.locator(".entry-image-field__preview").boundingBox();
  128 |   expect(imageZone!.height).toBe(176);
  129 |   const [cancelPicker] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Cambiar imagen" }).press("Space")]);
  130 |   await cancelPicker.setFiles([]);
  131 |   await expect(page.getByText("vertical.png")).toBeVisible();
  132 |   await page.setViewportSize({ width: 390, height: 844 });
  133 |   const longFilename = `${"nombredeimagen".repeat(20)}.png`;
  134 |   await page.getByLabel("Archivo de imagen").setInputFiles({ name: longFilename, mimeType: "image/png", buffer: vertical });
  135 |   await expect(page.getByText(longFilename)).toBeVisible();
  136 |   await noHorizontalOverflow(page);
  137 |   await page.getByLabel("Nombre comercial").fill("Identidad independiente");
  138 |   await page.getByLabel("Descripción").fill("Texto que no dispara consultas");
  139 |   expect(api.reads().categories).toBe(1);
  140 |   expect(api.writes().uploads).toBe(0);
  141 | });
  142 | 
  143 | test("a server rejection preserves the draft and a retry reuses the successful upload", async ({ page }) => {
  144 |   const api = await fixture(page, 0, true);
  145 |   await page.goto("/entries/new");
  146 |   await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  147 |   await expect(page.getByText(/Aún no hay categorías/)).toBeVisible();
  148 |   await page.getByRole("searchbox").press("Escape");
  149 |   await page.getByLabel("Nombre comercial").fill("Bowl"); await page.getByLabel("Descripción").fill("Con arroz");
  150 |   await page.getByLabel("Archivo de imagen").setInputFiles({ name: "horizontal.png", mimeType: "image/png", buffer: await image(page, 160, 80) });
  151 |   await page.getByRole("button", { name: "Guardar entrada" }).click();
  152 |   const summary = page.getByRole("alert", { name: "Error al guardar entrada" });
  153 |   await expect(summary).toContainText("El nombre ya existe.");
  154 |   await expect(summary).toBeFocused();
  155 |   await expect(page.getByLabel("Nombre comercial")).toHaveValue("Bowl");
  156 |   await expect(page.getByLabel("Nombre comercial")).toHaveAttribute("aria-invalid", "true");
  157 |   await page.getByLabel("Nombre comercial").fill("Bowl corregido");
  158 |   await expect(page.getByLabel("Nombre comercial")).toHaveAttribute("aria-invalid", "false");
  159 |   await page.getByRole("button", { name: "Guardar entrada" }).click();
  160 |   await expect(page).toHaveURL(/\/$/);
  161 |   expect(api.writes()).toEqual({ uploads: 1, creates: 2, patches: 0 });
  162 | });
  163 | 
  164 | test("an edit conflict requires review before using a new ETag and never refreshes it silently", async ({ page }) => {
  165 |   const api = await fixture(page, 3, false, true);
  166 |   await page.goto("/entries/entry-fixture/edit");
  167 |   await expect(page.getByLabel("Nombre comercial")).toHaveValue("Entrada de prueba");
  168 |   await page.getByLabel("Nombre comercial").fill("Mi borrador");
  169 |   const initialReads = api.reads().entry;
  170 |   await page.getByRole("button", { name: "Guardar cambios" }).click();
  171 |   await expect(page.getByRole("button", { name: "Revisar entrada actual" })).toBeVisible();
  172 |   expect(api.reads().entry).toBe(initialReads);
  173 |   await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
```