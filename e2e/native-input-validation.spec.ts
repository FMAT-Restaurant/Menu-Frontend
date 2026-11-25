import { expect, test, type Locator, type Page } from "@playwright/test";
import { addSupply } from "./recipeSupplies";

async function setup(page: Page) {
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/v1/**", route => {
    const request = route.request();
    if (request.method() !== "GET") writes.push(request.method());
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/items") return route.fulfill({ json: {
      items: [{ id: "item-1", name: "Harina", unit: "g" }], total: 1, page: 1, limit: 20, totalPages: 1,
    } });
    if (path === "/api/v1/menu/recipes") return route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } } });
    if (path === "/api/v1/menu/entries/entry-1") return route.fulfill({ json: { data: {
      id: "entry-1", brandName: "Pastel", description: "Pastel de chocolate", status: "ACTIVE", categoryIds: [], categories: [], image: null,
    } } });
    return route.fulfill({ status: 404, json: { error: { message: "Recurso no encontrado" } } });
  });
  return { writes, errors };
}

async function expectValidity(input: Locator, valid: boolean) {
  await expect(input).toHaveAttribute("aria-invalid", String(!valid));
  await expect.poll(() => input.evaluate(element => (element as HTMLInputElement).validity.valid)).toBe(valid);
}

for (const width of [1280, 390]) {
  test(`issue 84 validates price while typing and preserves precision at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 720 });
    const observed = await setup(page);
    await page.goto("/entries/entry-1/offers/new");
    const price = page.getByLabel("Precio base (MXN)", { exact: true });
    for (const value of ["-12.999", "0", ""]) {
      await price.fill(value);
      await expectValidity(price, false);
      await expect(price).toHaveAccessibleDescription(/Escribe un precio base mayor que 0\./);
      await expect(page.locator("#offer-price-preview")).toHaveCount(0);
    }
    await price.pressSequentially("e");
    await expectValidity(price, false);
    await price.fill("12.999");
    await expectValidity(price, true);
    await expect(price).toHaveValue("12.999");
    await expect(page.locator("#offer-price-exact")).toContainText("Precio que se guardará: MXN 12.999");
    await page.screenshot({ path: info.outputPath("price-precision.png") });
    expect(observed).toEqual({ writes: [], errors: [] });
  });
}

test("issue 84 validates group rounds and inventory option quantities without saving", async ({ page }) => {
  const observed = await setup(page);
  await page.goto("/entries/entry-1/offers/new");
  await page.getByRole("button", { name: "Agregar grupo" }).click();
  const group = page.getByRole("dialog", { name: "Definir nuevo grupo" });
  await group.getByLabel("Nombre del grupo").fill("Principal");
  const rounds = group.getByLabel("Rondas de selección");
  await expect(rounds).toHaveAttribute("type", "number");
  for (const value of ["1.5", "0", "-1"]) {
    await rounds.fill(value);
    await expectValidity(rounds, false);
    await expect(rounds).toHaveAccessibleDescription(/Escribe un número entero de rondas/);
  }
  await rounds.fill("2");
  await expectValidity(rounds, true);
  await group.getByRole("button", { name: "Guardar grupo" }).click();
  await page.getByRole("button", { name: "Agregar opción a Principal", exact: true }).click();
  await page.getByRole("button", { name: /Elegir artículo de inventario/ }).click();
  await page.getByRole("row", { name: /Harina/ }).getByRole("button", { name: "Asignar" }).click();
  const quantity = page.getByLabel("Cantidad del artículo");
  await quantity.fill("0");
  await expectValidity(quantity, false);
  await expect(quantity).toHaveAccessibleDescription("Escribe una cantidad del artículo mayor que 0.");
  await quantity.fill("0.125");
  await expectValidity(quantity, true);
  expect(observed).toEqual({ writes: [], errors: [] });
});

test("issue 84 validates ingredient quantities during recipe editing", async ({ page }) => {
  const observed = await setup(page);
  await page.goto("/recipes");
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await addSupply(dialog, "Harina");
  const quantity = dialog.getByLabel("Cantidad de Harina", { exact: true });
  await quantity.fill("-1");
  await expectValidity(quantity, false);
  await expect(quantity).toHaveAccessibleDescription("Escribe una cantidad del insumo mayor que 0.");
  await quantity.fill("0.125");
  await expectValidity(quantity, true);
  expect(observed).toEqual({ writes: [], errors: [] });
});
