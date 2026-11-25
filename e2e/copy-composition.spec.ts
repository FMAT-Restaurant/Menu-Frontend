import { expect, test } from "@playwright/test";

test("global offers listing navigates to edit and copies composition from another offer", async ({
  page,
}) => {
  const entry = {
    id: "entry-1",
    brandName: "Hamburguesa",
    description: "Hamburguesa artesanal",
    status: "ACTIVE",
    image: null,
    categoryIds: [],
    offerCount: 2,
  };

  const sourceOffer = {
    id: "offer-source",
    entryId: "entry-2",
    entryName: "Pizza Margarita",
    presentationTag: "Combo Familiar",
    basePrice: 320,
    status: "ACTIVE",
    image: null,
    slotCount: 1,
    composition: {
      slots: [
        {
          slotId: "slot-src-1",
          name: "Bebida",
          quantity: 1,
          status: "ACTIVE",
          course: "bebida",
          options: [
            {
              optionId: "opt-src-1",
              sourceType: "RECIPE",
              recipeId: "rec-1",
              recipeName: "Limonada fresca",
              displayName: "Limonada",
              status: "ACTIVE",
            },
          ],
        },
      ],
    },
  };

  const destOffer = {
    id: "offer-dest",
    entryId: "entry-1",
    entryName: "Hamburguesa",
    presentationTag: "Combo Personal",
    basePrice: 180,
    status: "INACTIVE",
    image: null,
    slotCount: 0,
    composition: { slots: [] },
  };

  let lastUpdateBody: Record<string, unknown> | null = null;

  await page.route("**/api/v1/menu/categories*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/menu/entries?*", (route) =>
    route.fulfill({
      json: { data: [entry], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    }),
  );
  await page.route("**/api/v1/menu/entries/entry-1", (route) =>
    route.fulfill({ json: { data: entry }, headers: { ETag: '"entry-v1"' } }),
  );
  await page.route("**/api/v1/menu/offers?*", (route) => {
    const url = new URL(route.request().url());
    const excludeOfferId = url.searchParams.get("excludeOfferId");
    const list = [sourceOffer, destOffer].filter((o) => o.id !== excludeOfferId);
    return route.fulfill({
      json: { data: list, meta: { page: 1, pageSize: 12, total: list.length, totalPages: 1 } },
    });
  });
  await page.route("**/api/v1/menu/offers/offer-dest", async (route) => {
    if (route.request().method() === "PATCH") {
      lastUpdateBody = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({
        json: { data: { ...destOffer, composition: lastUpdateBody.composition } },
        headers: { ETag: '"offer-dest-v2"' },
      });
    }
    return route.fulfill({
      json: { data: destOffer },
      headers: { ETag: '"offer-dest-v1"' },
    });
  });
  await page.route("**/api/v1/menu/offers/offer-source", (route) =>
    route.fulfill({
      json: { data: sourceOffer },
      headers: { ETag: '"offer-src-v1"' },
    }),
  );

  // 1. Navigate from Catalog to Global Offers listing (/offers)
  await page.goto("/");
  await page.getByRole("link", { name: "Ofertas", exact: true }).click();
  await expect(page).toHaveURL(/\/offers$/);
  await expect(page.getByRole("heading", { name: "Ofertas del catálogo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Combo Personal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Combo Familiar" })).toBeVisible();

  // 2. Open destination offer edit from global list
  await page.getByRole("link", { name: /Combo Personal/i }).click();
  await expect(page).toHaveURL(/\/entries\/entry-1\/offers\/offer-dest\/edit$/);

  // 3. Open Copy Composition overlay and verify destination offer is excluded
  await page.getByRole("button", { name: "Copiar composición desde otra oferta" }).click();
  const dialog = page.getByRole("dialog", { name: "Copiar composición desde otra oferta" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Pizza Margarita")).toBeVisible();
  await expect(dialog.getByText("Combo Personal")).toHaveCount(0);

  // 4. Copy composition from source offer
  await dialog.getByRole("button", { name: /Copiar composición de Pizza Margarita/i }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("article", { name: /Grupo Bebida/i })).toBeVisible();
  await expect(page.getByText("Limonada")).toBeVisible();

  // 5. Save destination offer and verify copied composition was sent
  await page.getByRole("button", { name: /Guardar oferta/i }).click();
  await expect.poll(() => lastUpdateBody).not.toBeNull();
});
