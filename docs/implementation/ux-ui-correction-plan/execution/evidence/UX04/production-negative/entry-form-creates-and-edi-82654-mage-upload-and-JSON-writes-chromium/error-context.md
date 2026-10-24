# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: entry-form.spec.ts >> creates and edits an entry with separate image upload and JSON writes
- Location: e2e\entry-form.spec.ts:5:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/?q=bowl&status=INACTIVE$/
Received string:  "http://127.0.0.1:4173/entries/new"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="es" data-menu-standalone="">…</html>
       - unexpected value "http://127.0.0.1:4173/entries/new"

```

```yaml
- main:
  - link "← Volver a entradas":
    - /url: /?q=bowl&status=INACTIVE
  - heading "Nueva entrada" [level=1]
  - paragraph: Nombre, descripción, categorías e imagen de referencia.
  - region "Identidad de la entrada":
    - heading "Identidad de la entrada" [level=2]
    - text: Nombre comercial
    - textbox "Nombre comercial": Bowl de pollo
    - text: Descripción
    - textbox "Descripción": Pollo con arroz.
  - group "Categorías":
    - text: Categorías
    - paragraph: Puedes asignar varias o guardar sin clasificación.
    - button "1 categoría seleccionada"
    - list "Categorías seleccionadas":
      - listitem:
        - text: Principales
        - button "Retirar categoría Principales": ×
  - complementary:
    - region "Imagen de referencia":
      - heading "Imagen de referencia" [level=2]
      - button "Cambiar imagen":
        - img "Vista previa de la imagen de la entrada"
        - text: Cambiar imagen
      - button "Archivo de imagen"
      - paragraph: bowl.png
      - paragraph: JPEG, PNG o WebP · hasta aprox. 10,49 MB y 4096 × 4096 px.
  - button "Cancelar"
  - button "Guardar entrada"
```

# Test source

```ts
  1   | import { readFileSync } from "node:fs";
  2   | import { resolve } from "node:path";
  3   | import { expect, test } from "@playwright/test";
  4   | 
  5   | test("creates and edits an entry with separate image upload and JSON writes", async ({ page }) => {
  6   |   const imageBytes = readFileSync(resolve(process.cwd(), "mockups/renders/V2-crear-editar-entrada.png"));
  7   |   const requests: { method: string; url: string; body: string }[] = [];
  8   |   let detailReads = 0;
  9   |   await page.route("**/image-1", (route) => route.fulfill({ contentType: "image/png", body: imageBytes }));
  10  | 
  11  |   await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({
  12  |     json: {
  13  |       data: [{ id: "category-1", name: "Principales", description: "" }],
  14  |       meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  15  |     },
  16  |   }));
  17  |   await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({
  18  |     json: {
  19  |       data: [{
  20  |         id: "entry-1", brandName: "Bowl de pollo", description: "Pollo con arroz.", status: "INACTIVE",
  21  |         image: null, categories: [{ id: "category-1", name: "Principales" }], offerCount: 0,
  22  |       }],
  23  |       meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
  24  |     },
  25  |   }));
  26  |   await page.route("**/api/v1/media/images", async (route) => {
  27  |     const request = route.request();
  28  |     requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
  29  |     await route.fulfill({ status: 201, json: { data: { id: "image-1", url: "/image-1", thumbnailUrl: "/image-1" } } });
  30  |   });
  31  |   await page.route("**/api/v1/menu/entries", async (route) => {
  32  |     const request = route.request();
  33  |     requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
  34  |     await route.fulfill({
  35  |       status: 201,
  36  |       json: {
  37  |         data: {
  38  |           id: "entry-1", brandName: "Bowl de pollo", description: "Pollo con arroz.",
  39  |           image: { id: "image-1", url: "/image-1", thumbnailUrl: "/image-1" }, status: "INACTIVE", categoryIds: ["category-1"],
  40  |         },
  41  |       },
  42  |     });
  43  |   });
  44  |   await page.route("**/api/v1/menu/entries/entry-1", async (route) => {
  45  |     if (route.request().method() === "GET") {
  46  |       detailReads += 1;
  47  |       await route.fulfill({
  48  |         headers: { ETag: '"rev-3"' },
  49  |         json: {
  50  |           data: {
  51  |             id: "entry-1", brandName: "Bowl de pollo", description: "Pollo con arroz.",
  52  |             image: { id: "image-1", url: "/image-1", thumbnailUrl: "/image-1" }, status: "INACTIVE", categoryIds: ["category-1"],
  53  |           },
  54  |         },
  55  |       });
  56  |       return;
  57  |     }
  58  |     const request = route.request();
  59  |     expect(request.headers()["if-match"]).toBe('"rev-3"');
  60  |     requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
  61  |     await route.fulfill({
  62  |       json: {
  63  |         data: {
  64  |           id: "entry-1", brandName: "Bowl especial", description: "Con vegetales.",
  65  |           image: { id: "image-1", url: "/image-1", thumbnailUrl: "/image-1" }, status: "INACTIVE", categoryIds: ["category-1"],
  66  |         },
  67  |       },
  68  |     });
  69  |   });
  70  | 
  71  |   await page.goto("/?q=bowl&status=INACTIVE");
  72  |   await page.getByRole("link", { name: "Nueva entrada" }).click();
  73  |   await expect(page).toHaveURL(/\/entries\/new$/);
  74  |   await page.getByLabel("Nombre comercial").fill("Bowl de pollo");
  75  |   await page.getByLabel("Descripción").fill("Pollo con arroz.");
  76  |   await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  77  |   await page.getByRole("checkbox", { name: "Principales" }).check();
  78  |   await page.getByLabel("Archivo de imagen").setInputFiles({
  79  |     name: "bowl.png", mimeType: "image/png", buffer: imageBytes,
  80  |   });
  81  |   await expect(page.getByRole("button", { name: "Guardar entrada" })).toBeEnabled();
  82  |   await page.getByRole("button", { name: "Guardar entrada" }).click();
> 83  |   await expect(page).toHaveURL(/\/?q=bowl&status=INACTIVE$/);
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  84  |   await expect(page.getByRole("heading", { name: "Bowl de pollo" })).toBeVisible();
  85  | 
  86  |   expect(requests[0].method).toBe("POST");
  87  |   expect(requests[0].url).toContain("/media/images");
  88  |   expect(requests[0].body).toContain('name="file"');
  89  |   expect(requests[0].body).toContain("bowl.png");
  90  |   expect(requests[1].url).toContain("/menu/entries");
  91  |   expect(JSON.parse(requests[1].body)).toEqual({
  92  |     brandName: "Bowl de pollo", description: "Pollo con arroz.", categoryIds: ["category-1"], imageId: "image-1",
  93  |   });
  94  | 
  95  |   await page.getByRole("link", { name: "Editar Bowl de pollo" }).click();
  96  |   await expect(page.getByRole("img", { name: "Vista previa de la imagen de la entrada" })).toBeVisible();
  97  |   await expect(page.getByText("Si no seleccionas otra imagen, se conservará la actual.")).toBeVisible();
  98  |   await page.getByLabel("Descripción").fill("Con vegetales.");
  99  |   const readsBeforeSave = detailReads;
  100 |   await page.getByRole("button", { name: "Guardar cambios" }).click();
  101 |   await expect(page).toHaveURL(/\/?q=bowl&status=INACTIVE$/);
  102 | 
  103 |   expect(requests[2]).toMatchObject({ method: "PATCH" });
  104 |   expect(detailReads).toBe(readsBeforeSave);
  105 |   expect(requests[2].body).toBe(JSON.stringify({
  106 |     brandName: "Bowl de pollo", description: "Con vegetales.", categoryIds: ["category-1"],
  107 |   }));
  108 | });
  109 | 
```