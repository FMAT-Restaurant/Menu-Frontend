import { expect, test } from "@playwright/test";

test("opens an entry's offers and changes an offer state without losing the catalog query", async ({ page }) => {
  let status = "INACTIVE";
  const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE", image: null, categories: [], offerCount: 1 };
  const offer = () => ({
    id: "offer-1", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Combo",
    basePrice: 180, status, image: null, slotCount: 1,
  });
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } }));
  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({ json: { data: [entry], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  await page.route("**/api/v1/menu/offers?*", (route) => route.fulfill({ json: { data: [offer()], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/offers/offer-1", async (route) => {
    if (route.request().method() === "PATCH") {
      expect(route.request().headers()["if-match"]).toBe('"offer-rev-1"');
      expect(JSON.parse(route.request().postData() ?? "{}")).toEqual({ status: "ACTIVE" });
      status = "ACTIVE";
    }
    await route.fulfill({ headers: { ETag: '"offer-rev-1"' }, json: { data: { ...offer(), status } } });
  });

  await page.goto("/?q=hawai");
  const card = await page.getByRole("article").boundingBox();
  await page.mouse.click(card!.x + 24, card!.y + 24);
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Combo" })).toBeVisible();
  await expect(page.getByText(/solo se publica si la entrada está activa/)).toBeVisible();
  await page.getByRole("button", { name: "Activar oferta Combo" }).click();
  await expect(page.getByText("Oferta activada.")).toBeVisible();
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(page).toHaveURL(/\/?q=hawai$/);
});
