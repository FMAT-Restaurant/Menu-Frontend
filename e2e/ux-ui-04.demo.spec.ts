import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

function observeDemo(page: Page) {
  const apiRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  page.on("pageerror", error => errors.push(error.message));
  return () => {
    expect(apiRequests, "The demo must stay independent of backend services").toEqual([]);
    expect(errors, "Task headers must not introduce browser errors").toEqual([]);
  };
}

const routes = [
  ["/", "Entradas del menú"],
  ["/categories", "Catálogo de categorías"],
  ["/recipes", "Biblioteca de recetas"],
  ["/entries/new", "Nueva entrada"],
  ["/entries/demo-entry-burger/edit", "Editar entrada"],
  ["/entries/demo-entry-burger/offers", "Ofertas de Hamburguesa clásica"],
  ["/entries/demo-entry-burger/offers/new", "Nueva oferta"],
  ["/entries/demo-entry-burger/offers/demo-offer-burger/edit", "Editar oferta"],
  ["/ux04-missing-route", "Página no encontrada"],
] as const;

for (const width of [390, 1440]) {
  test(`U05/U06: nine routes begin with a local task header at ${width}px`, async ({ page }, testInfo) => {
    const assertDemo = observeDemo(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const measurements = [];
    for (const [index, [path, title]] of routes.entries()) {
      await page.goto(path);
      const heading = page.getByRole("heading", { name: title, level: 1, exact: true });
      await expect(heading).toBeVisible();
      await expect(page.locator("[data-route-heading]")).toHaveCount(1);
      await expect(heading).toHaveAttribute("data-route-heading");
      await expect(heading).toHaveAttribute("tabindex", "-1");
      await expect(heading).toHaveCSS("font-size", "28px");
      await expect(heading).toHaveCSS("line-height", "36px");
      await expect(heading).toHaveCSS("color", "rgb(17, 24, 39)");
      await expect(page.locator(".global-nav, .brand, .brand__mark")).toHaveCount(0);
      await expect(page.getByText("Administración del menú", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Administración / Menú / Ofertas", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Categorías del menú", exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Recetas de la biblioteca", exact: true })).toHaveCount(0);
      const geometry = await heading.evaluate(element => {
        const header = element.closest(".task-header")!;
        const main = header.closest("main")!;
        const rect = (node: Element) => {
          const { x, y, width, height, right, bottom } = node.getBoundingClientRect();
          return { x, y, width, height, right, bottom };
        };
        return {
          path: location.pathname,
          viewport: innerWidth,
          moduleWidth: element.closest("[data-menu-module]")!.getBoundingClientRect().width,
          main: rect(main), header: rect(header), title: rect(element),
          headerBackground: getComputedStyle(header).backgroundColor,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(geometry.header.y, "The task starts inside the local page gutter, without the old brand row").toBeLessThanOrEqual(24);
      expect(Math.abs(geometry.header.x - geometry.main.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.header.width - geometry.main.width)).toBeLessThanOrEqual(1);
      expect(geometry.title.right).toBeLessThanOrEqual(geometry.header.right);
      expect(geometry.headerBackground).toBe("rgba(0, 0, 0, 0)");
      measurements.push(geometry);
      await page.screenshot({ path: testInfo.outputPath(`header-${width}-${index}.png`), fullPage: true });
    }
    const output = testInfo.outputPath("header-measurements.json");
    await writeFile(output, JSON.stringify(measurements, null, 2));
    await testInfo.attach("header-measurements", { path: output, contentType: "application/json" });
    assertDemo();
  });
}

test("U05/U24: local back links retain catalog filters and offer origins without a brand navigation row", async ({ page }, testInfo) => {
  const assertDemo = observeDemo(page);
  const returnTo = "/?q=Hamburguesa&status=ACTIVE&page=1&pageSize=12";
  await page.goto(returnTo);
  await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  for (const name of ["Categorías", "Biblioteca de recetas"]) {
    await page.getByRole("link", { name, exact: true }).click();
    const back = page.getByRole("link", { name: /Volver al menú/ });
    await expect(back).toHaveAttribute("href", returnTo);
    await back.click();
    await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
    await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "Nueva entrada", exact: true }).click();
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
  await page.getByRole("link", { name: "Ver ofertas de Hamburguesa clásica", exact: true }).click();
  await page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Editar oferta", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Volver a ofertas/ }).click();
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa clásica", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
  await expect(page.getByRole("searchbox", { name: "Buscar entradas" })).toHaveValue("Hamburguesa");
  const output = testInfo.outputPath("return-context.json");
  await writeFile(output, JSON.stringify({ returnTo, finalUrl: page.url(), selectedQuery: "Hamburguesa" }, null, 2));
  await testInfo.attach("return-context", { path: output, contentType: "application/json" });
  assertDemo();
});

test("V18: saving an entry with its category panel open delivers one click after the shorter header", async ({ page }, testInfo) => {
  const assertDemo = observeDemo(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("link", { name: "Nueva entrada", exact: true }).click();
  await page.getByLabel("Nombre comercial").fill("Entrada con categorías abiertas");
  await page.getByLabel("Descripción", { exact: true }).fill("Conservar el primer intento de guardar.");
  const buffer = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 60;
    canvas.getContext("2d")!.fillRect(0, 0, 80, 60);
    return canvas.toDataURL("image/png").split(",")[1];
  }), "base64");
  await page.getByLabel("Archivo de imagen").setInputFiles({ name: "open-category.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  await page.getByRole("checkbox", { name: "Platos fuertes", exact: true }).check();
  await page.evaluate(() => {
    const events: unknown[] = [];
    (window as Window & { ux04ClickEvents?: unknown[] }).ux04ClickEvents = events;
    for (const name of ["pointerdown", "pointerup", "click", "submit"]) {
      document.addEventListener(name, event => {
        const button = document.querySelector<HTMLButtonElement>('.entry-form button[type="submit"]');
        const bounds = button?.getBoundingClientRect();
        events.push({ event: event.type, target: (event.target as HTMLElement).tagName, targetText: (event.target as HTMLElement).textContent?.trim(), saveTop: bounds?.top, saveBottom: bounds?.bottom, panelOpen: Boolean(document.querySelector("#entry-category-panel")) });
      }, { capture: true });
    }
  });
  try {
    await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Entrada con categorías abiertas", exact: true })).toBeVisible();
  } finally {
    const events = await page.evaluate(() => (window as Window & { ux04ClickEvents?: unknown[] }).ux04ClickEvents);
    const output = testInfo.outputPath("category-save-click.json");
    await writeFile(output, JSON.stringify(events, null, 2));
    await testInfo.attach("category-save-click", { path: output, contentType: "application/json" });
    await page.screenshot({ path: testInfo.outputPath("category-save-result.png"), fullPage: true });
  }
  assertDemo();
});
