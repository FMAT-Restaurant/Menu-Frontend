import { expect, test } from "@playwright/test";

test("filters and pagination request only entries and returning to V1 reuses fresh data", async ({ page }) => {
  const completed: string[] = [];
  page.on("response", (response) => {
    if (response.ok() && response.url().includes("/api/v1/menu/")) completed.push(response.url());
  });
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({
    json: { data: [{ id: "category-1", name: "Principales", description: "" }], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } },
  }));
  await page.route("**/api/v1/menu/entries?*", (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get("page"));
    const status = url.searchParams.get("status") || "INACTIVE";
    const data = Array.from({ length: pageNumber === 3 ? 1 : 6 }, (_, index) => ({
      id: `entry-${pageNumber}-${index}`, brandName: `Entrada ${pageNumber}-${index}`,
      description: "Datos de prueba", status, image: null, categories: [], offerCount: 0,
    }));
    return route.fulfill({ json: { data, meta: { page: pageNumber, pageSize: 6, total: 13, totalPages: 3 } } });
  });

  await page.goto("/?pageSize=6");
  await expect(page.getByRole("heading", { name: "Entrada 1-0" })).toBeVisible();
  const categoryCount = completed.filter((url) => url.includes("/menu/categories")).length;
  const entryCount = completed.filter((url) => url.includes("/menu/entries")).length;
  await page.getByRole("combobox", { name: "Estado administrativo" }).selectOption("INACTIVE");
  await expect(page).toHaveURL(/status=INACTIVE/);
  await expect.poll(() => completed.filter((url) => url.includes("/menu/entries")).length).toBeGreaterThan(entryCount);
  await page.getByRole("button", { name: "Siguiente página" }).click();
  await expect(page.getByRole("heading", { name: "Entrada 2-0" })).toBeVisible();
  expect(completed.filter((url) => url.includes("/menu/categories"))).toHaveLength(categoryCount);

  const beforeReturn = completed.filter((url) => url.includes("/menu/entries")).length;
  await page.getByRole("link", { name: "Categorías" }).click();
  await page.getByRole("link", { name: /Volver al menú/ }).click();
  await expect(page.getByRole("heading", { name: "Entrada 2-0" })).toBeVisible();
  expect(completed.filter((url) => url.includes("/menu/entries"))).toHaveLength(beforeReturn);
});
