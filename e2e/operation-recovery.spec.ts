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
});
