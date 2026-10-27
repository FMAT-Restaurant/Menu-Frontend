import { expect, test, type Page } from "@playwright/test";

function observeDemo(page: Page) {
  const apiRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  page.on("pageerror", error => errors.push(error.message));
  return () => {
    expect(apiRequests, "The demo must not call backend services").toEqual([]);
    expect(errors, "The demo must not raise browser errors").toEqual([]);
  };
}

async function sampleImage(page: Page) {
  return Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 60;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#C2410C";
    context.fillRect(0, 0, 80, 60);
    return canvas.toDataURL("image/png").split(",")[1];
  }), "base64");
}

test("categories and recipes can be created and edited through their real dialogs without a backend", async ({ page }) => {
  const assertDemo = observeDemo(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/^\[DEMO\]/);
  await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Categorías", exact: true }).click();
  await page.getByRole("button", { name: "Nueva categoría" }).click();
  const categoryDialog = page.getByRole("dialog", { name: "Crear categoría" });
  await categoryDialog.getByLabel("Nombre", { exact: true }).fill("Desayunos demo");
  await categoryDialog.getByLabel("Descripción").fill("Opciones matutinas");
  await categoryDialog.getByRole("button", { name: "Guardar categoría" }).click();
  await expect(categoryDialog).toBeHidden();
  await page.getByRole("button", { name: "Editar Desayunos demo" }).click();
  const editCategory = page.getByRole("dialog", { name: "Editar categoría" });
  await editCategory.getByLabel("Nombre", { exact: true }).fill("Desayunos editados");
  await editCategory.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: "Desayunos editados" })).toBeVisible();
  await page.getByRole("link", { name: /Volver al menú/ }).click();
  await page.getByRole("link", { name: "Biblioteca de recetas" }).click();
  await expect(page.getByRole("article", { name: "Hamburguesa de res" })).toContainText("Carne de res");
  await page.getByRole("button", { name: /Nueva receta/ }).click();
  const recipeDialog = page.getByRole("dialog", { name: "Nueva receta" });
  await recipeDialog.getByLabel("Nombre", { exact: true }).fill("Bebida demo");
  await recipeDialog.getByLabel("Descripción").fill("Bebida preparada en el demo");
  await recipeDialog.getByLabel("Instrucciones").fill("Servir el agua fría.");
  await recipeDialog.getByRole("combobox", { name: "Insumo 1" }).selectOption("demo-inventory-water");
  await recipeDialog.getByLabel("Cantidad del insumo 1").fill("250");
  await recipeDialog.getByRole("button", { name: "Guardar receta" }).click();
  await expect(recipeDialog).toBeHidden();
  await page.getByRole("button", { name: "Editar Bebida demo" }).click();
  const editRecipe = page.getByRole("dialog", { name: "Editar receta" });
  await expect(editRecipe.getByLabel("Cantidad del insumo 1")).toHaveValue("250");
  await editRecipe.getByLabel("Nombre", { exact: true }).fill("Bebida editada");
  await editRecipe.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("article", { name: "Bebida editada" })).toContainText("Agua mineral (250 ml)");
  assertDemo();
});

test("entry uploads, editing, offer composition and state changes work without API calls", async ({ page }, testInfo) => {
  const assertDemo = observeDemo(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Nueva entrada" }).click();
  await page.getByLabel("Nombre comercial").fill("Entrada demo nueva");
  await page.getByLabel("Descripción", { exact: true }).fill("Entrada creada sin backend");
  await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  await page.getByRole("checkbox", { name: "Platos fuertes", exact: true }).check();
  await page.getByRole("searchbox", { name: "Buscar categorías" }).press("Escape");
  const buffer = await sampleImage(page);
  await page.getByLabel("Archivo de imagen").setInputFiles({ name: "demo.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entrada demo nueva", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Editar Entrada demo nueva", exact: true }).click();
  await page.getByLabel("Nombre comercial").fill("Entrada demo editada");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await page.getByRole("link", { name: "Ver ofertas de Entrada demo editada" }).click();
  await page.getByRole("link", { name: "Crear primera oferta" }).click();
  await page.getByLabel("Etiqueta de presentación").fill("Presentación demo");
  await page.getByLabel("Precio base").fill("125");
  await page.locator('input[type="file"]').setInputFiles({ name: "offer.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Agregar grupo" }).click();
  await page.getByLabel("Nombre del grupo").fill("Principal");
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await page.getByRole("button", { name: "Agregar opción a Principal" }).click();
  await page.getByRole("button", { name: "Elegir receta" }).click();
  await page.getByRole("article", { name: "Hamburguesa de res" }).getByRole("button", { name: "Asignar" }).click();
  await page.getByRole("button", { name: "Guardar opción" }).click();
  await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Presentación demo", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Abrir oferta Presentación demo para editar" }).click();
  await expect(page.getByRole("heading", { name: "Principal", exact: true })).toBeVisible();
  await page.getByLabel("Precio base").fill("135");
  await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  await expect(page.getByText("MXN\u00a0135.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cambiar estado de oferta Presentación demo: Inactiva" }).click();
  await expect(page.getByRole("button", { name: "Cambiar estado de oferta Presentación demo: Activa" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("demo-offers.png"), fullPage: true });
  assertDemo();

  await page.reload();
  await expect(page.getByRole("alert")).toContainText("La entrada solicitada ya no existe.");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entrada demo editada", exact: true })).toHaveCount(0);
  assertDemo();
});
