import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  await page.exposeFunction("assertUx07Demo", () => { expect(errors).toEqual([]); expect(api).toEqual([]); });
});
test.afterEach(async ({ page }) => {
  await page.evaluate(async () => { await (window as unknown as { assertUx07Demo(): Promise<void> }).assertUx07Demo(); });
});
async function evidence(page: Page, info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2));
  await info.attach(name, { path, contentType: "application/json" });
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

test("UX07 missing demo entry has context and a catalog exit without an empty form", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/entries/audit-missing-entry/edit");
  await expect(page.getByRole("heading", { name: "Entrada no encontrada", exact: true })).toBeVisible();
  await expect(page.getByRole("alert", { name: "Entrada no encontrada" })).toContainText("La entrada solicitada ya no existe.");
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Guardar|Reintentar entrada/ })).toHaveCount(0);
  const exit = page.getByRole("link", { name: "Volver al catálogo", exact: true });
  await expect(exit).toHaveAttribute("href", "/");
  await evidence(page, info, "demo404", { environment: "in-memory demo", formCount: await page.locator("form").count(), exit: await exit.getAttribute("href") });
  await exit.click();
  await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeVisible();
});

test("UX07 entry geometry follows actual form width and retains image and assigned categories", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/entries/demo-entry-burger/edit");
  const name = page.getByLabel("Nombre comercial", { exact: true });
  await expect(name).toHaveValue("Hamburguesa clásica");
  const image = page.getByRole("img", { name: "Vista previa de la imagen de la entrada" });
  await expect(image).toBeVisible();
  const originalSource = await image.getAttribute("src");
  const module = page.locator("[data-menu-module]");
  const measures = [];
  for (const width of [320, 390, 600, 740, 767, 768, 1024, 1199, 1200, 1440]) {
    await module.evaluate((el, width) => { (el as HTMLElement).style.width = `${width}px`; }, width);
    const measure = await page.locator(".entry-form").evaluate(el => {
      const form = el.getBoundingClientRect();
      const name = el.querySelector<HTMLInputElement>("#entry-brandName")!;
      const layout = el.querySelector<HTMLElement>(".entry-form__layout")!;
      const controls = [name, el.querySelector("#entry-categoryIds")!, el.querySelector(".entry-form__actions button[type=submit]")!].map(control => {
        const style = getComputedStyle(control);
        const range = document.createRange();
        range.selectNodeContents(control.querySelector("span") ?? control);
        const textLines = Math.max(1, new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size);
        return { name: control.id || control.textContent?.trim(), height: control.getBoundingClientRect().height, width: control.getBoundingClientRect().width, textLines, lineHeight: style.lineHeight, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, borderTop: style.borderTopWidth, borderBottom: style.borderBottomWidth };
      });
      return { viewport: innerWidth, moduleWidth: el.closest("[data-menu-module]")!.getBoundingClientRect().width, formWidth: form.width, columns: getComputedStyle(layout).gridTemplateColumns.split(" ").length, controls, footerAlignItems: getComputedStyle(el.querySelector(".entry-form__actions")!).alignItems, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, radius: getComputedStyle(el).borderRadius, fieldRadius: getComputedStyle(name).borderRadius };
    });
    expect(measure.scrollWidth).toBeLessThanOrEqual(measure.clientWidth + 1);
    expect(measure.columns).toBe(measure.formWidth < 768 ? 1 : 2);
    const target = width < 1200 || measure.formWidth < 768 ? 48 : 40;
    for (const control of measure.controls) {
      if (control.textLines === 1) expect(control.height, `${control.name} at module ${width}px must have the standard one-line height`).toBe(target);
      else {
        expect(control.height).toBeGreaterThan(target);
        const contentHeight = control.textLines * Number.parseFloat(control.lineHeight) + Number.parseFloat(control.paddingTop) + Number.parseFloat(control.paddingBottom) + Number.parseFloat(control.borderTop) + Number.parseFloat(control.borderBottom);
        expect(control.height, "Wrapped labels need enough height for all their lines").toBeGreaterThanOrEqual(contentHeight);
      }
    }
    expect(measure.radius).toBe("12px");
    expect(measure.fieldRadius).toBe("8px");
    measures.push(measure);
  }
  await expect(image).toHaveAttribute("src", originalSource!);
  await expect(page.getByRole("button", { name: "Retirar categoría Platos fuertes", exact: true })).toBeVisible();
  await module.evaluate(el => { (el as HTMLElement).style.width = "600px"; });
  await evidence(page, info, "form-width", measures);
});

test("UX07 validation summary still reveals the invalid field above the existing footer", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/entries/new");
  await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
  const summary = page.getByRole("alert", { name: "Error al guardar entrada" });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Indica el nombre comercial de la entrada.");
  const name = page.getByLabel("Nombre comercial", { exact: true });
  await name.focus();
  await expect.poll(async () => {
    const bounds = await name.boundingBox();
    const footer = await page.locator(".entry-form__actions").boundingBox();
    return bounds!.y >= 0 && bounds!.y + bounds!.height <= footer!.y;
  }).toBe(true);
  await evidence(page, info, "validation", { focus: await name.evaluate(el => el === document.activeElement), field: await name.boundingBox(), footer: await page.locator(".entry-form__actions").boundingBox() });
});
