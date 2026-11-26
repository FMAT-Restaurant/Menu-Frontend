import { expect, test } from "@playwright/test";

function permissionToken(permissions: string[]) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions })}.signature`;
}

test("catalog-read-only users see the public catalog without management actions", async ({ page }) => {
  const token = permissionToken(["menu:catalog:read"]);
  await page.addInitScript(value => {
    localStorage.setItem("fmat_restaurant_auth_session", JSON.stringify({ accessToken: value }));
  }, token);
  await page.route("**/api/v1/menu/catalog/categories", route => route.fulfill({ json: {
    data: [{ id: "category-1", name: "Bebidas", entryCount: 1 }], uncategorized: { entryCount: 0 },
  } }));
  await page.route("**/api/v1/menu/catalog?*", route => route.fulfill({ json: {
    data: [{ id: "entry-1", brandName: "Limonada", description: "Limón natural", image: null, categoryIds: ["category-1"], isAvailable: true, offers: [] }],
    meta: { page: 1, pageSize: 24, total: 1, totalPages: 1 },
  } }));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Menú", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bebidas", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Limonada", level: 3 })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar en el menú" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Editar|Administrar/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Crear|Editar|Eliminar/ })).toHaveCount(0);
});
