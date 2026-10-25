import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function record(page: Page, info: TestInfo, name: string) {
  const measures = await page.locator("form").evaluate(form => {
    const footer = form.querySelector(":scope > footer")!;
    const rect = footer.getBoundingClientRect();
    const active = document.activeElement?.getBoundingClientRect();
    const diagnostics = { scrollY, viewport: innerHeight, footerPosition: getComputedStyle(footer).position, footerBottom: getComputedStyle(footer).bottom, formTop: form.getBoundingClientRect().top, formBottom: form.getBoundingClientRect().bottom, ancestors: [] as { tag: string; classes: string; overflow: string; height: number; scrollHeight: number; top: number }[] };
    for (let ancestor = footer.parentElement; ancestor; ancestor = ancestor.parentElement) diagnostics.ancestors.push({ tag: ancestor.tagName, classes: ancestor.className, overflow: getComputedStyle(ancestor).overflowY, height: ancestor.clientHeight, scrollHeight: ancestor.scrollHeight, top: ancestor.getBoundingClientRect().top });
    return { diagnostics, persistent: form.getAttribute("data-actions-persistent"), formHeight: form.getAttribute("data-form-height"), available: form.getAttribute("data-available-height"), footer: { top: rect.top, bottom: rect.bottom, height: rect.height }, active: active ? { top: active.top, bottom: active.bottom } : null, submitCount: form.querySelectorAll('[type="submit"]').length, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  const json = info.outputPath(`${name}.json`);
  await writeFile(json, JSON.stringify(measures, null, 2));
  await info.attach(name, { path: json, contentType: "application/json" });
  const png = info.outputPath(`${name}.png`);
  await page.screenshot({ path: png, fullPage: true });
  await info.attach(name, { path: png, contentType: "image/png" });
  expect(measures.submitCount).toBe(1);
  expect(measures.overflow).toBe(false);
  return measures;
}

async function expectFocusClearOfFooter(page: Page) {
  await expect.poll(() => page.locator("form").evaluate(form => {
    const active = document.activeElement;
    const footer = form.querySelector(":scope > footer")!;
    if (!(active instanceof HTMLElement) || footer.contains(active)) return false;
    const bounds = active.getBoundingClientRect();
    const actions = footer.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= innerHeight && bounds.bottom <= actions.top;
  })).toBe(true);
}

for (const [width, height] of [[390, 844], [390, 568], [844, 390], [768, 1024], [1440, 1100]]) {
  test(`UX13 entry actions remain usable at ${width}x${height}`, async ({ page }, info) => {
    const errors: string[] = []; const api: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
    await page.setViewportSize({ width, height });
    await page.goto("/entries/new");
    const heading = page.getByRole("heading", { name: "Nueva entrada", exact: true });
    await expect(heading).toBeVisible();
    const save = page.getByRole("button", { name: "Guardar entrada", exact: true });
    await expect(save).toBeEnabled();
    await save.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(save).toBeFocused();
    const metrics = await record(page, info, "entry-actions");
    if (width === 1440) expect(metrics.persistent).toBe("false");
    else expect(metrics.persistent).toBe("true");
    expect(metrics.footer.bottom).toBeLessThanOrEqual(height);
    await page.locator("#entry-description").focus();
    await expectFocusClearOfFooter(page);
    await record(page, info, "entry-field-focus");
    await save.click();
    await expect(page.locator(".entry-form [role=alert]").first()).toBeFocused();
    await expectFocusClearOfFooter(page);
    await record(page, info, "entry-errors");
    expect(errors).toEqual([]); expect(api).toEqual([]);
  });
}

test("UX13 offer edits announce the named result once and preserve list context", async ({ page }, info) => {
  const errors: string[] = []; const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 568 });
  await page.goto("/entries/demo-entry-burger/offers?q=Individual&page=1");
  await page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true }).click();
  await page.getByLabel("Etiqueta de presentación (opcional)", { exact: true }).fill("Individual UX13");
  await page.getByRole("button", { name: "Agregar grupo", exact: true }).focus();
  await record(page, info, "offer-actions");
  await expectFocusClearOfFooter(page);
  await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: 'Oferta "Individual UX13" actualizada.' })).toHaveCount(1);
  await expect(page).toHaveURL(/offers\?q=Individual&page=1$/);
  await page.reload();
  await expect(page.locator("h1[data-route-heading]")).toContainText("Ofertas de");
  await expect(page.getByText('Oferta "Individual UX13" actualizada.', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]); expect(api).toEqual([]);
});

test("UX13 CSS 200 percent zoom emulation retains entry focus and one local save", async ({ page }, info) => {
  await page.setViewportSize({ width: 844, height: 568 });
  await page.goto("/entries/new");
  await expect(page.getByRole("heading", { name: "Nueva entrada", exact: true })).toBeVisible();
  await page.addStyleTag({ content: "html { zoom: 2; }" });
  await expect(page.getByRole("button", { name: "Guardar entrada", exact: true })).toBeEnabled();
  await page.locator("#entry-description").focus();
  await expectFocusClearOfFooter(page);
  await record(page, info, "css-zoom-200-emulation");
});
