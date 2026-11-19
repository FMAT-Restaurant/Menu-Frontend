import { expect, test } from "@playwright/test";

for (const closeMethod of ["cancel", "escape"]) {
  test(`issue 81 clears a referenced-recipe rejection on ${closeMethod}`, async ({ page }) => {
    const recipe = { id: "recipe-1", name: "Receta de pastel", description: "Base de chocolate", supplies: [] };
    let deletes = 0;
    await page.route("**/api/v1/menu/recipes?*", route => {
      const data = new URL(route.request().url()).searchParams.get("q") ? [] : [recipe];
      return route.fulfill({ json: { data, meta: { page: 1, pageSize: 50, total: data.length, totalPages: 1 } } });
    });
    await page.route("**/api/v1/menu/recipes/recipe-1", route => {
      deletes++;
      return route.fulfill({ status: 409, json: { error: { code: "RECIPE_IN_USE", message: "The recipe is referenced by current offers.", details: { offerIds: ["offer-1"] } } } });
    });
    await page.goto("/recipes");
    const trigger = page.getByRole("button", { name: "Eliminar Receta de pastel" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "¿Eliminar receta?" });
    await dialog.getByRole("button", { name: "Eliminar receta" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("No se puede eliminar la receta porque está referenciada por una oferta vigente.");
    await expect(dialog.getByRole("button", { name: "Eliminar receta" })).toBeDisabled();
    await expect(dialog).toContainText("Quita las referencias");
    if (closeMethod === "escape") await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.getByLabel("Buscar recetas").fill("zzz");
    await page.getByRole("button", { name: "Buscar ahora" }).click();
    await expect(page.getByRole("heading", { name: "No hay recetas que coincidan con tu búsqueda." })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: "Limpiar búsqueda" }).first().click();
    await expect(trigger).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await trigger.click();
    await expect(dialog.getByRole("button", { name: "Eliminar receta" })).toBeEnabled();
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    expect(deletes).toBe(1);
  });
}
