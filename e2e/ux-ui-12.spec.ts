import { expect, test } from "@playwright/test";
import { moneyEvidence } from "./ux-ui-12-evidence";
import type { MenuOfferDetail } from "../src/application/catalog";

for (const [width, moduleWidth] of [[320, 320], [390, 390], [600, 600], [740, 740], [1024, 1024], [1440, 1440], [1440, 390]]) {
  test(`UX12 server money review preserves local precision at viewport ${width} and module ${moduleWidth}`, async ({ page }, info) => {
    const errors: string[] = []; const unexpected: string[] = [];
    const writes: { price: number; etag: string | undefined }[] = [];
    let reads = 0;
    const imageUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'/%3E";
    const offer: MenuOfferDetail = {
      id: "offer-ux12", entryId: "entry-ux12", presentationTag: "Individual", basePrice: 0, status: "INACTIVE",
      image: { id: "image-ux12", url: imageUrl, thumbnailUrl: imageUrl },
      composition: { slots: [{ slotId: "slot-ux12", name: "Principal", quantity: 1, status: "ACTIVE", options: [
        { optionId: "option-ux12", displayName: "Receta base", status: "ACTIVE", sourceType: "RECIPE", recipeId: "recipe-ux12" },
      ] }] },
    };
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/v1/**", async route => {
      const request = route.request(); const path = new URL(request.url()).pathname;
      if (path === "/api/v1/menu/offers/offer-ux12") {
        if (request.method() === "PATCH") {
          writes.push({ price: request.postDataJSON().basePrice, etag: request.headers()["if-match"] });
          await route.fulfill({ status: 412, json: { message: "Version changed" } }); return;
        }
        reads += 1;
        await route.fulfill({ headers: { ETag: reads === 1 ? '"offer-rev-1"' : '"offer-rev-2"' },
          json: { data: { ...offer, basePrice: reads === 1 ? 0 : 123456789.5 } } }); return;
      }
      if (path === "/api/v1/menu/entries/entry-ux12") {
        await route.fulfill({ json: { data: { id: "entry-ux12", brandName: "Entrada UX12", description: "", status: "ACTIVE", categoryIds: [], categories: [], offerCount: 1 } } }); return;
      }
      if (path === "/api/v1/menu/recipes") {
        await route.fulfill({ json: { data: [{ id: "recipe-ux12", name: "Receta base", description: "", supplies: [] }], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } } }); return;
      }
      unexpected.push(`${request.method()} ${path}`); await route.fulfill({ status: 500, json: { message: "Unexpected UX12 fixture request" } });
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/entries/entry-ux12/offers/offer-ux12/edit");
    if (moduleWidth !== width) await page.addStyleTag({ content: `[data-menu-module] { width: ${moduleWidth}px; max-width: 100%; margin-inline: auto; }` });
    const price = page.getByLabel("Precio base (MXN)", { exact: true });
    await expect(price).toHaveValue("0");
    await expect(page.locator("#offer-price-preview")).toHaveText("MXN\u00a00.00");
    await price.fill("145.125");
    await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
    await page.getByRole("button", { name: "Revisar oferta actual", exact: true }).click();
    const region = page.getByRole("region", { name: "Versión del servidor", exact: true });
    await expect(region.locator(".offer-review-price strong")).toHaveText("MXN\u00a0123,456,789.50");
    await expect(region).toContainText('"offer-rev-2"');
    await expect(price).toHaveValue("145.125");
    await expect(page.locator("#offer-price-preview")).toHaveText("MXN\u00a0145.13");
    await moneyEvidence(page, info, "server-review-long-price");
    expect(writes).toEqual([{ price: 145.125, etag: '"offer-rev-1"' }]);
    expect(reads).toBe(2);
    await region.getByRole("button", { name: "Adoptar versión del servidor", exact: true }).click();
    await expect(region).toHaveCount(0);
    await expect(price).toHaveValue("145.125");
    expect(writes).toHaveLength(1);
    expect(unexpected).toEqual([]); expect(errors).toEqual([]);
  });
}
