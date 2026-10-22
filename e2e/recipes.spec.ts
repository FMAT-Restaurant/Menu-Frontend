import { expect, test } from "@playwright/test";

test.describe("Recipe Library and Selector Flow (T13)", () => {
  test("allows searching, paginating recipes, and managing recipes in administration mode", async ({ page }) => {
    const page1Recipes = Array.from({ length: 50 }, (_, i) => ({
      id: `recipe-${i + 1}`,
      name: `Receta Base ${i + 1}`,
      description: `Descripción de receta ${i + 1}`,
      supplies: [{ inventoryItemId: "inv-1", quantity: 100, inventoryItem: { id: "inv-1", name: "Carne", unit: "g" } }],
    }));
    const page2Recipes = [
      {
        id: "recipe-51",
        name: "Receta 51 Especial",
        description: "Receta en la segunda página",
        supplies: [{ inventoryItemId: "inv-2", quantity: 1, inventoryItem: { id: "inv-2", name: "Pan", unit: "pza" } }],
      },
    ];

    await page.route("**/api/v1/menu/recipes?*", (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q");
      const pageNum = parseInt(url.searchParams.get("page") ?? "1", 10);

      if (q === "Especial") {
        return route.fulfill({
          json: {
            data: page2Recipes,
            meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
          },
        });
      }

      if (pageNum === 2) {
        return route.fulfill({
          json: {
            data: page2Recipes,
            meta: { page: 2, pageSize: 50, total: 51, totalPages: 2 },
          },
        });
      }

      return route.fulfill({
        json: {
          data: page1Recipes,
          meta: { page: 1, pageSize: 50, total: 51, totalPages: 2 },
        },
      });
    });

    await page.route("**/api/v1/inventory/items?*", (route) =>
      route.fulfill({
        json: {
          data: [
            { id: "inv-1", name: "Carne", unit: "g" },
            { id: "inv-2", name: "Pan", unit: "pza" },
          ],
          meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
        },
      }),
    );

    await page.goto("/recipes");
    await expect(page.getByRole("heading", { name: "Biblioteca de recetas", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Receta Base 1", exact: true, level: 3 })).toBeVisible();

    // Verify pagination controls reach recipe 51
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await page.getByRole("button", { name: "Siguiente página" }).click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("heading", { name: "Receta 51 Especial", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Receta Base 1", exact: true, level: 3 })).not.toBeVisible();

    // Search recipes
    const searchbox = page.getByRole("searchbox", { name: "Buscar recetas" });
    await searchbox.fill("Especial");
    await page.getByRole("button", { name: "Buscar ahora" }).click();

    await expect(page).toHaveURL(/q=Especial/);
    await expect(page.getByRole("heading", { name: "Receta 51 Especial", level: 3 })).toBeVisible();
  });

  test("creates recipe with inventory selection and paginating inventory in dialog", async ({ page }) => {
    let createdPayload: unknown = null;

    await page.route("**/api/v1/menu/recipes?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
        },
      }),
    );

    await page.route("**/api/v1/inventory/items?*", (route) => {
      const url = new URL(route.request().url());
      const pageNum = parseInt(url.searchParams.get("page") ?? "1", 10);

      if (pageNum === 2) {
        return route.fulfill({
          json: {
            data: [{ id: "inv-101", name: "Insumo 101 Secreto", unit: "kg" }],
            meta: { page: 2, pageSize: 50, total: 51, totalPages: 2 },
          },
        });
      }

      return route.fulfill({
        json: {
          data: [{ id: "inv-1", name: "Insumo 1 Estándar", unit: "g" }],
          meta: { page: 1, pageSize: 50, total: 51, totalPages: 2 },
        },
      });
    });

    await page.route("**/api/v1/menu/recipes", (route) => {
      createdPayload = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: {
          data: {
            id: "recipe-new",
            name: "Nueva Receta E2E",
            description: "Descripción E2E",
            instructions: "Instrucciones E2E",
            supplies: [{ inventoryItemId: "inv-101", quantity: 3 }],
          },
        },
      });
    });

    await page.goto("/recipes");
    await page.getByRole("button", { name: /Nueva receta|Crear receta/ }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Nombre").fill("Nueva Receta E2E");
    await dialog.getByLabel("Descripción").fill("Descripción E2E");
    await dialog.getByLabel("Instrucciones").fill("Instrucciones E2E");

    // Navigate to page 2 of inventory items
    await expect(dialog.getByText("Página 1 de 2")).toBeVisible();
    await dialog.getByRole("button", { name: "Siguiente página de inventario" }).click();
    await expect(dialog.getByText("Página 2 de 2")).toBeVisible();

    // Select Insumo 101 from page 2
    const select = dialog.getByRole("combobox", { name: "Insumo 1" });
    await select.selectOption("inv-101");
    await dialog.getByLabel("Cantidad del insumo 1").fill("3");

    await dialog.getByRole("button", { name: "Guardar receta" }).click();
    await expect(dialog).not.toBeVisible();

    expect(createdPayload).toEqual({
      name: "Nueva Receta E2E",
      description: "Descripción E2E",
      instructions: "Instrucciones E2E",
      supplies: [{ inventoryItemId: "inv-101", quantity: 3 }],
    });
  });

  test("isolates inventory error with independent retry without wiping the recipe draft", async ({ page }) => {
    let inventoryAttempts = 0;

    await page.route("**/api/v1/menu/recipes?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
        },
      }),
    );

    await page.route("**/api/v1/inventory/items?*", (route) => {
      inventoryAttempts += 1;
      if (inventoryAttempts === 1) {
        return route.fulfill({
          status: 503,
          json: { message: "Servicio de inventario temporalmente inaccesible" },
        });
      }
      return route.fulfill({
        json: {
          data: [{ id: "inv-recov", name: "Insumo Recuperado", unit: "ml" }],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        },
      });
    });

    await page.goto("/recipes");
    await page.getByRole("button", { name: /Nueva receta|Crear receta/ }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Nombre").fill("Receta Resiliente");
    await dialog.getByLabel("Descripción").fill("Descripción no se pierde");
    await dialog.getByLabel("Instrucciones").fill("Pasos no se pierden");

    // Inventory error alert is visible
    await expect(dialog.getByRole("alert")).toContainText("No se pudieron cargar los artículos de inventario");

    // Click retry inside the dialog
    await dialog.getByRole("button", { name: "Reintentar" }).click();

    // Error is dismissed and inputs are still intact
    await expect(dialog.getByLabel("Nombre")).toHaveValue("Receta Resiliente");
    await expect(dialog.getByLabel("Descripción")).toHaveValue("Descripción no se pierde");
    await expect(dialog.getByLabel("Instrucciones")).toHaveValue("Pasos no se pierden");

    // Now select the recovered item
    const select = dialog.getByRole("combobox", { name: "Insumo 1" });
    await select.selectOption("inv-recov");
    await expect(dialog.getByText("ml")).toBeVisible();
  });

  test("supports selection mode with Asignar buttons and no management actions", async ({ page }) => {
    await page.route("**/api/v1/menu/recipes?*", (route) =>
      route.fulfill({
        json: {
          data: [
            {
              id: "recipe-sel-1",
              name: "Receta para Selección",
              description: "Para asignar a opción",
              supplies: [],
            },
          ],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        },
      }),
    );

    await page.goto("/recipes?mode=selection");

    await expect(
      page.getByRole("heading", { name: "Biblioteca de recetas — elegir opción", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Asignar" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Eliminar/ })).toHaveCount(0);
  });
});
