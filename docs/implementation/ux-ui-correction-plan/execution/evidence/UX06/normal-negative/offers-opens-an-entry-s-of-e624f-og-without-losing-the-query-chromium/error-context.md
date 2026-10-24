# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offers.spec.ts >> opens an entry's offers and returns to the catalog without losing the query
- Location: e2e\offers.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Ofertas de Hamburguesa Hawaiana' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Ofertas de Hamburguesa Hawaiana' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Ofertas de Hamburguesa Hawaiana' })

```

```yaml
- main:
  - heading "Entradas del menú" [level=1]
  - link "Biblioteca de recetas":
    - /url: /recipes
  - link "Categorías":
    - /url: /categories
  - link "Nueva entrada":
    - /url: /entries/new
  - region "Filtros de entradas":
    - search:
      - text: Buscar entradas
      - searchbox "Buscar entradas": hawai
      - button "Buscar ahora": Buscar
    - text: Categoría
    - combobox "Categoría":
      - option "Todas las categorías" [selected]
      - option "Sin categoría"
    - text: Estado administrativo
    - combobox "Estado administrativo":
      - option "Todos los estados" [selected]
      - option "Activa"
      - option "Inactiva"
      - option "Archivada"
    - button "Limpiar filtros"
  - paragraph: Mostrando 1–1 de 1 entradas
  - text: Entradas por página
  - combobox "Entradas por página":
    - option "6"
    - option "12" [selected]
    - option "24"
  - article:
    - img "Sin imagen de Hamburguesa Hawaiana": Sin imagen
    - text: Inactiva
    - heading "Hamburguesa Hawaiana" [level=2]
    - paragraph: Con piña
    - text: "Sin categoría Estado:"
    - strong: Inactiva
    - text: "Ofertas:"
    - strong: "1"
    - link "Ver ofertas de Hamburguesa Hawaiana":
      - /url: /entries/entry-1/offers
      - text: Ver ofertas
    - link "Editar Hamburguesa Hawaiana":
      - /url: /entries/entry-1/edit
      - text: Editar
    - button "Eliminar definitivamente Hamburguesa Hawaiana" [disabled]: Eliminar
    - paragraph: Solo se pueden eliminar entradas archivadas.
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | test("opens an entry's offers and returns to the catalog without losing the query", async ({ page }) => {
  4   |   const status = "INACTIVE";
  5   |   const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE", image: null, categories: [], offerCount: 1 };
  6   |   const offer = () => ({
  7   |     id: "offer-1", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Combo",
  8   |     basePrice: 180, status, image: null, slotCount: 1,
  9   |   });
  10  |   await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } }));
  11  |   await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({ json: { data: [entry], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  12  |   await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  13  |   await page.route("**/api/v1/menu/offers?*", (route) => route.fulfill({ json: { data: [offer()], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  14  |   await page.route("**/api/v1/menu/offers/offer-1", (route) => route.fulfill({
  15  |     headers: { ETag: '"offer-rev-1"' },
  16  |     json: {
  17  |       data: {
  18  |         ...offer(),
  19  |         composition: { slots: [] },
  20  |       },
  21  |     },
  22  |   }));
  23  | 
  24  |   await page.goto("/?q=hawai");
  25  |   const card = await page.getByRole("article").boundingBox();
  26  |   await page.mouse.click(card!.x + 24, card!.y + 24);
> 27  |   await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
      |                                                                                        ^ Error: expect(locator).toBeVisible() failed
  28  |   await expect(page.getByRole("heading", { name: "Combo" })).toBeVisible();
  29  |   await expect(page.getByText(/solo se publica si la entrada está activa/)).toBeVisible();
  30  |   await expect(page.getByRole("button", { name: "Eliminar oferta Combo" })).toBeVisible();
  31  |   await expect(page.getByRole("button", { name: "Cambiar estado de oferta Combo: Inactiva" })).toHaveCSS("border-radius", "999px");
  32  |   await expect(page.locator(".offer-card__composition")).toHaveCSS("justify-content", "center");
  33  |   await page.getByRole("link", { name: "Abrir oferta Combo para editar" }).click();
  34  |   await expect(page.getByRole("heading", { name: "Editar oferta" })).toBeVisible();
  35  |   await page.getByRole("link", { name: /Volver a ofertas/ }).click();
  36  |   await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  37  |   await page.getByRole("link", { name: /Volver a entradas/ }).click();
  38  |   await expect(page).toHaveURL(/\/?q=hawai$/);
  39  | });
  40  | 
  41  | test("keeps the offers view inside narrow screens and reconciles an out-of-range last page", async ({ page }) => {
  42  |   let total = 13;
  43  |   const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "ACTIVE", image: null, categories: [], offerCount: total };
  44  |   const offers = (requestedPage: number) => ({
  45  |     data: requestedPage === 1 ? Array.from({ length: 12 }, (_, index) => ({
  46  |       id: `offer-${index + 1}`, entryId: "entry-1", entryName: entry.brandName,
  47  |       presentationTag: `Presentación ${index + 1}`, basePrice: 180 + index,
  48  |       status: "INACTIVE", image: null, slotCount: 1,
  49  |     })) : total > 12 ? [{ id: "offer-13", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Familiar", basePrice: 240, status: "INACTIVE", image: null, slotCount: 1 }] : [],
  50  |     meta: { page: requestedPage, pageSize: 12, total, totalPages: Math.ceil(total / 12) },
  51  |   });
  52  |   await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  53  |   await page.route("**/api/v1/menu/offers/offer-13", async (route) => {
  54  |     if (route.request().method() === "GET") {
  55  |       await route.fulfill({ headers: { ETag: '"offer-rev-13"' }, json: { data: { id: "offer-13", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Familiar", basePrice: 240, status: "INACTIVE", image: null, slotCount: 1, composition: { slots: [] } } } });
  56  |       return;
  57  |     }
  58  |     if (route.request().method() === "DELETE") total = 12;
  59  |     await route.fulfill({ status: 204 });
  60  |   });
  61  |   await page.route("**/api/v1/menu/offers?*", async (route) => {
  62  |     const requestedPage = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
  63  |     await route.fulfill({ json: offers(requestedPage) });
  64  |   });
  65  |   await page.goto("/entries/entry-1/offers?page=2");
  66  |   await expect(page.getByRole("heading", { name: "Familiar" })).toBeVisible();
  67  |   await page.getByRole("button", { name: "Eliminar oferta Familiar" }).click();
  68  |   await page.getByRole("dialog").getByRole("button", { name: "Eliminar oferta", exact: true }).click();
  69  |   await expect(page).toHaveURL(/\/entries\/entry-1\/offers\?page=1$/);
  70  |   await expect(page.getByRole("heading", { name: "Presentación 1", exact: true })).toBeVisible();
  71  | 
  72  |   for (const [width, height] of [[1366, 768], [1024, 600], [390, 844], [320, 568]]) {
  73  |     await page.setViewportSize({ width, height });
  74  |     const dimensions = await page.evaluate(() => ({
  75  |       scroll: document.documentElement.scrollWidth,
  76  |       viewport: document.documentElement.clientWidth,
  77  |     }));
  78  |     expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  79  |   }
  80  | });
  81  | 
  82  | test("keeps the single empty-state CTA visible at 1024x600 and prevents horizontal overflow at 320x568", async ({ page }) => {
  83  |   const entry = { id: "fixture-entry", brandName: "Entrada de prueba", description: "Descripción", status: "INACTIVE", image: null, categories: [], offerCount: 0 };
  84  |   await page.route("**/api/v1/menu/entries/fixture-entry", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  85  |   await page.route("**/api/v1/menu/offers?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  86  |   await page.setViewportSize({ width: 1024, height: 600 });
  87  |   await page.goto("/entries/fixture-entry/offers");
  88  |   await expect(page.getByText("No hay ofertas configuradas.")).toBeVisible();
  89  |   await expect(page.getByRole("link", { name: "Crear primera oferta" })).toBeVisible();
  90  |   await expect(page.getByRole("link", { name: "Nueva oferta" })).toHaveCount(0);
  91  |   await expect(page.getByText(/Mostrando/)).toHaveCount(0);
  92  |   const cta = await page.getByRole("link", { name: "Crear primera oferta" }).boundingBox();
  93  |   expect(cta).not.toBeNull();
  94  |   expect(cta!.y + cta!.height).toBeLessThanOrEqual(600);
  95  |   await page.setViewportSize({ width: 320, height: 568 });
  96  |   const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  97  |   expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  98  | });
  99  | 
  100 | test("separately verifies delete dialog cancel button and Escape key restore focus to trigger without mutating", async ({ page }) => {
  101 |   let deleteAttempts = 0;
  102 |   const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE", image: null, categories: [], offerCount: 1 };
  103 |   const offer = {
  104 |     id: "offer-1", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Combo",
  105 |     basePrice: 180, status: "INACTIVE", image: null, slotCount: 1,
  106 |   };
  107 |   await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  108 |   await page.route("**/api/v1/menu/offers?*", (route) => route.fulfill({ json: { data: [offer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  109 |   await page.route("**/api/v1/menu/offers/offer-1", (route) => {
  110 |     if (route.request().method() === "DELETE") {
  111 |       deleteAttempts++;
  112 |       return route.fulfill({ status: 204 });
  113 |     }
  114 |     return route.fulfill({ json: { data: offer } });
  115 |   });
  116 | 
  117 |   await page.goto("/entries/entry-1/offers");
  118 |   await expect(page.getByRole("heading", { name: "Combo" })).toBeVisible();
  119 | 
  120 |   // Test 1: Cancel button
  121 |   const trigger = page.getByRole("button", { name: "Eliminar oferta Combo" });
  122 |   await trigger.click();
  123 |   const dialog = page.getByRole("dialog");
  124 |   await expect(dialog).toBeVisible();
  125 |   const cancelBtn = dialog.getByRole("button", { name: "Cancelar" });
  126 |   await expect(cancelBtn).toBeFocused();
  127 |   await cancelBtn.click();
```