# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit-review-regressions.spec.ts >> RV13: recetas carga sus primitivas al entrar directamente y conserva estilos después de navegar
- Location: e2e\audit-review-regressions.spec.ts:48:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "flex"
Received: "grid"
```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver al menú" [ref=e7] [cursor=pointer]:
      - /url: /
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "Biblioteca de recetas" [level=1] [ref=e10]
        - paragraph [ref=e11]: Consulta y administra las recetas base y sus insumos.
      - button "+ Nueva receta" [ref=e12] [cursor=pointer]
  - region "Biblioteca de recetas" [ref=e13]:
    - search [ref=e15]:
      - generic [ref=e16]: Buscar recetas
      - generic [ref=e17]:
        - searchbox "Buscar recetas" [ref=e22]
        - button "Buscar ahora" [ref=e23] [cursor=pointer]: Buscar
    - generic [ref=e24]:
      - generic [aria-hidden] [ref=e25]: ⌕
      - heading "Aún no hay recetas registradas." [level=3] [ref=e26]
      - paragraph [ref=e27]: Crea una receta para asociar insumos y pasos de preparación.
      - button "Crear receta" [ref=e28] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | 
  3   | const meta = { page: 1, pageSize: 50, total: 0, totalPages: 0 };
  4   | 
  5   | async function fillRecipe(page: Page, name: string) {
  6   |   await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  7   |   const dialog = page.getByRole("dialog", { name: "Nueva receta", exact: true });
  8   |   await dialog.getByLabel("Nombre", { exact: true }).fill(name);
  9   |   await dialog.getByLabel("Descripción", { exact: true }).fill("Descripción");
  10  |   await dialog.getByLabel("Instrucciones", { exact: true }).fill("Preparar");
  11  |   await dialog.getByLabel("Insumo 1", { exact: true }).selectOption("i1");
  12  |   await dialog.getByRole("button", { name: "Guardar receta", exact: true }).click();
  13  |   await expect(dialog.getByRole("button", { name: "Reintentar", exact: true })).toBeVisible();
  14  | }
  15  | 
  16  | test.beforeEach(async ({ context }) => {
  17  |   await context.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: { data: [], meta } }));
  18  |   await context.route("**/api/v1/inventory/items?*", route => route.fulfill({ json: {
  19  |     data: [{ id: "i1", name: "Harina", unit: "kg" }], meta: { ...meta, total: 1, totalPages: 1 },
  20  |   } }));
  21  |   await context.route("**/api/v1/menu/categories?*", route => route.fulfill({ json: { data: [], meta } }));
  22  |   await context.route("**/api/v1/menu/entries?*", route => route.fulfill({ json: { data: [], meta } }));
  23  | });
  24  | 
  25  | test("RV09: cada pestaña conserva su receta pendiente, también al cancelar en otra pestaña", async ({ page, context }) => {
  26  |   await context.route("**/api/v1/menu/recipes", route => route.abort("timedout"));
  27  |   await page.goto("/recipes");
  28  |   await fillRecipe(page, "Privado A");
  29  |   await page.getByLabel("Nombre", { exact: true }).fill("Cambio posterior A");
  30  |   await page.reload();
  31  |   await expect(page.getByRole("dialog", { name: "Nueva receta", exact: true })).toBeVisible();
  32  |   await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Cambio posterior A");
  33  | 
  34  |   const second = await context.newPage();
  35  |   await second.goto("/recipes");
  36  |   await expect(second.getByRole("heading", { name: "Biblioteca de recetas", exact: true })).toBeVisible();
  37  |   await fillRecipe(second, "Privado B");
  38  |   const aTabId = await page.evaluate(() => sessionStorage.getItem("menu.operationAttempt.tabId"));
  39  |   const bTabId = await second.evaluate(() => sessionStorage.getItem("menu.operationAttempt.tabId"));
  40  |   expect(aTabId).toBeTruthy();
  41  |   expect(bTabId).toBeTruthy();
  42  |   expect(aTabId).not.toBe(bTabId);
  43  |   await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  44  |   await second.reload();
  45  |   await expect(second.getByLabel("Nombre", { exact: true })).toHaveValue("Privado B");
  46  | });
  47  | 
  48  | test("RV13: recetas carga sus primitivas al entrar directamente y conserva estilos después de navegar", async ({ page }) => {
  49  |   await page.goto("/recipes");
  50  |   await expect(page.getByRole("heading", { name: "Biblioteca de recetas", exact: true })).toBeVisible();
  51  |   const styles = () => page.locator(".category-screen__header").evaluate(el => ({
  52  |     display: getComputedStyle(el).display, padding: getComputedStyle(el).padding,
  53  |     background: getComputedStyle(el).backgroundColor,
  54  |   }));
  55  |   const direct = await styles();
> 56  |   expect(direct.display).toBe("flex");
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  57  |   expect(direct.background).toBe("rgb(17, 24, 39)");
  58  |   expect(direct.padding).not.toBe("0px");
  59  |   await expect(page.getByRole("link", { name: /Volver al menú/ })).toHaveCSS("color", "rgb(255, 255, 255)");
  60  |   await expect(page.locator(".search-field__control")).toHaveCSS("display", "flex");
  61  |   await page.screenshot({ path: test.info().outputPath("recipes-direct-fixed.png"), fullPage: true });
  62  |   await page.getByRole("link", { name: /Volver al menú/ }).click();
  63  |   await page.getByRole("link", { name: "Categorías", exact: true }).click();
  64  |   await page.getByRole("link", { name: /Volver/ }).click();
  65  |   await page.getByRole("link", { name: "Biblioteca de recetas", exact: true }).click();
  66  |   expect(await styles()).toEqual(direct);
  67  |   for (const width of [375, 320]) {
  68  |     await page.setViewportSize({ width, height: 568 });
  69  |     await expect(page.locator(".category-screen__header")).toHaveCSS("flex-direction", "column");
  70  |     const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
  71  |     expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  72  |   }
  73  | });
  74  | 
  75  | test("RV04: F5 durante una carga incierta conserva bytes y clave sin enviar automáticamente", async ({ page, context }) => {
  76  |   const uploads: { key: string; body: Buffer }[] = [];
  77  |   let allowUpload = false;
  78  |   await context.route("**/api/v1/media/images", route => {
  79  |     uploads.push({ key: route.request().headers()["idempotency-key"], body: route.request().postDataBuffer()! });
  80  |     if (!allowUpload) return route.abort("timedout");
  81  |     return route.fulfill({ status: 201, json: { data: { id: "image-confirmed", url: "https://example.com/image.png", thumbnailUrl: "https://example.com/thumb.png" } } });
  82  |   });
  83  |   const creations: unknown[] = [];
  84  |   await context.route("**/api/v1/menu/entries", route => {
  85  |     const body = route.request().postDataJSON(); creations.push(body);
  86  |     return route.fulfill({ status: 201, headers: { ETag: '"entry-v1"' }, json: { data: { ...body, id: "e1", status: "INACTIVE" } } });
  87  |   });
  88  |   await page.goto("/entries/new");
  89  |   await page.getByLabel("Nombre comercial").fill("Nueva entrada");
  90  |   await page.getByLabel("Descripción", { exact: true }).fill("Descripción");
  91  |   await page.getByLabel("Archivo de imagen").setInputFiles({ name: "imagen.png", mimeType: "image/png",
  92  |     buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
  93  |   });
  94  |   await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
  95  |   await expect(page.getByRole("button", { name: /He verificado/ })).toBeVisible();
  96  |   expect(uploads).toHaveLength(1);
  97  |   await page.reload();
  98  |   await expect(page.getByRole("button", { name: /He verificado/ })).toBeVisible();
  99  |   expect(uploads).toHaveLength(1);
  100 |   allowUpload = true;
  101 |   await page.getByRole("button", { name: /He verificado/ }).click();
  102 |   await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
  103 |   await expect(page).toHaveURL(/\/$/);
  104 |   expect(uploads).toHaveLength(2);
  105 |   expect(uploads[1].key).toBe(uploads[0].key);
  106 |   // Multipart boundaries may change; the original file bytes must be present in both bodies.
  107 |   const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  108 |   expect(uploads.every(upload => upload.body.includes(bytes))).toBe(true);
  109 |   expect(creations).toHaveLength(1);
  110 |   expect(creations[0]).toMatchObject({ imageId: "image-confirmed" });
  111 | });
  112 | 
  113 | 
  114 | test("RV07: una receta confirmada conserva la edición posterior y su versión después de F5", async ({ page, context }) => {
  115 |   let posts = 0;
  116 |   const patches: { body: { name: string }; version: string }[] = [];
  117 |   let original: { name: string; description: string; instructions: string; supplies: unknown[] };
  118 |   await context.route("**/api/v1/menu/recipes", async route => {
  119 |     posts += 1;
  120 |     original = route.request().postDataJSON();
  121 |     if (posts === 1) return route.abort("timedout");
  122 |     return route.fulfill({ status: 201, headers: { ETag: '"created-version"' }, json: { data: { ...original, id: "recipe-confirmed" } } });
  123 |   });
  124 |   await context.route("**/api/v1/menu/recipes/recipe-confirmed", async route => {
  125 |     expect(route.request().method()).toBe("PATCH");
  126 |     const body = route.request().postDataJSON();
  127 |     patches.push({ body, version: route.request().headers()["if-match"] });
  128 |     return route.fulfill({ status: 200, json: { data: { ...body, id: "recipe-confirmed" } } });
  129 |   });
  130 |   await page.goto("/recipes");
  131 |   await fillRecipe(page, "Nombre enviado");
  132 |   await page.getByLabel("Nombre", { exact: true }).fill("Edición posterior");
  133 |   await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  134 |   await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeVisible();
  135 |   await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Edición posterior");
  136 |   await page.reload();
  137 |   await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
  138 |   await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Edición posterior");
  139 |   expect(posts).toBe(2);
  140 |   await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  141 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  142 |   expect(patches).toEqual([{ body: expect.objectContaining({ name: "Edición posterior" }), version: '"created-version"' }]);
  143 |   expect(posts).toBe(2);
  144 | });
  145 | 
```