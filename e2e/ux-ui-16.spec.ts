import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const entry = { id: "ux16-entry", brandName: "Entrada UX16", description: "Contexto confirmado", status: "INACTIVE", categoryIds: [], image: null };
const category = { id: "ux16-category", name: "Categoría UX16", description: "Clasificación", entryCount: 1 };
const recipe = { id: "ux16-recipe", name: "Receta UX16", description: "Preparación confirmada", supplies: [] };
const offer = { id: "ux16-offer", entryId: entry.id, entryName: entry.brandName, presentationTag: "Individual UX16", basePrice: 145, status: "INACTIVE", image: null, slotCount: 0 };
function collection(data: unknown[], pageSize: number) { return { data, meta: { page: 1, pageSize, total: data.length, totalPages: data.length ? 1 : 0 } }; }

async function geometry(page: Page, info: TestInfo, name: string) {
  const measurements = await page.locator("[data-menu-module]").evaluate(module => {
    const rect = (element: Element) => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; };
    const collect = (selector: string) => [...module.querySelectorAll(selector)].filter(element => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && !element.closest("[hidden]"); }).map(rect);
    return { width: module.getBoundingClientRect().width, viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth > innerWidth,
      heading: collect("[data-route-heading]"), filters: collect('[aria-label="Filtros de entradas"], .recipe-toolbar, .recipe-inventory-controls'),
      reservation: collect("[data-loading-state]"), images: collect(" .menu-loading__image, .entry-card__image, .offer-card__image, .entry-image-field__preview, .image-dropzone"),
      content: collect(".menu-loading__item, .entry-form__layout, .entry-card, .offer-card, .category-row, .recipe-card, .offer-commercial-info"),
      imageZones: collect(".menu-loading__image-zone, .entry-image-field__zone"),
      actions: collect(".entry-form__actions, .offer-form__actions"),
      animation: [...module.querySelectorAll(".menu-loading, .menu-loading *")].map(element => getComputedStyle(element).animationName),
      focus: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName };
  });
  const json = info.outputPath(`${name}.json`);
  await writeFile(json, JSON.stringify(measurements, null, 2));
  await info.attach(name, { path: json, contentType: "application/json" });
  const png = info.outputPath(`${name}.png`);
  await page.screenshot({ path: png, fullPage: true });
  await info.attach(name, { path: png, contentType: "image/png" });
  expect(measurements.overflow).toBe(false);
  expect(measurements.animation.every(value => value === "none")).toBe(true);
  return measurements;
}

for (const width of [390, 1024, 1440]) for (const [path, delayed, variant, visible] of [
  ["/", "/menu/entries", "entries", "Entrada UX16"],
  ["/categories", "/menu/categories", "category-rows", "Categoría UX16"],
  ["/recipes", "/menu/recipes", "recipe-rows", "Receta UX16"],
  ["/entries/ux16-entry/offers", "/menu/offers", "offers", "Individual UX16"],
  ["/entries/ux16-entry/offers/new", "/menu/entries/ux16-entry", "offer-form", "Etiqueta de presentación (opcional)"],
  ["/entries/ux16-entry/edit", "/menu/entries/ux16-entry", "entry-form", "Nombre comercial"],
] as const) {
  test(`UX16 ${path} reserves local content at ${width}px until its initial response arrives`, async ({ page }, info) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const unexpected: string[] = []; const errors: string[] = []; const writes: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/v1/**", async route => {
      const request = route.request(); const apiPath = new URL(request.url()).pathname.replace("/api/v1", "");
      if (request.method() !== "GET") { writes.push(request.method()); await route.fulfill({ status: 500, json: {} }); return; }
      if (apiPath === delayed) await gate;
      let response: unknown;
      if (apiPath === "/menu/categories") response = collection([category], 100);
      else if (apiPath === "/menu/entries") response = collection([{ ...entry, categories: [], offerCount: 1 }], 12);
      else if (apiPath === "/menu/entries/ux16-entry") response = { data: entry };
      else if (apiPath === "/menu/offers") response = collection([offer], 12);
      else if (apiPath === "/menu/recipes") response = collection([recipe], 50);
      else { unexpected.push(apiPath); await route.fulfill({ status: 500, json: {} }); return; }
      await route.fulfill({ headers: { ETag: '"ux16-v1"' }, json: response });
    });
    try {
      await page.goto(path);
      await expect(page.locator(`[data-loading-state="${variant}"]`)).toBeVisible();
      await expect(page.locator("[data-route-heading]")).toBeVisible();
      const pending = await geometry(page, info, "pending");
      expect(pending.reservation.some(box => box.height >= 100)).toBe(true);
      release();
      if (variant.endsWith("form")) await expect(page.getByLabel(visible, { exact: true })).toBeEnabled();
      else await expect(page.getByRole("heading", { name: visible, exact: true })).toBeVisible();
      await expect(page.locator(`[data-loading-state="${variant}"]`)).toHaveCount(0);
      const resolved = await geometry(page, info, "resolved");
      expect(Math.abs(resolved.heading[0].y - pending.heading[0].y)).toBeLessThanOrEqual(1);
      expect(Math.abs(resolved.content[0].y - pending.content[0].y)).toBeLessThanOrEqual(4);
      expect(Math.abs(resolved.content[0].x - pending.content[0].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(resolved.content[0].width - pending.content[0].width)).toBeLessThanOrEqual(2);
      if (variant === "entries" || variant === "offers" || variant === "entry-form") {
        expect(Math.abs(resolved.images[0].height - pending.images[0].height)).toBeLessThanOrEqual(1);
        expect(Math.abs(resolved.images[0].width - pending.images[0].width)).toBeLessThanOrEqual(2);
      }
      if (["offers", "category-rows", "recipe-rows"].includes(variant)) expect(pending.content[0].height).toBeGreaterThanOrEqual(resolved.content[0].height * 0.85);
      const comparison = info.outputPath("comparison.json");
      await writeFile(comparison, JSON.stringify({ environment: "controlled HTTP fixtures", pending, resolved, headingTopDelta: resolved.heading[0].y - pending.heading[0].y }, null, 2));
      await info.attach("comparison", { path: comparison, contentType: "application/json" });
      expect(unexpected).toEqual([]); expect(writes).toEqual([]); expect(errors).toEqual([]);
    } finally { release(); }
  });
}

test("UX16 a failed recipe refresh retains the confirmed cards and query context", async ({ page }, info) => {
  let reads = 0; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/v1/menu/recipes?*", async route => {
    reads += 1;
    if (reads === 1) return route.fulfill({ json: collection([recipe], 50) });
    await gate;
    return route.fulfill({ status: 503, json: { message: "Unavailable" } });
  });
  try {
    await page.goto("/recipes");
    await expect(page.getByRole("article", { name: recipe.name })).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Buscar recetas", exact: true });
    await search.fill("Otra consulta"); await search.press("Enter");
    await expect(page.getByText("Actualizando recetas…", { exact: true })).toBeVisible();
    await expect(page.getByRole("article", { name: recipe.name })).toBeVisible();
    await expect(page.getByRole("button", { name: `Editar ${recipe.name}`, exact: true })).toBeDisabled();
    await expect(search).toBeFocused();
    await geometry(page, info, "refresh-pending");
    release();
    await expect(page.getByRole("alert")).toContainText("No se pudieron cargar las recetas.");
    await expect(page.getByRole("article", { name: recipe.name })).toBeVisible();
    await expect(page.getByText(/Resultados anteriores: todas las recetas, página 1/)).toBeVisible();
    await expect(search).toBeFocused();
    await expect(page.getByText("No hay recetas que coincidan con tu búsqueda.", { exact: true })).toHaveCount(0);
    await geometry(page, info, "refresh-failed");
    expect(reads).toBe(2); expect(errors).toEqual([]);
  } finally { release(); }
});

test("UX16 late categories reserve only their open panel and keep entry edits and the chosen file", async ({ page }, info) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/menu/categories?*", async route => { await gate; await route.fulfill({ json: collection([category], 100) }); });
  try {
    await page.goto("/entries/new");
    const name = page.getByLabel("Nombre comercial", { exact: true });
    await name.fill("Nombre conservado");
    const bytes = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 60; return canvas.toDataURL("image/png").split(",")[1]; });
    await page.getByLabel("Archivo de imagen", { exact: true }).setInputFiles({ name: "ux16.png", mimeType: "image/png", buffer: Buffer.from(bytes, "base64") });
    await expect(page.getByText("ux16.png", { exact: true })).toBeVisible();
    const source = await page.getByRole("img", { name: "Vista previa de la imagen de la entrada", exact: true }).getAttribute("src");
    const categories = page.locator(".entry-category-selector");
    await expect(categories.locator("[data-loading-state]")).toHaveCount(0);
    await geometry(page, info, "categories-closed-pending");
    await page.getByRole("button", { name: "Seleccionar categorías", exact: true }).click();
    await expect(categories.locator('[data-loading-state="options"]')).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Buscar categorías", exact: true });
    await expect(search).toBeFocused();
    await geometry(page, info, "categories-open-pending");
    release();
    await expect(page.getByRole("checkbox", { name: category.name, exact: true })).toBeVisible();
    await expect(categories.locator("[data-loading-state]")).toHaveCount(0);
    await expect(search).toBeFocused();
    await expect(name).toHaveValue("Nombre conservado");
    await expect(page.getByRole("img", { name: "Vista previa de la imagen de la entrada", exact: true })).toHaveAttribute("src", source!);
    await page.getByRole("checkbox", { name: category.name, exact: true }).check();
    await expect(page.getByRole("button", { name: "1 categoría seleccionada", exact: true })).toBeVisible();
    await geometry(page, info, "categories-resolved");
    expect(errors).toEqual([]);
  } finally { release(); }
});
