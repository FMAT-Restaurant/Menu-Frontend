import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  await page.exposeFunction("assertUx08Demo", () => { expect(errors).toEqual([]); expect(api).toEqual([]); });
});
test.afterEach(async ({ page }) => {
  await page.evaluate(async () => { await (window as unknown as { assertUx08Demo(): Promise<void> }).assertUx08Demo(); });
});
async function evidence(page: Page, info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2));
  await info.attach(name, { path, contentType: "application/json" });
  const png = info.outputPath(`${name}.png`);
  await page.screenshot({ path: png, fullPage: true });
  await info.attach(`${name}-screen`, { path: png, contentType: "image/png" });
}

for (const mode of ["management", "selection"] as const) {
  test(`UX08 ${mode} keeps unmatched query and restores its three recipes`, async ({ page }, info) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto(mode === "selection" ? "/recipes?mode=selection" : "/recipes");
    await expect(page.locator(".recipe-card")).toHaveCount(3);
    const search = page.getByRole("searchbox", { name: "Buscar recetas", exact: true });
    await search.fill("receta sin coincidencias");
    await search.press("Enter");
    await expect(page.getByRole("heading", { name: "No hay recetas que coincidan con tu búsqueda." })).toBeVisible();
    await expect(search).toHaveValue("receta sin coincidencias");
    await expect(page.getByText("Aún no hay recetas registradas.")).toHaveCount(0);
    await evidence(page, info, "no-match", { mode, query: await search.inputValue(), cards: await page.locator(".recipe-card").count() });
    await page.getByRole("button", { name: "Limpiar búsqueda", exact: true }).click();
    await expect(page.locator(".recipe-card")).toHaveCount(3);
    await expect(search).toBeFocused();
    await expect(search).toHaveValue("");
    if (mode === "selection") {
      await expect(page.getByRole("button", { name: "Asignar", exact: true })).toHaveCount(3);
      await expect(page.getByRole("button", { name: "Editar Hamburguesa de res", exact: true })).toHaveCount(0);
    }
  });
}

test("UX08 validates locally with summary links and adapts supplies to actual module width", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/recipes");
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  await page.getByRole("button", { name: "Guardar receta", exact: true }).click();
  const summary = page.getByRole("alert", { name: "Revisa los campos de la receta" });
  await expect(summary).toBeFocused();
  for (const label of ["Nombre", "Descripción", "Instrucciones", "Insumo 1"]) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const description = await field.getAttribute("aria-describedby");
    await expect(page.locator(`[id="${description}"]`)).toBeVisible();
  }
  await summary.getByRole("link", { name: "Indica las instrucciones de la receta." }).click();
  await expect(page.getByLabel("Instrucciones", { exact: true })).toBeFocused();
  await page.getByLabel("Nombre", { exact: true }).fill("Receta con nombre largo para comprobar el espacio disponible");
  await page.getByLabel("Descripción", { exact: true }).fill("Una descripción de preparación con texto largo que se conserva durante la corrección.");
  await page.getByLabel("Instrucciones", { exact: true }).fill("Preparar los ingredientes y mezclar. Repetir el proceso con cuidado hasta que la preparación esté lista.");
  await page.getByLabel("Insumo 1", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Cantidad del insumo 1", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Guardar receta", exact: true }).click();
  await expect(page.getByLabel("Cantidad del insumo 1", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("dialog")).toBeVisible();
  await summary.getByRole("link", { name: "Insumo 1: La cantidad de cada insumo debe ser mayor a 0." }).click();
  await expect(page.getByLabel("Cantidad del insumo 1", { exact: true })).toBeFocused();
  await page.getByLabel("Cantidad del insumo 1", { exact: true }).fill("125.5");
  await page.getByRole("button", { name: "+ Agregar insumo", exact: true }).click();
  await page.getByLabel("Insumo 2", { exact: true }).selectOption({ index: 2 });
  await page.getByRole("button", { name: "+ Agregar insumo", exact: true }).click();
  await page.getByLabel("Insumo 3", { exact: true }).selectOption({ index: 3 });
  const measures = [];
  for (const width of [320, 390, 600, 740, 767, 768, 1024, 1199, 1200, 1440]) {
    await page.locator("[data-menu-module]").evaluate((el, width) => { (el as HTMLElement).style.width = `${width}px`; }, width);
    const measure = await page.getByRole("dialog").evaluate(el => {
      const fields = el.querySelector<HTMLElement>(".recipe-form-dialog__fields")!;
      const row = el.querySelector(".recipe-supplies-table tbody tr")!;
      const controls = [...el.querySelectorAll<HTMLElement>("#recipe-name, .recipe-supplies-table select, .recipe-supplies-table input, .recipe-form-dialog__close, .recipe-form-dialog__actions button")];
      return { viewport: innerWidth, dialogWidth: el.getBoundingClientRect().width, scrollWidth: fields.scrollWidth, clientWidth: fields.clientWidth, rowDisplay: getComputedStyle(row).display, controls: controls.map(control => ({ name: control.id || control.getAttribute("aria-label") || control.textContent?.trim(), width: control.getBoundingClientRect().width, height: control.getBoundingClientRect().height, radius: getComputedStyle(control).borderRadius })), radius: getComputedStyle(el).borderRadius };
    });
    expect(measure.scrollWidth).toBeLessThanOrEqual(measure.clientWidth + 1);
    expect(measure.rowDisplay).toBe(measure.dialogWidth < 768 ? "grid" : "table-row");
    for (const control of measure.controls) {
      expect(control.height, `${control.name} at module ${width}px`).toBe(measure.dialogWidth < 1200 || width < 1200 ? 48 : 40);
      expect(control.radius).toBe("8px");
    }
    expect(measure.radius).toBe("12px");
    measures.push({ moduleWidth: width, ...measure });
  }
  await page.locator("[data-menu-module]").evaluate(el => { (el as HTMLElement).style.width = "600px"; });
  await evidence(page, info, "supplies", measures);
  await page.getByRole("button", { name: "Guardar receta", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Receta con nombre largo para comprobar el espacio disponible", exact: true })).toBeVisible();
});
