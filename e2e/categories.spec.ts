import { expect, test } from "@playwright/test";

test("opens V5 from the menu and creates, edits and cancels categories", async ({ page }) => {
  const categories = [{ id: "category-1", name: "Bebidas", description: "Frías", entryCount: 2 }];
  const mutations: string[] = [];

  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({
    json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
  }));
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({
    headers: { ETag: 'W/"categories-4"' },
    json: { data: categories, meta: { page: 1, pageSize: 100, total: categories.length, totalPages: 1 } },
  }));
  await page.route("**/api/v1/menu/categories", (route) => {
    mutations.push("POST");
    const draft = route.request().postDataJSON();
    const created = { id: "category-2", ...draft, entryCount: 0 };
    categories.push(created);
    return route.fulfill({ status: 201, json: { data: created } });
  });
  await page.route("**/api/v1/menu/categories/category-1", (route) => {
    mutations.push("PATCH");
    expect(route.request().headers()["if-match"]).toBe('W/"categories-4"');
    Object.assign(categories[0], route.request().postDataJSON());
    return route.fulfill({ json: { data: categories[0] } });
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Categorías" }).click();
  await expect(page).toHaveURL(/\/categories$/);
  await expect(page.getByRole("heading", { name: "Bebidas" })).toBeVisible();
  await expect(page.getByText("2 entradas asociadas")).toBeVisible();
  await expect(page.getByRole("button", { name: /Eliminar/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Editar Bebidas" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar categoría" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Descripción" }).fill("Borrador descartado");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).not.toBeVisible();
  expect(mutations).toEqual([]);

  await page.getByRole("button", { name: "Editar Bebidas" }).click();
  await expect(dialog.getByRole("textbox", { name: "Descripción" })).toHaveValue("Frías");
  await dialog.getByRole("textbox", { name: "Descripción" }).fill("Frías y preparadas");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Frías y preparadas")).toBeVisible();

  await page.getByRole("button", { name: "Nueva categoría" }).click();
  const createDialog = page.getByRole("dialog", { name: "Crear categoría" });
  await createDialog.getByRole("textbox", { name: "Nombre" }).fill("Postres");
  await createDialog.getByRole("textbox", { name: "Descripción" }).fill("Opciones dulces");
  await createDialog.getByRole("button", { name: "Guardar categoría" }).click();
  await expect(page.getByRole("heading", { name: "Postres" })).toBeVisible();
  expect(mutations).toEqual(["PATCH", "POST"]);
});
