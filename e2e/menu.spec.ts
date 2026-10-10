import { expect, test } from "@playwright/test";

test("searches the administrative entries and opens their management routes", async ({ page }) => {
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({
    json: {
      data: [{ id: "category-1", name: "Hamburguesas", description: "", entryCount: 1 }],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    },
  }));
  await page.route("**/api/v1/menu/entries?*", (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    const data = q ? [] : [{
      id: "entry-1",
      brandName: "Hamburguesa Hawaiana",
      description: "Carne, queso y piña",
      status: "ACTIVE",
      image: null,
      categories: [{ id: "category-1", name: "Hamburguesas" }],
      offerCount: 2,
    }];
    return route.fulfill({ json: { data, meta: { page: 1, pageSize: 12, total: data.length, totalPages: data.length ? 1 : 0 } } });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entradas del menú" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();
  await expect(page.getByText(/El estado administrativo no confirma publicación/)).toBeVisible();

  await page.getByRole("searchbox", { name: "Buscar entradas" }).fill("sin resultados");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("No hay coincidencias para esta consulta.")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).last().click();
  await expect(page.getByRole("heading", { name: "Hamburguesa Hawaiana" })).toBeVisible();

  await page.getByRole("link", { name: "Ver ofertas de Hamburguesa Hawaiana" }).click();
  await expect(page).toHaveURL(/\/entries\/entry-1\/offers$/);
  await expect(page.getByRole("heading", { name: "Ofertas de entrada" })).toBeVisible();
});
