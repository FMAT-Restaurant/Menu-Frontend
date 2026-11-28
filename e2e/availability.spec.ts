import { expect, test } from "@playwright/test";

function permissionToken(permissions: string[]) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions })}.signature`;
}

test("administrative catalog, offers and composition editor display availability and orderability (FE-11)", async ({ page }) => {
  await page.route("**/api/v1/menu/categories*", (route) =>
    route.fulfill({
      json: {
        data: [{ id: "cat-1", name: "Platos fuertes", description: "", entryCount: 2 }],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      },
    }),
  );

  await page.route("**/api/v1/menu/entries?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "entry-available",
            brandName: "Hamburguesa Clásica",
            description: "Con carne disponible",
            status: "ACTIVE",
            image: null,
            categories: [{ id: "cat-1", name: "Platos fuertes" }],
            offerCount: 1,
            isAvailable: true,
          },
          {
            id: "entry-unavailable",
            brandName: "Pastel Especial",
            description: "Receta agotada",
            status: "ACTIVE",
            image: null,
            categories: [{ id: "cat-1", name: "Platos fuertes" }],
            offerCount: 1,
            isAvailable: false,
          },
        ],
        meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 },
      },
    }),
  );

  await page.route("**/api/v1/menu/entries/entry-unavailable", (route) =>
    route.fulfill({
      headers: { ETag: '"rev-1-u"' },
      json: {
        data: {
          id: "entry-unavailable",
          brandName: "Pastel Especial",
          description: "Receta agotada",
          status: "ACTIVE",
          image: null,
          categoryIds: ["cat-1"],
          isAvailable: false,
        },
      },
    }),
  );

  await page.route("**/api/v1/menu/offers?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "offer-unavailable",
            entryId: "entry-unavailable",
            entryName: "Pastel Especial",
            presentationTag: "Rebanada",
            basePrice: 95,
            status: "ACTIVE",
            image: null,
            slotCount: 1,
            isAvailable: false,
          },
        ],
        meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
      },
    }),
  );

  await page.route("**/api/v1/menu/offers/offer-unavailable", (route) =>
    route.fulfill({
      headers: { ETag: '"rev-2-f00d"' },
      json: {
        data: {
          id: "offer-unavailable",
          entryId: "entry-unavailable",
          presentationTag: "Rebanada",
          basePrice: 95,
          status: "ACTIVE",
          isAvailable: false,
          image: null,
          composition: {
            slots: [
              {
                slotId: "slot-1",
                name: "Postre",
                quantity: 1,
                course: "postre",
                isAvailable: false,
                options: [
                  {
                    optionId: "opt-1",
                    displayName: "Pastel tres leches",
                    status: "ACTIVE",
                    isAvailable: false,
                    sourceType: "RECIPE",
                    recipeId: "rec-1",
                  },
                ],
              },
            ],
          },
        },
      },
    }),
  );

  await page.goto("/");

  const availableEntry = page.locator(".entry-card").filter({ has: page.getByRole("heading", { name: "Hamburguesa Clásica" }) });
  const unavailableEntry = page.locator(".entry-card").filter({ has: page.getByRole("heading", { name: "Pastel Especial" }) });

  await expect(availableEntry.getByText("Disponible", { exact: true })).toBeVisible();
  await expect(availableEntry.getByText("Ordenable", { exact: true })).toBeVisible();

  await expect(unavailableEntry.getByText("No disponible", { exact: true })).toBeVisible();
  await expect(unavailableEntry.getByText("No ordenable · Sin ofertas activas disponibles")).toBeVisible();

  await unavailableEntry.getByRole("link", { name: "Ver ofertas de Pastel Especial" }).click();

  const offerCard = page.locator(".offer-card").filter({ has: page.getByRole("heading", { name: "Rebanada" }) });
  await expect(offerCard.getByText("No disponible", { exact: true })).toBeVisible();
  await expect(offerCard.getByText("No ordenable · Sin disponibilidad")).toBeVisible();

  await offerCard.getByRole("link", { name: "Abrir oferta Rebanada para editar" }).click();

  const summary = page.getByLabel("Disponibilidad derivada de la oferta");
  await expect(summary.getByText("No disponible", { exact: true })).toBeVisible();
  await expect(summary.getByText("No ordenable · Sin disponibilidad")).toBeVisible();

  const slotCard = page.getByTestId("slot-card-0");
  await expect(slotCard.getByText(/Grupo no disponible/)).toBeVisible();

  const optionItem = page.getByTestId("slot-option-0");
  await expect(optionItem.getByText("Receta sin disponibilidad en Inventario.")).toBeVisible();
});

test("consultation view disables unavailable entries, offers, slots and options and highlights orderable ones (FE-11)", async ({ page }) => {
  const token = permissionToken(["menu:catalog:read"]);
  await page.addInitScript((value) => {
    localStorage.setItem("fmat_restaurant_auth_session", JSON.stringify({ accessToken: value }));
  }, token);

  await page.route("**/api/v1/menu/catalog/categories", (route) =>
    route.fulfill({
      json: {
        data: [{ id: "cat-1", name: "Bebidas", entryCount: 2 }],
        uncategorized: { entryCount: 0 },
      },
    }),
  );

  await page.route("**/api/v1/menu/catalog?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "entry-ok",
            brandName: "Agua Fresca",
            description: "Del día",
            image: null,
            categoryIds: ["cat-1"],
            isAvailable: true,
            offers: [
              {
                id: "offer-ok",
                presentationTag: "Vaso 500 ml",
                basePrice: 35,
                image: null,
                isAvailable: true,
                composition: {
                  slots: [
                    {
                      slotId: "slot-ok",
                      name: "Sabor",
                      quantity: 1,
                      course: "bebida",
                      isAvailable: true,
                      options: [{ optionId: "opt-ok", displayName: "Jamaica", isAvailable: true }],
                    },
                  ],
                },
              },
            ],
          },
          {
            id: "entry-out",
            brandName: "Malteada Especial",
            description: "Helado artesanal",
            image: null,
            categoryIds: ["cat-1"],
            isAvailable: false,
            offers: [
              {
                id: "offer-out",
                presentationTag: "Copa grande",
                basePrice: 85,
                image: null,
                isAvailable: false,
                composition: {
                  slots: [
                    {
                      slotId: "slot-out",
                      name: "Base",
                      quantity: 1,
                      course: "bebida",
                      isAvailable: false,
                      options: [{ optionId: "opt-out", displayName: "Vainilla", isAvailable: false }],
                    },
                  ],
                },
              },
            ],
          },
        ],
        meta: { page: 1, pageSize: 24, total: 2, totalPages: 1 },
      },
    }),
  );

  await page.goto("/");

  const okCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Agua Fresca" }) });
  const outCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Malteada Especial" }) });

  await expect(okCard.getByText("Ordenable", { exact: true })).toBeVisible();
  await expect(okCard).not.toContainText("No disponible");

  await expect(outCard).toHaveAttribute("aria-disabled", "true");
  await expect(outCard).toContainText("No disponible");
  await expect(outCard).toContainText("No ordenable");
  await expect(outCard).toContainText("Sin existencias en Inventario");
});
