import { expect, test, type Page } from "@playwright/test";

interface CategoryRecord {
  id: string;
  name: string;
  description: string;
  entryCount: number;
}

interface DeleteRequest {
  ifMatch: string | undefined;
  body: string | null;
}

function seedCategories(): CategoryRecord[] {
  return [
    { id: "category-1", name: "Bebidas", description: "Frías", entryCount: 2 },
    { id: "category-2", name: "Postres", description: "Opciones dulces", entryCount: 0 },
  ];
}

/** Mocks the category endpoints; a DELETE removes the category from later list responses. */
async function mockCategoryApi(page: Page, categories: CategoryRecord[]) {
  const mutations: string[] = [];
  const deletes: DeleteRequest[] = [];

  page.on("request", (request) => {
    const [, apiPath] = new URL(request.url()).pathname.split("/api/v1");
    if (request.method() !== "GET" && apiPath !== undefined) {
      mutations.push(`${request.method()} ${apiPath}`);
    }
  });
  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({
    json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
  }));
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({
    headers: { ETag: 'W/"categories-4"' },
    json: { data: categories, meta: { page: 1, pageSize: 100, total: categories.length, totalPages: 1 } },
  }));
  await page.route("**/api/v1/menu/categories/category-1", (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      // The detail is newer than the list: one more entry was associated meanwhile.
      return route.fulfill({
        headers: { ETag: '"rev-3"' },
        json: { data: { ...categories[0], entryCount: 3 } },
      });
    }
    if (request.method() === "DELETE") {
      deletes.push({ ifMatch: request.headers()["if-match"], body: request.postData() });
      categories.splice(categories.findIndex((item) => item.id === "category-1"), 1);
      return route.fulfill({ status: 204 });
    }
    return route.continue();
  });

  return { mutations, deletes };
}

test("deletes a category with the ETag read when the confirmation opens", async ({ page }) => {
  const { mutations, deletes } = await mockCategoryApi(page, seedCategories());

  await page.goto("/categories");
  await expect(page.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Postres" })).toBeVisible();

  await page.getByRole("button", { name: "Eliminar Bebidas", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar categoría?" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  await expect(dialog).toContainText("Bebidas");
  await expect(dialog).toContainText("3 entradas asociadas");

  await dialog.getByRole("button", { name: "Eliminar categoría", exact: true }).click();

  await expect(dialog).not.toBeVisible();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  await expect(page.getByText('Categoría "Bebidas" eliminada.')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bebidas" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Postres" })).toBeVisible();
  expect(deletes).toEqual([{ ifMatch: '"rev-3"', body: null }]);
  expect(mutations).toEqual(["DELETE /menu/categories/category-1"]);
});

test("cancelling the confirmation with Cancelar or Escape sends no mutation and restores focus", async ({ page }) => {
  const { mutations } = await mockCategoryApi(page, seedCategories());

  await page.goto("/categories");
  const trigger = page.getByRole("button", { name: "Eliminar Bebidas", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar categoría?" });
  await expect(dialog.getByRole("button", { name: "Eliminar categoría", exact: true })).toBeEnabled();

  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog.getByRole("button", { name: "Eliminar categoría", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await expect(page.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  expect(mutations).toEqual([]);
});
