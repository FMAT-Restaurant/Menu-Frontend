import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

function observeDemo(page: Page) {
  const requests: string[] = [], errors: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  return () => { expect(requests).toEqual([]); expect(errors).toEqual([]); };
}

async function saveJson(testInfo: TestInfo, name: string, data: unknown) {
  const path = testInfo.outputPath(name);
  await writeFile(path, JSON.stringify(data, null, 2));
  await testInfo.attach(name, { path, contentType: "application/json" });
}

async function measureCatalog(page: Page, moduleWidth: number) {
  const expectedColumns = moduleWidth < 768 ? 1 : moduleWidth < 1200 ? 2 : 3;
  const expectedControlHeight = moduleWidth < 1200 ? 48 : 40;
  const geometry = await page.locator(".catalog-page").evaluate(main => {
    const rect = (element: Element) => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    const grid = main.querySelector(".entry-grid")!;
    const pageSize = main.querySelector<HTMLSelectElement>("#page-size")!;
    return {
      viewport: innerWidth, moduleWidth: main.closest("[data-menu-module]")!.getBoundingClientRect().width,
      main: rect(main), columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      scrollWidth: document.documentElement.scrollWidth,
      pageSize: { value: pageSize.value, label: pageSize.selectedOptions[0].text, ...rect(pageSize) },
      cards: [...grid.querySelectorAll("article")].map(card => ({
        ...rect(card), title: rect(card.querySelector("h2")!),
        status: card.querySelector(".status")?.textContent?.trim(),
        statusDotColor: getComputedStyle(card.querySelector(".status__dot")!).backgroundColor,
        titleFont: getComputedStyle(card.querySelector("h2")!).fontSize,
        titleLineHeight: getComputedStyle(card.querySelector("h2")!).lineHeight,
        captionFont: getComputedStyle(card.querySelector(".entry-card__delete-help")!).fontSize,
        captionLineHeight: getComputedStyle(card.querySelector(".entry-card__delete-help")!).lineHeight,
        radius: getComputedStyle(card).borderRadius,
        actions: [...card.querySelectorAll("a,button")].map(rect),
      })),
      controls: [...main.querySelectorAll(".button,input,select")].map(element => ({ name: element.getAttribute("aria-label") || element.textContent?.trim() || element.id, ...rect(element) })).filter(control => control.height > 0),
    };
  });
  expect(geometry.moduleWidth).toBe(moduleWidth);
  expect(geometry.columns).toBe(expectedColumns);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.pageSize.value).toBe("12");
  expect(geometry.pageSize.label).toBe("12");
  expect(geometry.pageSize.width).toBeGreaterThanOrEqual(80);
  for (const control of geometry.controls) {
    expect(control.height, `${control.name} at module ${moduleWidth}px`).toBeGreaterThanOrEqual(expectedControlHeight);
    expect(control.x).toBeGreaterThanOrEqual(geometry.main.x);
    expect(control.right).toBeLessThanOrEqual(geometry.main.right + 1);
  }
  for (const card of geometry.cards) {
    expect(card.titleFont).toBe("18px");
    expect(card.titleLineHeight).toBe("26px");
    expect(card.captionFont).toBe("12px");
    expect(card.captionLineHeight).toBe("16px");
    expect(card.radius).toBe("12px");
    expect(card.title.right).toBeLessThanOrEqual(card.right);
    for (const action of card.actions) {
      expect(action.x).toBeGreaterThanOrEqual(card.x);
      expect(action.right).toBeLessThanOrEqual(card.right);
    }
  }
  expect(geometry.cards.map(card => card.status)).toEqual(expect.arrayContaining(["Activa", "Inactiva", "Archivada"]));
  return geometry;
}

test("U11/U19: catalog actions, columns and page size stay legible across the useful-width boundaries", async ({ page }, testInfo) => {
  const assertDemo = observeDemo(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  const measurements = [];
  for (const width of [320, 390, 740, 767, 768, 1199, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    measurements.push(await measureCatalog(page, width));
    await expect(page.getByRole("link", { name: "Ver ofertas de Hamburguesa clásica", exact: true })).toContainText("Ver ofertas");
    if (width < 768) {
      await page.getByRole("button", { name: "Filtros", exact: true }).click();
      await expect(page.getByRole("combobox", { name: "Categoría", exact: true })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Estado administrativo", exact: true })).toBeVisible();
      measurements.push(await measureCatalog(page, width));
      await page.getByRole("button", { name: "Filtros", exact: true }).click();
    }
    await page.screenshot({ path: testInfo.outputPath(`v${width}.png`), fullPage: true });
  }
  await saveJson(testInfo, "viewport.json", measurements);
  assertDemo();
});

test("V02: a narrow module in a wide host uses its own grid and touch controls", async ({ page }, testInfo) => {
  const assertDemo = observeDemo(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  const measurements = [];
  for (const width of [320, 740, 767, 768, 1199, 1200]) {
    await page.locator("[data-menu-module]").evaluate((module, width) => { (module as HTMLElement).style.width = `${width}px`; }, width);
    measurements.push(await measureCatalog(page, width));
    await page.screenshot({ path: testInfo.outputPath(`h${width}.png`), fullPage: true });
  }
  await saveJson(testInfo, "host.json", measurements);
  assertDemo();
});

test("U11/V05/V06: long categorized cards expose separate keyboard routes and explain restricted deletion", async ({ page }, testInfo) => {
  const assertDemo = observeDemo(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("link", { name: "Editar Hamburguesa clásica", exact: true }).click();
  const longName = "EntradaEspecialConNombreSinSeparadores para compartir con bebida y una selección de acompañamientos preparados al momento";
  await page.getByLabel("Nombre comercial").fill(longName);
  await page.getByRole("button", { name: "1 categoría seleccionada", exact: true }).click();
  await page.getByRole("checkbox", { name: "Bebidas", exact: true }).check();
  await page.getByRole("checkbox", { name: "Postres", exact: true }).check();
  await page.getByRole("searchbox", { name: "Buscar categorías" }).press("Escape");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: longName, exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.locator(".category-chip")).toHaveCount(3);
  const remove = card.getByRole("button", { name: `Eliminar definitivamente ${longName}`, exact: true });
  await expect(remove).toBeDisabled();
  await expect(remove).toHaveAccessibleDescription("Solo se pueden eliminar entradas archivadas.");
  await expect(card.getByText("Solo se pueden eliminar entradas archivadas.", { exact: true })).toBeVisible();
  const keys = await card.evaluate(element => [element, ...element.querySelectorAll("[data-return-key]")].map(node => node.getAttribute("data-return-key")));
  expect(new Set(keys).size).toBe(keys.length);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await measureCatalog(page, width);
    await page.screenshot({ path: testInfo.outputPath(`long${width}.png`), fullPage: true });
  }
  const offers = card.getByRole("link", { name: `Ver ofertas de ${longName}`, exact: true });
  await offers.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: `Ofertas de ${longName}`, exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  const edit = card.getByRole("link", { name: `Editar ${longName}`, exact: true });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Nombre comercial")).toHaveValue(longName);
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  const archived = page.getByRole("button", { name: "Eliminar definitivamente Especial de temporada", exact: true });
  await archived.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Eliminar entrada archivada" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancelar eliminación" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(archived).toBeFocused();
  await saveJson(testInfo, "routes.json", { longName, categories: 3, keys, keyboardOffers: true, keyboardEdit: true, archivedFocusRestored: true });
  assertDemo();
});
