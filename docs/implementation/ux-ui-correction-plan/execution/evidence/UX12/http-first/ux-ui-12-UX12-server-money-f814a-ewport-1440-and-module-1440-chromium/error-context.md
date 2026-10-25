# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-12.spec.ts >> UX12 server money review preserves local precision at viewport 1440 and module 1440
- Location: e2e\ux-ui-12.spec.ts:5:3

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Precio base (MXN)', { exact: true })
Expected: "0"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" getByLabel('Precio base (MXN)', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Precio base (MXN)', { exact: true })

```

```yaml
- main:
  - link "← Volver a ofertas":
    - /url: /entries/entry-ux12/offers
  - heading "Editar oferta" [level=1]
  - paragraph:
    - text: "Entrada:"
    - strong: Cargando…
  - alert:
    - text: Respuesta de oferta inválida.
    - button "Reintentar"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { moneyEvidence } from "./ux-ui-12-evidence";
  3  | 
  4  | for (const [width, moduleWidth] of [[320, 320], [390, 390], [600, 600], [740, 740], [1024, 1024], [1440, 1440], [1440, 390]]) {
  5  |   test(`UX12 server money review preserves local precision at viewport ${width} and module ${moduleWidth}`, async ({ page }, info) => {
  6  |     const errors: string[] = []; const unexpected: string[] = [];
  7  |     const writes: { price: number; etag: string | undefined }[] = [];
  8  |     let reads = 0;
  9  |     const offer = {
  10 |       id: "offer-ux12", entryId: "entry-ux12", presentationTag: "Individual", basePrice: 0, status: "INACTIVE",
  11 |       image: { id: "image-ux12", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'/%3E" },
  12 |       composition: { slots: [{ slotId: "slot-ux12", name: "Principal", quantity: 1, status: "ACTIVE", options: [
  13 |         { optionId: "option-ux12", displayName: "Receta base", status: "ACTIVE", sourceType: "RECIPE", recipeId: "recipe-ux12" },
  14 |       ] }] },
  15 |     };
  16 |     page.on("pageerror", error => errors.push(error.message));
  17 |     await page.route("**/api/v1/**", async route => {
  18 |       const request = route.request(); const path = new URL(request.url()).pathname;
  19 |       if (path === "/api/v1/menu/offers/offer-ux12") {
  20 |         if (request.method() === "PATCH") {
  21 |           writes.push({ price: request.postDataJSON().basePrice, etag: request.headers()["if-match"] });
  22 |           await route.fulfill({ status: 412, json: { message: "Version changed" } }); return;
  23 |         }
  24 |         reads += 1;
  25 |         await route.fulfill({ headers: { ETag: reads === 1 ? '"offer-rev-1"' : '"offer-rev-2"' },
  26 |           json: { data: { ...offer, basePrice: reads === 1 ? 0 : 123456789.5 } } }); return;
  27 |       }
  28 |       if (path === "/api/v1/menu/entries/entry-ux12") {
  29 |         await route.fulfill({ json: { data: { id: "entry-ux12", brandName: "Entrada UX12", description: "", status: "ACTIVE", categoryIds: [], categories: [], offerCount: 1 } } }); return;
  30 |       }
  31 |       if (path === "/api/v1/menu/recipes") {
  32 |         await route.fulfill({ json: { data: [{ id: "recipe-ux12", name: "Receta base", description: "", supplies: [] }], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } } }); return;
  33 |       }
  34 |       unexpected.push(`${request.method()} ${path}`); await route.fulfill({ status: 500, json: { message: "Unexpected UX12 fixture request" } });
  35 |     });
  36 |     await page.setViewportSize({ width, height: 1000 });
  37 |     await page.goto("/entries/entry-ux12/offers/offer-ux12/edit");
  38 |     if (moduleWidth !== width) await page.addStyleTag({ content: `[data-menu-module] { width: ${moduleWidth}px; max-width: 100%; margin-inline: auto; }` });
  39 |     const price = page.getByLabel("Precio base (MXN)", { exact: true });
> 40 |     await expect(price).toHaveValue("0");
     |                         ^ Error: expect(locator).toHaveValue(expected) failed
  41 |     await expect(page.locator("#offer-price-preview")).toHaveText("MXN\u00a00.00");
  42 |     await price.fill("145.125");
  43 |     await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  44 |     await page.getByRole("button", { name: "Revisar oferta actual", exact: true }).click();
  45 |     const region = page.getByRole("region", { name: "Versión del servidor", exact: true });
  46 |     await expect(region.locator(".offer-review-price strong")).toHaveText("MXN\u00a0123,456,789.50");
  47 |     await expect(region).toContainText('"offer-rev-2"');
  48 |     await expect(price).toHaveValue("145.125");
  49 |     await expect(page.locator("#offer-price-preview")).toHaveText("MXN\u00a0145.13");
  50 |     await moneyEvidence(page, info, "server-review-long-price");
  51 |     expect(writes).toEqual([{ price: 145.125, etag: '"offer-rev-1"' }]);
  52 |     expect(reads).toBe(2);
  53 |     await region.getByRole("button", { name: "Adoptar versión del servidor", exact: true }).click();
  54 |     await expect(region).toHaveCount(0);
  55 |     await expect(price).toHaveValue("145.125");
  56 |     expect(writes).toHaveLength(1);
  57 |     expect(unexpected).toEqual([]); expect(errors).toEqual([]);
  58 |   });
  59 | }
  60 | 
```