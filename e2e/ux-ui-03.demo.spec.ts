import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url());
  });
  await page.exposeFunction("assertUx03Demo", () => {
    expect(errors).toEqual([]);
    expect(api).toEqual([]);
  });
});

test.afterEach(async ({ page }) => {
  await page.evaluate(async () => {
    await (window as unknown as { assertUx03Demo(): Promise<void> }).assertUx03Demo();
  });
});

async function saveEvidence(page: Page, info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2));
  await info.attach(`${name}.json`, { path, contentType: "application/json" });
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

async function backdropMeasures(page: Page) {
  return page.locator("dialog[open]").evaluateAll(dialogs => dialogs.map(dialog => ({
    name: dialog.getAttribute("aria-label") || dialog.querySelector("h2")?.textContent,
    modal: dialog.matches(":modal"),
    backdrop: getComputedStyle(dialog, "::backdrop").backgroundColor,
    covered: dialog.hasAttribute("data-modal-covered"),
    width: dialog.getBoundingClientRect().width,
    height: dialog.getBoundingClientRect().height,
  })));
}

for (const scenario of [
  { name: "archived entry", path: "/", trigger: "Eliminar definitivamente Especial de temporada", dialog: "Eliminar entrada archivada", cancel: "Cancelar eliminación" },
  { name: "inactive offer", path: "/entries/demo-entry-burger/offers", trigger: "Eliminar oferta Combo con bebida", dialog: "Eliminar oferta inactiva", cancel: "Cancelar" },
  { name: "recipe", path: "/recipes", trigger: "Eliminar Hamburguesa de res", dialog: "¿Eliminar receta?", cancel: "Cancelar" },
]) {
  test(`${scenario.name}: one native backdrop, safe focus, scroll lock, Cancel and Escape restore the exact session`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await page.goto(scenario.path);
    const trigger = page.getByRole("button", { name: scenario.trigger, exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    const original = await page.evaluate(() => ({ scrollY, style: document.body.getAttribute("style"), rootStyle: document.documentElement.getAttribute("style"), anchorY: document.querySelector("h1")!.getBoundingClientRect().y }));
    for (const close of ["cancel", "escape"]) {
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: scenario.dialog, exact: true });
      const cancel = dialog.getByRole("button", { name: scenario.cancel, exact: true });
      await expect(cancel).toBeFocused();
      await expect(page.locator("dialog[open]")).toHaveCount(1);
      await expect(page.locator(".dialog-backdrop")).toHaveCSS("display", "contents");
      const measures = await backdropMeasures(page);
      expect(measures).toHaveLength(1);
      expect(measures[0].modal).toBe(true);
      expect(measures[0].backdrop).toBe("rgba(17, 24, 39, 0.4)");
      expect(await page.evaluate(() => document.querySelector("h1")!.getBoundingClientRect().y)).toBeCloseTo(original.anchorY, 0);
      const lockedY = await page.evaluate(() => scrollY);
      await page.keyboard.press("PageDown");
      await page.keyboard.press("PageUp");
      await page.mouse.move(2, 2);
      await page.mouse.wheel(0, 700);
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(lockedY);
      await expect(page.locator("body")).toHaveCSS("position", "fixed");
      for (let index = 0; index < 4; index += 1) {
        await page.keyboard.press("Tab");
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      await saveEvidence(page, info, `${scenario.name.replaceAll(" ", "-")}-${close}`, { original, lockedY, measures });
      if (close === "cancel") await cancel.click();
      else await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(original.scrollY);
      expect(await page.evaluate(() => document.body.getAttribute("style") || "")).toBe(original.style || "");
      expect(await page.evaluate(() => document.documentElement.getAttribute("style") || "")).toBe(original.rootStyle || "");
    }
  });
}

test("narrow forms in a wide module use 48px controls and scroll internally while the document stays fixed", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto("/categories");
  const categoryTrigger = page.getByRole("button", { name: "Nueva categoría" });
  await categoryTrigger.click();
  const category = page.getByRole("dialog", { name: "Crear categoría" });
  expect((await category.boundingBox())!.width).toBeLessThan(768);
  expect((await category.getByLabel("Nombre", { exact: true }).boundingBox())!.height).toBe(48);
  expect((await category.getByRole("button", { name: "Cerrar formulario" }).boundingBox())!.width).toBe(48);
  await page.keyboard.press("Escape");
  await expect(categoryTrigger).toBeFocused();
  await page.goto("/recipes");
  // The recipe dialog can now use a wider table layout. Give this narrow-form
  // scenario an explicit module width while retaining the wide document host.
  await page.locator("[data-menu-module]").evaluate(el => {
    (el as HTMLElement).style.width = "740px";
  });
  await page.getByRole("button", { name: /Nueva receta/ }).click();
  const recipe = page.getByRole("dialog", { name: "Nueva receta", exact: true });
  expect((await recipe.boundingBox())!.width).toBeLessThan(768);
  expect((await recipe.getByLabel("Nombre", { exact: true }).boundingBox())!.height).toBe(48);
  const fields = recipe.locator(".recipe-form-dialog__fields");
  const start = await fields.evaluate(el => ({ scroll: el.scrollTop, overflow: el.scrollHeight > el.clientHeight }));
  expect(start.overflow).toBe(true);
  await fields.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => fields.evaluate(el => el.scrollTop)).toBeGreaterThan(start.scroll);
  const top = await page.evaluate(() => scrollY);
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(top);
  await saveEvidence(page, info, "form-container-and-scroll", { moduleWidth: 1440, categoryControl: 48, recipeControl: 48, recipe: await backdropMeasures(page), internalScroll: await fields.evaluate(el => el.scrollTop) });
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("nested existing recipe flow shares its lock and only its top native backdrop is colored", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/entries/demo-entry-burger/offers/new");
  await page.getByRole("button", { name: "Agregar grupo" }).click();
  await page.getByLabel("Nombre del grupo").fill("Grupo modal");
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await page.getByRole("button", { name: "Agregar opción a Grupo modal" }).click();
  await page.getByLabel("Nombre mostrado (opcional)").fill("Borrador conservado");
  await page.getByRole("button", { name: "Elegir receta" }).click();
  await page.getByRole("button", { name: /Nueva receta/ }).click();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  const measures = await backdropMeasures(page);
  expect(measures.filter(measure => measure.backdrop === "rgba(17, 24, 39, 0.4)")).toHaveLength(1);
  expect(measures.filter(measure => measure.covered)).toHaveLength(0);
  await saveEvidence(page, info, "nested-backdrop-ownership", measures);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Borrador conservado");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
});

test.describe("touch emulation", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 700 } });
  test("a touch gesture on the backdrop leaves the long catalog in place", async ({ page }, info) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Eliminar definitivamente Especial de temporada" });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const lockedY = await page.evaluate(() => scrollY);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 2, y: 600 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 2, y: 250 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(lockedY);
    await saveEvidence(page, info, "emulated-touch-backdrop", { lockedY, after: await page.evaluate(() => scrollY), physicalDevice: false });
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  });
});
