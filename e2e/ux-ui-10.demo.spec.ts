import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function evidence(page: Page, info: TestInfo, name: string) {
  const data = await page.evaluate(() => ({
    modalCount: document.querySelectorAll("dialog[open]:modal").length,
    dialogs: [...document.querySelectorAll("dialog[open]")].map(dialog => ({
      title: dialog.getAttribute("aria-labelledby"),
      backdrop: getComputedStyle(dialog, "::backdrop").backgroundColor,
      width: dialog.getBoundingClientRect().width,
      height: dialog.getBoundingClientRect().height,
    })),
    active: document.activeElement?.getAttribute("aria-label") || document.activeElement?.id || document.activeElement?.textContent,
    bodyPosition: getComputedStyle(document.body).position,
    scrollY,
  }));
  const json = info.outputPath(`${name}.json`);
  const png = info.outputPath(`${name}.png`);
  await writeFile(json, JSON.stringify(data, null, 2));
  await page.screenshot({ path: png, fullPage: true });
  await info.attach(name, { path: json, contentType: "application/json" });
  await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
  return data;
}

for (const width of [390, 1024, 600, 740]) {
  test(`UX10 one modal preserves query, recipe and option drafts at ${width}px`, async ({ page }, info) => {
    const errors: string[] = [];
    const requests: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
    await page.setViewportSize({ width: width === 600 || width === 740 ? 1440 : width, height: 844 });
    await page.goto("/entries/demo-entry-burger/offers/new");
    if (width === 600 || width === 740) await page.locator("[data-menu-module]").evaluate((el, size) => { (el as HTMLElement).style.width = `${size}px`; }, width);
    await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
    await page.getByLabel("Nombre del grupo").fill("Principal");
    await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
    const trigger = page.getByRole("button", { name: "Agregar opción a Principal", exact: true });
    await trigger.click();
    const dialog = page.locator("dialog[open]:modal");
    await page.evaluate(() => {
      const log: unknown[] = [];
      (window as unknown as { ux10Events: unknown[] }).ux10Events = log;
      const snapshot = (phase: string, event?: Event) => log.push({ phase, type: event?.type, key: event instanceof KeyboardEvent ? event.key : undefined, cancelable: event?.cancelable, prevented: event?.defaultPrevented, dialogs: [...document.querySelectorAll("dialog")].map(el => ({ open: el.open, modal: el.matches(":modal"), title: el.getAttribute("aria-labelledby"), connected: el.isConnected })), focus: document.activeElement?.outerHTML.slice(0, 180) });
      for (const type of ["keydown", "cancel", "close"]) document.addEventListener(type, event => {
        if (event instanceof KeyboardEvent && event.key !== "Escape") return;
        snapshot("capture", event);
        queueMicrotask(() => snapshot("after", event));
        setTimeout(() => snapshot("after-dispatch", event), 0);
      }, true);
      document.querySelector("dialog[open]")?.addEventListener("cancel", event => snapshot("target-after-react", event));
      const close = HTMLDialogElement.prototype.close;
      HTMLDialogElement.prototype.close = function (...args) { snapshot("close-called"); return close.apply(this, args); };
      new MutationObserver(records => {
        if (records.some(record => record.type === "attributes" && record.target instanceof HTMLDialogElement)) snapshot("attribute-change");
      }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open", "aria-labelledby"] });
    });
    const node = await dialog.elementHandle();
    await page.getByLabel("Nombre mostrado (opcional)").fill("Mi opción conservada");
    await page.getByRole("button", { name: /^Elegir receta/ }).click();
    const search = page.getByLabel("Buscar recetas", { exact: true });
    await expect(search).toBeFocused();
    await search.fill("sin coincidencias UX10");
    await page.getByRole("button", { name: "Buscar ahora", exact: true }).click();
    await expect(page.getByText("No hay recetas que coincidan con tu búsqueda.")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar búsqueda", exact: true }).click();
    await expect(search).toBeFocused();
    await search.fill("Limonada");
    await page.getByRole("button", { name: "Buscar ahora", exact: true }).click();
    await expect(page.getByRole("article", { name: "Limonada de la casa", exact: true })).toBeVisible();
    expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(width);
    const controlHeights = await dialog.locator("button,input").evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height > 0).map(el => el.getBoundingClientRect().height));
    for (const height of controlHeights) expect(height).toBeGreaterThanOrEqual(48);
    expect((await evidence(page, info, `selector-${width}`)).modalCount).toBe(1);
    const create = page.getByRole("button", { name: "+ Nueva receta", exact: true });
    await create.click();
    await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();
    await page.getByLabel("Nombre", { exact: true }).fill("Borrador de receta UX10");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Seguir editando receta", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Seguir editando receta", exact: true }).click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Borrador de receta UX10");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
    await expect(create).toBeFocused();
    await expect(search).toHaveValue("Limonada");
    await create.click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Borrador de receta UX10");
    expect((await evidence(page, info, `create-${width}`)).modalCount).toBe(1);
    for (const key of ["Tab", "Shift+Tab", "Tab"]) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    const lockedY = await page.evaluate(() => scrollY);
    await page.mouse.move(2, 2);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(lockedY);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Mi opción conservada");
    const eventLog = info.outputPath(`events-${width}.json`);
    await writeFile(eventLog, JSON.stringify(await page.evaluate(() => (window as unknown as { ux10Events: unknown[] }).ux10Events), null, 2));
    await info.attach("native-events", { path: eventLog, contentType: "application/json" });
    await expect(page.getByRole("button", { name: /^Elegir receta/ })).toBeFocused();
    expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
    await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Mi opción conservada");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
    expect((await evidence(page, info, `closed-${width}`)).modalCount).toBe(0);
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}
