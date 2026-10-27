import { expect, test } from "@playwright/test";
import { moneyEvidence } from "./ux-ui-12-evidence";

for (const [width, moduleWidth] of [[320, 320], [390, 390], [600, 600], [740, 740], [1024, 1024], [1440, 1440], [1440, 390]]) {
  test(`UX12 money remains readable at viewport ${width} and module ${moduleWidth}`, async ({ page }, info) => {
    const errors: string[] = []; const api: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/entries/demo-entry-burger/offers");
    if (moduleWidth !== width) await page.addStyleTag({ content: `[data-menu-module] { width: ${moduleWidth}px; max-width: 100%; margin-inline: auto; }` });
    await page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true }).click();
    const price = page.getByLabel("Precio base (MXN)", { exact: true });
    await expect(price).toHaveValue("145");
    await expect(page.locator("#offer-price-preview")).toHaveText("MXN\u00a0145.00");
    await price.fill("");
    await expect(page.locator("#offer-price-preview")).toHaveCount(0);
    await price.fill("123456789.5");
    await expect(page.locator("#offer-price-preview")).toHaveText("MXN\u00a0123,456,789.50");
    await expect(price).toHaveValue("123456789.5");
    await moneyEvidence(page, info, "editor-long-price");
    await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
    const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Individual", exact: true }) });
    await expect(card.locator(".offer-card__price")).toHaveText("MXN\u00a0123,456,789.50");
    await moneyEvidence(page, info, "card-long-price");
    await card.getByRole("link").click();
    await expect(price).toHaveValue("123456789.5");
    await price.fill("145.125");
    await expect(page.locator("#offer-price-preview")).toHaveText("MXN\u00a0145.13");
    await expect(price).toHaveValue("145.125");
    await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
    await expect(card.locator(".offer-card__price")).toHaveText("MXN\u00a0145.13");
    await card.getByRole("link").click();
    await expect(price).toHaveValue("145.125");
    await moneyEvidence(page, info, "precision-retained");
    expect(api).toEqual([]); expect(errors).toEqual([]);
  });
}
