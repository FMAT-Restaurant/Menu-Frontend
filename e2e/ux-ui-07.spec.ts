import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const entry = { id: "ux07-entry", brandName: "Entrada HTTP vigente", description: "Identidad conservada", status: "INACTIVE", categoryIds: ["ux07-category"], image: { id: "ux07-image", url: "/ux07-current.svg", thumbnailUrl: "/ux07-current.svg" } };
const categories = { data: [{ id: "ux07-category", name: "Principales" }], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } };

async function common(page: Page) {
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.method()); });
  await page.route("**/ux07-current.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#E5E7EB"/></svg>' }));
  return { errors, writes };
}
async function evidence(page: Page, info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2));
  await info.attach(name, { path, contentType: "application/json" });
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

test("UX07 HTTP 404 shows a missing entry without edit fields or a futile retry", async ({ page }, info) => {
  const observed = await common(page);
  let reads = 0;
  await page.route("**/api/v1/menu/categories?*", route => route.fulfill({ json: categories }));
  await page.route("**/api/v1/menu/entries/ux07-missing", route => { reads += 1; return route.fulfill({ status: 404, json: { error: { message: "Entrada no encontrada" } } }); });
  await page.goto("/entries/ux07-missing/edit");
  await expect(page.getByRole("heading", { name: "Entrada no encontrada", exact: true })).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Guardar|Reintentar entrada/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Volver al catálogo", exact: true })).toHaveAttribute("href", "/");
  expect(reads).toBe(1);
  expect(observed.writes).toEqual([]);
  expect(observed.errors).toEqual([]);
  await evidence(page, info, "http404", { environment: "production HTTP fixture", reads, ...observed });
});

test("UX07 temporary HTTP failure can retry the entry without reloading categories", async ({ page }, info) => {
  const observed = await common(page);
  let entryReads = 0, categoryReads = 0;
  await page.route("**/api/v1/menu/categories?*", route => { categoryReads += 1; return route.fulfill({ json: categories }); });
  await page.route("**/api/v1/menu/entries/ux07-entry", route => {
    entryReads += 1;
    return entryReads === 1 ? route.fulfill({ status: 503, json: { error: { message: "Servicio temporalmente indisponible" } } }) : route.fulfill({ headers: { etag: '"ux07-v1"' }, json: { data: entry } });
  });
  await page.goto("/entries/ux07-entry/edit");
  await expect(page.getByRole("heading", { name: "Entrada no encontrada", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Reintentar entrada", exact: true }).click();
  await expect(page.getByLabel("Nombre comercial", { exact: true })).toHaveValue(entry.brandName);
  await expect(page.getByRole("img", { name: "Vista previa de la imagen de la entrada" })).toBeVisible();
  expect({ entryReads, categoryReads }).toEqual({ entryReads: 2, categoryReads: 1 });
  expect(observed.writes).toEqual([]);
  expect(observed.errors).toEqual([]);
  await evidence(page, info, "temporary", { environment: "production HTTP fixture", entryReads, categoryReads, ...observed });
});

test("UX07 late HTTP categories preserve edited identity, assigned category and a selected image", async ({ page }, info) => {
  const observed = await common(page);
  let release: () => void = () => {};
  const wait = new Promise<void>(resolve => { release = resolve; });
  let entryReads = 0, categoryReads = 0;
  await page.route("**/api/v1/menu/categories?*", async route => { categoryReads += 1; await wait; return route.fulfill({ json: categories }); });
  await page.route("**/api/v1/menu/entries/ux07-entry", route => { entryReads += 1; return route.fulfill({ headers: { etag: '"ux07-v1"' }, json: { data: entry } }); });
  try {
    await page.goto("/entries/ux07-entry/edit");
    const name = page.getByLabel("Nombre comercial", { exact: true });
    await expect(name).toHaveValue(entry.brandName);
    await expect(page.getByText("Cargando categorías…", { exact: true })).toBeVisible();
    await name.fill("Edición durante la carga");
    const buffer = Buffer.from(await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 48; return canvas.toDataURL("image/png").split(",")[1]; }), "base64");
    await page.getByLabel("Archivo de imagen", { exact: true }).setInputFiles({ name: "draft.png", mimeType: "image/png", buffer });
    await expect(page.getByText("draft.png", { exact: true })).toBeVisible();
    await expect(page.getByText("Validando archivo e imagen…", { exact: true })).toBeHidden();
    const preview = page.getByRole("img", { name: "Vista previa de la imagen de la entrada" });
    const selectedSource = await preview.getAttribute("src");
    await expect(page.getByRole("button", { name: "Retirar categoría Categoría ya asignada (ux07-category)", exact: true })).toBeVisible();
    release();
    await expect(page.getByText("Cargando categorías…", { exact: true })).toBeHidden();
    await expect(name).toHaveValue("Edición durante la carga");
    await expect(preview).toHaveAttribute("src", selectedSource!);
    await expect(page.getByRole("button", { name: "Retirar categoría Principales", exact: true })).toBeVisible();
    expect({ entryReads, categoryReads }).toEqual({ entryReads: 1, categoryReads: 1 });
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
    await evidence(page, info, "late-categories", { environment: "production HTTP fixture", entryReads, categoryReads, selectedSource, ...observed });
  } finally { release(); }
});
