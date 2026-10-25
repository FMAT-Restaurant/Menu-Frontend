import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  const errors: string[] = []; const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  await page.exposeFunction("assertUx11Demo", () => { expect(errors).toEqual([]); expect(api).toEqual([]); });
});
test.afterEach(async ({ page }) => {
  await page.evaluate(async () => (window as unknown as { assertUx11Demo(): Promise<void> }).assertUx11Demo());
});
async function evidence(page: Page, info: TestInfo, name: string, extra: Record<string, unknown> = {}) {
  const data = await page.evaluate(() => ({ url: location.href, modals: document.querySelectorAll("dialog[open]:modal").length,
    focus: document.activeElement?.id || document.activeElement?.textContent, bodyPosition: getComputedStyle(document.body).position,
    dialogs: [...document.querySelectorAll("dialog[open]")].map(el => ({ width: el.getBoundingClientRect().width, backdrop: getComputedStyle(el, "::backdrop").backgroundColor })) }));
  const json = info.outputPath(`${name}.json`); await writeFile(json, JSON.stringify({ ...data, ...extra }, null, 2));
  await info.attach(name, { path: json, contentType: "application/json" });
  const png = info.outputPath(`${name}.png`); await page.screenshot({ path: png, fullPage: true });
  await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
}

for (const family of ["category", "recipe"] as const) {
  test(`UX11 ${family} keeps edits in its original modal and closes directly after reversal`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(family === "category" ? "/categories" : "/recipes");
    const trigger = page.getByRole("button", { name: family === "category" ? "Nueva categoría" : "+ Nueva receta", exact: true });
    await trigger.click(); await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
    await trigger.click();
    const node = await page.locator("dialog[open]:modal").elementHandle();
    const name = page.getByLabel("Nombre", { exact: true });
    await name.fill("Borrador conservado UX11");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Seguir editando", exact: true })).toBeFocused();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
    expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
    await evidence(page, info, `${family}-confirm`);
    await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
    await expect(name).toHaveValue("Borrador conservado UX11"); await expect(name).toBeFocused();
    await name.fill(""); await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click(); await name.fill("Descartar explícitamente");
    await page.getByRole("button", { name: "Cerrar formulario", exact: true }).click();
    await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test("UX11 browser back keeps entry image/categories and discards once to the exact filtered catalog", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?q=Hamburguesa&page=1");
  await page.getByRole("link", { name: "Editar Hamburguesa clásica", exact: true }).click();
  const name = page.getByLabel("Nombre comercial", { exact: true });
  await expect(name).toHaveValue("Hamburguesa clásica");
  const editorUrl = page.url();
  await name.fill("Hamburguesa con borrador UX11");
  await page.locator("#entry-categoryIds").click();
  await page.getByRole("checkbox", { name: "Bebidas", exact: true }).check();
  await page.locator("#entry-categoryIds").click();
  const buffer = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 48;
    return canvas.toDataURL("image/png").split(",")[1];
  }), "base64");
  await page.getByLabel("Archivo de imagen", { exact: true }).setInputFiles({ name: "borrador.png", mimeType: "image/png", buffer });
  await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
  const image = page.getByRole("img", { name: "Vista previa de la imagen de la entrada", exact: true });
  await expect(page.locator("#entry-image-help")).toHaveText("borrador.png");
  const preview = await image.getAttribute("src");
  expect(preview).toMatch(/^blob:/);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Seguir editando", exact: true })).toBeVisible();
  await expect(page).toHaveURL(editorUrl);
  await evidence(page, info, "entry-back");
  await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
  await expect(name).toHaveValue("Hamburguesa con borrador UX11");
  await expect(page.locator("#entry-image-help")).toHaveText("borrador.png");
  await expect(image).toHaveAttribute("src", preview!);
  await page.locator("#entry-categoryIds").click();
  await expect(page.getByRole("checkbox", { name: "Bebidas", exact: true })).toBeChecked();
  await page.locator("#entry-categoryIds").click();
  await page.goBack();
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await expect(page).toHaveURL(/\/\?q=Hamburguesa&page=1$/);
  await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeVisible();
  await page.goForward();
  await expect(name).toHaveValue("Hamburguesa clásica");
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
});

test("UX11 route exit protects a retained recipe even when the offer and option remain unchanged", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/entries/demo-entry-burger/offers");
  const listUrl = page.url();
  await page.getByRole("link", { name: "Abrir oferta Combo con bebida para editar", exact: true }).click();
  await page.getByRole("button", { name: "Editar opción Hamburguesa clásica", exact: true }).click();
  await page.getByRole("button", { name: /^Elegir receta/ }).click();
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Receta retenida UX11");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Elegir receta/ })).toBeFocused();
  const node = await page.locator("dialog[open]:modal").elementHandle();
  await page.goBack();
  await expect(page.getByRole("button", { name: "Seguir editando", exact: true })).toBeFocused();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  await evidence(page, info, "retained-recipe");
  await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
  await page.getByRole("button", { name: /^Elegir receta/ }).click();
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Receta retenida UX11");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goBack();
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
});

test("UX11 reload uses the native warning only while a category has unsaved changes", async ({ page }, info) => {
  await page.goto("/categories");
  await page.getByRole("button", { name: "Nueva categoría", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("No perder por recarga");
  let warnings = 0;
  const warningTypes: string[] = [];
  page.on("dialog", async dialog => { expect(dialog.type()).toBe("beforeunload"); warnings += 1; warningTypes.push(dialog.type()); await dialog.dismiss(); });
  const warning = page.waitForEvent("dialog");
  await page.evaluate(() => window.location.reload());
  await warning;
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("No perder por recarga");
  expect(warnings).toBe(1);
  await evidence(page, info, "native-unload", { warnings, warningTypes });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Catálogo de categorías", exact: true })).toBeVisible();
  expect(warnings).toBe(1);
});
