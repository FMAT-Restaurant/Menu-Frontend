import { expect, test } from "@playwright/test";

const image = (width: number, height: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#d8e5de"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#ab5d38"/></svg>`)}`;
const categories = Array.from({ length: 5 }, (_, index) => ({ id: `category-${index + 1}`, name: `Categoría extensa número ${index + 1}` }));
const entries = [
  { id: "vertical", brandName: "Bowl de pollo", description: "Arroz y verduras", status: "ACTIVE", image: { id: "v", url: image(100, 700), thumbnailUrl: image(100, 700) }, categories, offerCount: 2 },
  { id: "wide", brandName: "Hamburguesa familiar", description: "Con guarnición", status: "INACTIVE", image: { id: "w", url: image(900, 100), thumbnailUrl: image(900, 100) }, categories: [], offerCount: 0 },
  { id: "small", brandName: "Nombre comercial muy largo que necesita ajustarse sin invadir las acciones ni las tarjetas adyacentes", description: "Descripción larga que debe envolver correctamente incluso cuando el espacio disponible es reducido y hay varias categorías.", status: "ARCHIVED", image: { id: "s", url: image(20, 20), thumbnailUrl: image(20, 20) }, categories, offerCount: 1 },
  { id: "broken", brandName: "Entrada con imagen rota", description: "Referencia no disponible", status: "INACTIVE", image: { id: "b", url: "/broken-image.png", thumbnailUrl: "/broken-image.png" }, categories: [], offerCount: 0 },
  { id: "none", brandName: "Entrada sin imagen", description: "Sin referencia", status: "INACTIVE", image: null, categories: [], offerCount: 0 },
  { id: "last", brandName: "Última entrada", description: "Más datos", status: "ACTIVE", image: null, categories: [], offerCount: 1 },
] as const;

test("keeps catalog cards contained and controls reachable at desktop, mobile and zoom", async ({ page }) => {
  await page.route("**/broken-image.png", (route) => route.abort());
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({ json: { data: categories, meta: { page: 1, pageSize: 100, total: 5, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({ json: { data: entries, meta: { page: 1, pageSize: 12, total: 6, totalPages: 1 } } }));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bowl de pollo" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Sin imagen de Entrada con imagen rota" })).toBeVisible();
  const imageBox = await page.locator(".entry-card__image").first().boundingBox();
  const imageContent = await page.getByRole("img", { name: "Imagen de Bowl de pollo" }).boundingBox();
  expect(imageBox).not.toBeNull();
  expect(imageContent).not.toBeNull();
  expect(imageContent!.height).toBeLessThanOrEqual(imageBox!.height);
  const edit = await page.getByRole("link", { name: "Editar Bowl de pollo" }).boundingBox();
  expect(edit!.y + edit!.height).toBeLessThan(768);
  await page.screenshot({ path: "test-results/catalog-desktop.png" });

  for (const width of [375, 768, 1024, 1366]) {
    await page.setViewportSize({ width, height: 812 });
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(sizes.scroll, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(sizes.client);
    if (width === 375) {
      const firstCard = await page.locator(".entry-card").first().boundingBox();
      expect(firstCard!.y).toBeLessThan(812);
      await expect(page.getByRole("button", { name: "Filtros", exact: true })).toBeVisible();
      await page.screenshot({ path: "test-results/catalog-mobile.png" });
    }
  }
  await page.setViewportSize({ width: 768, height: 812 });
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  const zoomed = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(zoomed.scroll).toBeLessThanOrEqual(zoomed.client);
});
