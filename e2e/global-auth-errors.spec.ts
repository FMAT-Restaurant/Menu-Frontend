import { expect, test } from "@playwright/test";

test("shows a global session-expired notice for a 401 response", async ({ page }) => {
  await page.route("**/api/v1/menu/entries?*", route => route.fulfill({ status: 401, json: { message: "expired" } }));
  await page.route("**/api/v1/menu/categories?*", route => route.fulfill({
    json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
  }));

  await page.goto("/");

  await expect(page.getByRole("alert")).toHaveText("Sesión caducada. Inicia sesión de nuevo.");
  await expect(page.getByText("No se pudieron cargar las entradas. Comprueba tu conexión", { exact: false })).toHaveCount(0);
});

test("shows a global 403 notice and preserves the category draft", async ({ page }) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "none" })}.${encode({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ["menu:categories:read", "menu:categories:write"],
  })}.signature`;
  await page.addInitScript(accessToken => {
    localStorage.setItem("fmat_restaurant_auth_session", JSON.stringify({ accessToken }));
  }, token);

  const category = { id: "category-1", name: "Bebidas", description: "Frías", entryCount: 0 };
  await page.route("**/api/v1/menu/categories?*", route => route.fulfill({
    json: { data: [category], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } },
  }));
  await page.route("**/api/v1/menu/categories/category-1", route => {
    if (route.request().method() === "GET") {
      return route.fulfill({ headers: { ETag: '"rev-1"' }, json: { data: category } });
    }
    return route.fulfill({ status: 403, json: { message: "forbidden" } });
  });

  await page.goto("/categories");
  await page.getByRole("button", { name: "Editar Bebidas" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar categoría" });
  const description = dialog.getByRole("textbox", { name: "Descripción" });
  await description.fill("Borrador que debe conservarse");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("alert")).toHaveText("No tienes permiso para esta acción.");
  await expect(description).toHaveValue("Borrador que debe conservarse");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});
