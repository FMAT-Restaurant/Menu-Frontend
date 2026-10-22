import { expect, test } from "@playwright/test";

test.describe("Operation recovery across page reloads (e2e/operation-recovery.spec.ts)", () => {
  test("category creation recovery: uncertain POST, real browser reload (F5) restores dialog without POST, manual retry sends same Idempotency-Key and recovers category", async ({
    page,
  }) => {
    const categories: Array<{ id: string; name: string; description?: string; entryCount?: number }> = [];
    const postRequests: Array<{ key?: string; body?: unknown }> = [];
    let shouldFailPostWithTimeout = true;

    await page.route("**/api/v1/menu/entries?*", (route) =>
      route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
      }),
    );

    await page.route("**/api/v1/menu/categories?*", (route) =>
      route.fulfill({
        json: {
          data: categories,
          meta: { page: 1, pageSize: 100, total: categories.length, totalPages: 1 },
        },
      }),
    );

    await page.route("**/api/v1/menu/categories", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const body = route.request().postDataJSON();
      postRequests.push({ key, body });

      if (shouldFailPostWithTimeout) {
        shouldFailPostWithTimeout = false;
        // Simulate network timeout or abrupt disconnection without response
        return route.abort("timedout");
      }

      // 2nd attempt with same key succeeds and returns the created category
      const created = { id: "cat-recovered-1", ...body, entryCount: 0 };
      categories.push(created);
      return route.fulfill({
        status: 201,
        headers: { ETag: '"rev-cat-1"' },
        json: { data: created },
      });
    });

    // 1. Navigate to categories page
    await page.goto("/categories");
    await expect(page.getByText("Aún no hay categorías.")).toBeVisible();

    // 2. Open new category dialog and type draft
    await page.getByRole("button", { name: "Crear categoría" }).click();
    const dialog = page.getByRole("dialog", { name: "Crear categoría" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Nombre" }).fill("Pastas Artesanales");
    await dialog.getByRole("textbox", { name: "Descripción" }).fill("Hechas a mano cada mañana");

    // 3. Submit - first attempt will time out
    await dialog.getByRole("button", { name: "Guardar categoría" }).click();

    // 4. Verification of error and manual retry button
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(postRequests).toHaveLength(1);
    const initialKey = postRequests[0].key;
    expect(initialKey).toBeTruthy();

    // 5. Real browser reload (F5 / page.reload())
    await page.reload();

    // 6. After reload, dialog restores automatically from IndexedDB with draft intact, WITHOUT any automatic POST
    const restoredDialog = page.getByRole("dialog", { name: "Crear categoría" });
    await expect(restoredDialog).toBeVisible();
    await expect(restoredDialog.getByRole("textbox", { name: "Nombre" })).toHaveValue("Pastas Artesanales");
    await expect(restoredDialog.getByRole("textbox", { name: "Descripción" })).toHaveValue("Hechas a mano cada mañana");
    expect(postRequests).toHaveLength(1); // 0 automatic POSTs upon mount/reload!

    // 7. Manual retry button is available
    const retryButton = restoredDialog.getByRole("button", { name: "Reintentar" });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();

    // 8. Click Reintentar: resends exact same Idempotency-Key and payload
    await retryButton.click();

    // 9. Succeeds, closes dialog, and displays the created category in the list
    await expect(restoredDialog).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Pastas Artesanales" })).toBeVisible();
    await expect(page.getByText("Hechas a mano cada mañana")).toBeVisible();
    await expect(page.getByText("Categoría creada.")).toBeVisible();

    // Verify exactly 2 requests with identical Idempotency-Key and identical payload
    expect(postRequests).toHaveLength(2);
    expect(postRequests[1].key).toBe(initialKey);
    expect(postRequests[1].body).toEqual({
      name: "Pastas Artesanales",
      description: "Hechas a mano cada mañana",
    });
  });

  test("nested recipe creation recovery in offer form: uncertain POST, reload restores parent and nested picker, retry recovers recipe and assigns it to option", async ({
    page,
  }) => {
    const postRecipeRequests: Array<{ key?: string; body?: unknown }> = [];
    let shouldFailRecipePost = true;

    await page.route("**/api/v1/menu/entries/entry-1", (route) =>
      route.fulfill({
        json: {
          data: {
            id: "entry-1",
            brandName: "Hamburguesa Gourmet",
            description: "Carne angus",
            status: "ACTIVE",
            categoryIds: [],
          },
        },
      }),
    );

    await page.route("**/api/v1/menu/recipes?*", (route) =>
      route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } },
      }),
    );

    await page.route("**/api/v1/inventory/items?*", (route) =>
      route.fulfill({
        json: {
          data: [{ id: "inv-papas", name: "Papas Criollas", unit: "kg" }],
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        },
      }),
    );

    await page.route("**/api/v1/menu/recipes", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const body = route.request().postDataJSON();
      postRecipeRequests.push({ key, body });

      if (shouldFailRecipePost) {
        shouldFailRecipePost = false;
        return route.abort("timedout");
      }

      const created = {
        id: "rec-papas-horno",
        name: "Papas al Horno",
        description: "Al romero y sal marina",
        instructions: "Hornear 30 minutos a 200C",
        supplies: [{ inventoryItemId: "inv-papas", quantity: 2 }],
      };
      return route.fulfill({
        status: 201,
        headers: { ETag: '"rev-rec-1"' },
        json: { data: created },
      });
    });

    // 1. Navigate to new offer page
    await page.goto("/entries/entry-1/offers/new");
    await expect(page.getByRole("heading", { name: "Nueva oferta", level: 1 })).toBeVisible();

    // 2. Fill commercial fields
    await page.getByLabel("Etiqueta de presentación (opcional)").fill("Combo Especial");
    await page.getByLabel("Precio base").fill("195");

    // 3. Create a slot
    await page.getByRole("button", { name: "Agregar grupo" }).click();
    const slotDialog = page.getByRole("dialog", { name: "Definir nuevo grupo" });
    await expect(slotDialog).toBeVisible();
    await slotDialog.getByLabel("Nombre del grupo").fill("Acompañamiento");
    await slotDialog.getByRole("button", { name: "Guardar grupo" }).click();
    await expect(slotDialog).not.toBeVisible();

    // 4. Open option modal
    await page.getByRole("button", { name: "Agregar opción a Acompañamiento" }).click();
    const optionModal = page.getByRole("dialog", { name: "Agregar opción · Acompañamiento" });
    await expect(optionModal).toBeVisible();

    // 5. Fill custom display name and open recipe picker
    await optionModal.getByLabel("Nombre mostrado (opcional)").fill("Papas Rústicas");
    await optionModal.getByRole("button", { name: /Elegir receta/ }).click();

    // 6. Inside recipe picker, open new recipe dialog
    const recipePicker = page.getByRole("dialog", { name: "Biblioteca de recetas" });
    await expect(recipePicker).toBeVisible();
    await recipePicker.getByRole("button", { name: "+ Nueva receta" }).click();

    const recipeDialog = page.getByRole("dialog", { name: "Nueva receta" });
    await expect(recipeDialog).toBeVisible();

    await recipeDialog.getByLabel("Nombre").fill("Papas al Horno");
    await recipeDialog.getByLabel("Descripción").fill("Al romero y sal marina");
    await recipeDialog.getByLabel("Instrucciones").fill("Hornear 30 minutos a 200C");
    await recipeDialog.getByLabel("Insumo 1", { exact: true }).selectOption("inv-papas");
    await recipeDialog.getByLabel("Cantidad del insumo 1").fill("2");

    // 7. Save recipe -> times out
    await recipeDialog.getByRole("button", { name: "Guardar receta" }).click();
    await expect(recipeDialog.getByRole("alert")).toBeVisible();
    await expect(recipeDialog.getByRole("button", { name: "Reintentar" })).toBeVisible();

    expect(postRecipeRequests).toHaveLength(1);
    const initialKey = postRecipeRequests[0].key;
    expect(initialKey).toBeTruthy();

    // 8. Real browser reload (F5)
    await page.reload();

    // 9. After reload, parent offer form retains commercial info, and nested recipe dialog reopens
    await expect(page.getByLabel("Etiqueta de presentación (opcional)")).toHaveValue("Combo Especial");
    await expect(page.getByLabel("Precio base")).toHaveValue("195");

    const restoredRecipeDialog = page.getByRole("dialog", { name: "Nueva receta" });
    await expect(restoredRecipeDialog).toBeVisible();
    await expect(restoredRecipeDialog.getByLabel("Nombre")).toHaveValue("Papas al Horno");
    await expect(restoredRecipeDialog.getByLabel("Descripción")).toHaveValue("Al romero y sal marina");
    await expect(restoredRecipeDialog.getByLabel("Instrucciones")).toHaveValue("Hornear 30 minutos a 200C");

    expect(postRecipeRequests).toHaveLength(1); // 0 POSTs upon reload

    // 10. Click manual retry
    const retryBtn = restoredRecipeDialog.getByRole("button", { name: "Reintentar" });
    await expect(retryBtn).toBeEnabled();
    await retryBtn.click();

    // 11. Recipe succeeds, recipe dialog closes, and option modal retains custom name and adopts created recipe
    await expect(restoredRecipeDialog).not.toBeVisible();
    const restoredOptionModal = page.getByRole("dialog", { name: "Agregar opción · Acompañamiento" });
    await expect(restoredOptionModal).toBeVisible();
    await expect(restoredOptionModal.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Papas Rústicas");
    await expect(restoredOptionModal.getByText("Receta asignada: Papas al Horno")).toBeVisible();

    // 12. Save option into slot
    await restoredOptionModal.getByRole("button", { name: "Guardar opción" }).click();
    await expect(restoredOptionModal).not.toBeVisible();

    // Option is visible in composition
    await expect(page.getByText("Papas Rústicas")).toBeVisible();

    // Verify exactly 2 requests with identical Idempotency-Key
    expect(postRecipeRequests).toHaveLength(2);
    expect(postRecipeRequests[1].key).toBe(initialKey);
  });
});
