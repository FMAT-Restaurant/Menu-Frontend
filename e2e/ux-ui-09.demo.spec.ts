import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

for (const width of [320, 390, 1280]) {
  test(`offer deletion appears only while inactive and stays visibly destructive at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/entries/demo-entry-burger/offers");
    const active = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Individual", exact: true }) });
    const inactive = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Combo con bebida", exact: true }) });
    await expect(active.getByRole("button", { name: /Eliminar oferta/ })).toHaveCount(0);
    await expect(active.getByText("La eliminación es definitiva.", { exact: true })).toHaveCount(0);
    const remove = inactive.getByRole("button", { name: "Eliminar oferta Combo con bebida", exact: true });
    await expect(remove).toBeVisible();
    await expect(remove).toHaveAccessibleDescription("La eliminación es definitiva.");
    expect(await remove.evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor })))
      .toEqual({ color: "rgb(185, 28, 28)", background: "rgb(254, 242, 242)" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    for (const card of [active, inactive]) {
      const box = await card.boundingBox();
      for (const button of await card.getByRole("button").all()) {
        const control = await button.boundingBox();
        expect(control!.x).toBeGreaterThanOrEqual(box!.x);
        expect(control!.x + control!.width).toBeLessThanOrEqual(box!.x + box!.width);
        expect(control!.height).toBeGreaterThanOrEqual(width < 1200 ? 48 : 40);
      }
    }
    await active.screenshot({ path: info.outputPath(`active-${width}.png`) });
    await inactive.screenshot({ path: info.outputPath(`inactive-${width}.png`) });
    await remove.click();
    const dialog = page.getByRole("dialog", { name: "Eliminar oferta inactiva" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    const status = active.getByRole("button", { name: /Cambiar estado de oferta/ });
    await status.click();
    await expect(status).toHaveAttribute("aria-pressed", "false");
    await expect(active.getByRole("button", { name: "Eliminar oferta Individual", exact: true })).toBeVisible();
    await status.click();
    await expect(status).toHaveAttribute("aria-pressed", "true");
    await expect(active.getByRole("button", { name: /Eliminar oferta/ })).toHaveCount(0);
  });
}

function observe(page: Page) {
  const errors: string[] = [];
  const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  return () => { expect(errors).toEqual([]); expect(api).toEqual([]); };
}
async function evidence(page: Page, info: TestInfo, name: string, data: unknown) {
  const json = info.outputPath(`${name}.json`);
  const png = info.outputPath(`${name}.png`);
  await writeFile(json, JSON.stringify(data, null, 2));
  await info.attach(name, { path: json, contentType: "application/json" });
  await page.screenshot({ path: png, fullPage: true });
  await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
}
async function addRecipeOption(page: Page) {
  await page.getByRole("button", { name: "Agregar opción a Plato principal", exact: true }).click();
  await expect(page.getByRole("button", { name: /Elegir artículo de inventario/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Elegir receta/ }).click();
  await page.getByRole("article", { name: "Limonada de la casa", exact: true }).getByRole("button", { name: "Asignar", exact: true }).click();
  await page.getByLabel("Nombre mostrado (opcional)").fill("Alternativa de limonada con nombre largo para comprobar opciones completas");
  await page.getByRole("button", { name: "Guardar opción", exact: true }).click();
}
async function measure(page: Page) {
  return page.locator(".offer-form").evaluate(form => {
    const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const slots = [...form.querySelectorAll(".slot-card")];
    const grid = form.querySelector(".composition-editor__slots-container")!;
    const controls = [...form.querySelectorAll<HTMLElement>("button, input:not([type=file]):not([type=radio]), select")].filter(el => el.getBoundingClientRect().height > 0).map(el => {
      const style = getComputedStyle(el);
      return { name: el.getAttribute("aria-label") || el.textContent?.trim() || el.id, ...rect(el), lineHeight: style.lineHeight, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    });
    const metadata = [...form.querySelectorAll(".slot-card__badge,.slot-option-item__source-badge,.slot-option-item__source-ref,.slot-option-item__quantity,.offer-state")].map(el => ({ text: el.textContent, font: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight }));
    return { viewport: innerWidth, module: rect(form.closest("[data-menu-module]")!), form: rect(form), clientWidth: form.clientWidth, scrollWidth: form.scrollWidth, grid: rect(grid), columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length, slots: slots.map(rect), add: rect(form.querySelector(".add-slot-card")!), controls, metadata, stripes: slots.flatMap(slot => [slot, ...slot.querySelectorAll(".slot-option-item")]).map(el => { const s = getComputedStyle(el); return { left: s.borderLeftWidth, right: s.borderRightWidth, top: s.borderTopWidth, bottom: s.borderBottomWidth }; }) };
  });
}

test("UX09 composition follows viewport, module and own form width without horizontal traversal", async ({ page }, info) => {
  const check = observe(page);
  await page.goto("/entries/demo-entry-burger/offers/demo-offer-combo/edit");
  await expect(page.getByRole("article", { name: "Grupo Bebida", exact: true })).toBeVisible();
  await addRecipeOption(page);
  await page.getByRole("button", { name: "Cambiar estado de Alternativa de limonada con nombre largo para comprobar opciones completas", exact: true }).click();
  await expect(page.locator(".slot-option-item .offer-state--inactive")).toHaveText("Inactiva");
  await expect(page.getByRole("button", { name: /Copiar composición/ })).toHaveCount(0);
  const all = [];
  for (const host of ["viewport", "module", "form"] as const) {
    for (const width of [320, 390, 600, 740, 1024, 1440]) {
      await page.setViewportSize({ width: host === "viewport" ? width : 1440, height: 1000 });
      await page.locator("[data-menu-module]").evaluate((el, value) => { (el as HTMLElement).style.width = value; }, host === "module" ? `${width}px` : "");
      await page.locator(".offer-form").evaluate((el, value) => { (el as HTMLElement).style.width = value; }, host === "form" ? `${width}px` : "");
      const data = await measure(page);
      all.push({ host, requested: width, ...data });
      if (host === "viewport") await evidence(page, info, `w${width}`, data);
      expect(data.scrollWidth).toBeLessThanOrEqual(data.clientWidth + 1);
      expect(data.columns).toBe(data.form.width < 768 ? 1 : 2);
      if (data.form.width < 768) {
        expect(data.slots[1].y).toBeGreaterThanOrEqual(data.slots[0].bottom);
        expect(data.add.y).toBeGreaterThanOrEqual(data.slots[1].bottom);
      }
      for (const control of data.controls) {
        expect(control.height, `${control.name}: ${host} ${width}`).toBeGreaterThanOrEqual(data.form.width < 768 || data.module.width < 1200 ? 48 : 40);
        expect(control.scrollHeight, `${control.name}: ${host} ${width}, visible height ${control.clientHeight}, scroll height ${control.scrollHeight}`).toBeLessThanOrEqual(control.clientHeight + 1);
        expect(control.right, `${control.name}: ${host} ${width}, right boundary`).toBeLessThanOrEqual(data.form.right + 1);
      }
      for (const meta of data.metadata) { expect(Number.parseFloat(meta.font)).toBeGreaterThanOrEqual(12); expect(Number.parseFloat(meta.line)).toBeGreaterThanOrEqual(16); }
      for (const border of data.stripes) { expect(border.left).toBe(border.right); expect(border.top).toBe(border.bottom); }
    }
  }
  await page.getByRole("button", { name: "Agregar grupo", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Agregar grupo", exact: true })).toBeInViewport();
  await evidence(page, info, "widths", all);
  check();
});

test("UX09 existing inventory option remains editable and image replacement works by keyboard and touch", async ({ browser }, info) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const check = observe(page);
  try {
    await page.goto("/entries/demo-entry-burger/offers/demo-offer-combo/edit");
    await page.getByRole("button", { name: "Editar opción Agua mineral", exact: true }).click();
    await expect(page.getByText(/Insumo de inventario: Agua mineral/)).toBeVisible();
    await page.getByLabel("Nombre mostrado (opcional)").fill("Agua mineral en vaso");
    await page.getByRole("button", { name: "Guardar opción", exact: true }).click();
    await expect(page.getByText("Agua mineral en vaso", { exact: true })).toBeVisible();
    const imageControl = page.getByRole("button", { name: "Seleccionar o arrastrar imagen de la oferta", exact: true });
    await expect(imageControl.getByText("Cambiar imagen", { exact: true })).toBeVisible();
    await imageControl.focus();
    const [keyboardChooser] = await Promise.all([page.waitForEvent("filechooser"), imageControl.press("Enter")]);
    const buffer = Buffer.from(await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 40; c.height = 30; c.getContext("2d")!.fillRect(0, 0, 40, 30); return c.toDataURL("image/png").split(",")[1]; }), "base64");
    await keyboardChooser.setFiles({ name: "keyboard.png", mimeType: "image/png", buffer });
    await expect(page.getByRole("img", { name: "Vista previa de la oferta", exact: true })).toHaveAttribute("src", /^blob:/);
    const [touchChooser] = await Promise.all([page.waitForEvent("filechooser"), imageControl.tap()]);
    await touchChooser.setFiles({ name: "touch.png", mimeType: "image/png", buffer });
    const details = await page.locator("#offer-image-input").evaluate(el => ({ file: (el as HTMLInputElement).files?.[0]?.name, accept: (el as HTMLInputElement).accept }));
    expect(details.file).toBe("touch.png");
    await evidence(page, info, "image", { ...details, changeVisible: await imageControl.getByText("Cambiar imagen", { exact: true }).isVisible(), option: "Agua mineral en vaso" });
    check();
  } finally { await context.close(); }
});

test("UX09 cards retain untagged offers, independent state, deletion restriction and catalog return", async ({ page }, info) => {
  const check = observe(page);
  const returnTo = "/?q=Hamburguesa&status=ACTIVE&page=1&pageSize=12";
  await page.goto(returnTo);
  await page.getByRole("link", { name: "Ver ofertas de Hamburguesa clásica", exact: true }).click();
  await page.getByRole("link", { name: "Abrir oferta Combo con bebida para editar", exact: true }).click();
  await page.getByLabel("Etiqueta de presentación (opcional)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sin etiqueta de presentación", exact: true })).toBeVisible();
  const cards = page.locator(".offer-card");
  await expect(cards.locator(".offer-state--active")).toHaveText("Activa");
  await expect(cards.locator(".offer-state--inactive")).toHaveText("Inactiva");
  const activeDelete = page.getByRole("button", { name: "Eliminar oferta Individual", exact: true });
  await expect(activeDelete).toHaveCount(0);
  const keys = await cards.locator("[data-return-key]").evaluateAll(elements => elements.map(el => el.getAttribute("data-return-key")));
  expect(new Set(keys).size).toBe(keys.length);
  await page.getByRole("button", { name: "Eliminar oferta Sin etiqueta de presentación", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sin etiqueta de presentación", exact: true })).toBeVisible();
  await evidence(page, info, "cards", { keys, activeDeletionHidden: await activeDelete.count() === 0, returnTo });
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
  check();
});
