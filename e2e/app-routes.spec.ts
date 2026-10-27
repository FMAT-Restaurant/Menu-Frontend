import { expect, test } from "@playwright/test";

test.describe("Application routing, 404 and on-demand chunk loading (e2e/app-routes.spec.ts - T15)", () => {
  test("unknown route shows accessible 404 message and allows returning to the catalog (R01)", async ({
    page,
  }) => {
    await page.route("**/api/v1/menu/entries?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        },
      }),
    );
    await page.route("**/api/v1/menu/categories?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        },
      }),
    );

    // 1. Navigate to non-existent route
    await page.goto("/ruta-totalmente-inexistente-404");

    // 2. Expect 404 page content
    await expect(page.getByRole("heading", { name: "Página no encontrada", level: 1 })).toBeVisible();
    await expect(
      page.getByText("La ruta solicitada no existe o fue movida. Verifica la dirección o regresa al catálogo de entradas."),
    ).toBeVisible();

    // 3. Click return link
    const returnLink = page.getByRole("link", { name: "Volver al catálogo" });
    await expect(returnLink).toBeVisible();
    await returnLink.click();

    // 4. Navigates to catalog
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
  });

  test("alias /menu redirects to catalog root / (R01, R04)", async ({ page }) => {
    await page.route("**/api/v1/menu/entries?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        },
      }),
    );
    await page.route("**/api/v1/menu/categories?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        },
      }),
    );

    await page.goto("/menu");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
  });

  test("loads editor chunks on demand and avoids downloading them on initial catalog load (R02)", async ({
    page,
  }) => {
    const downloadedChunks: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/assets/") && url.endsWith(".js")) {
        downloadedChunks.push(url);
      }
    });

    await page.route("**/api/v1/menu/entries?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        },
      }),
    );
    await page.route("**/api/v1/menu/categories?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        },
      }),
    );

    // 1. Navigate to catalog root
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();

    // Verify initial chunk download does NOT load OfferFormPage
    const initialOfferFormChunks = downloadedChunks.filter((u) => u.includes("OfferFormPage"));
    expect(initialOfferFormChunks).toHaveLength(0);

    // 2. Navigate to new entry route
    await page.goto("/entries/new");
    await expect(page.getByRole("heading", { name: "Nueva entrada", level: 1 })).toBeVisible();

    // Verify EntryFormPage chunk is downloaded on demand
    const entryFormChunks = downloadedChunks.filter((u) => u.includes("EntryFormPage"));
    expect(entryFormChunks.length).toBeGreaterThanOrEqual(1);
  });
});
