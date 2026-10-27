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
  const editLink = page.getByRole("link", { name: "Editar Bowl de pollo" });
  await editLink.scrollIntoViewIfNeeded();
  await expect(editLink).toBeInViewport();
  await page.screenshot({ path: "test-results/catalog-desktop.png" });

  for (const width of [320, 375, 768, 1024, 1366]) {
    await page.setViewportSize({ width, height: 812 });
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(sizes.scroll, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(sizes.client);
    if (width === 375 || width === 320) {
      const firstCard = await page.locator(".entry-card").first().boundingBox();
      expect(firstCard!.y).toBeLessThan(812);
      await expect(page.getByRole("button", { name: "Filtros", exact: true })).toHaveCount(0);
      await expect(page.getByRole("combobox", { name: "Categoría", exact: true })).toBeVisible();
    }
  }
  await page.setViewportSize({ width: 768, height: 812 });
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  const zoomed = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(zoomed.scroll).toBeLessThanOrEqual(zoomed.client);
});

test("preserves image reserved dimensions at 320px before and after image load failure (C16)", async ({ page }) => {
  await page.route("**/broken-image.png", (route) => route.abort());
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({ json: { data: categories, meta: { page: 1, pageSize: 100, total: 5, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({ json: { data: entries, meta: { page: 1, pageSize: 12, total: 6, totalPages: 1 } } }));

  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto("/");

  const validImageBox = await page.locator(".entry-card__image").first().boundingBox();
  expect(validImageBox).not.toBeNull();

  const brokenCard = page.locator(".entry-card").filter({ hasText: "Entrada con imagen rota" });
  await expect(brokenCard.getByRole("img", { name: "Sin imagen de Entrada con imagen rota" })).toBeVisible();
  const brokenImageBox = await brokenCard.locator(".entry-card__image").boundingBox();

  expect(brokenImageBox).not.toBeNull();
  expect(brokenImageBox!.height).toBeGreaterThanOrEqual(100);
  expect(Math.abs(brokenImageBox!.height - validImageBox!.height)).toBeLessThanOrEqual(10);
});

test("confirms delete in native dialog with inert backdrop, escape support and actionable recovery inside modal (C06, C11, C13)", async ({ page }) => {
  let deleteAttempts = 0;
  let reconciled = false;

  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } }));
  await page.route("**/api/v1/menu/entries/small*", (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      const smallEntry = entries.find((e) => e.id === "small")!;
      return route.fulfill({
        headers: { ETag: '"strong-etag-small"' },
        json: {
          data: {
            id: smallEntry.id,
            brandName: smallEntry.brandName,
            description: smallEntry.description,
            status: "ARCHIVED",
            categoryIds: ["category-1"],
            image: smallEntry.image,
          },
        },
      });
    }
    if (request.method() === "DELETE") {
      deleteAttempts += 1;
      return route.fulfill({ status: 412, json: { message: "Precondition failed" } });
    }
    return route.continue();
  });
  await page.route("**/api/v1/menu/entries?*", (route) => {
    const list = reconciled ? entries.filter((e) => e.id !== "small") : entries;
    return route.fulfill({ json: { data: list, meta: { page: 1, pageSize: 12, total: list.length, totalPages: 1 } } });
  });

  await page.goto("/?status=ARCHIVED");
  const deleteBtn = page.getByRole("button", { name: /Eliminar definitivamente Nombre comercial muy largo/ });
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  const dialog = page.getByRole("dialog", { name: "Eliminar entrada archivada" });
  await expect(dialog).toBeVisible();

  // Cancel button has focus
  const cancelBtn = dialog.getByRole("button", { name: "Cancelar eliminación" });
  await expect(cancelBtn).toBeFocused();

  // Test Escape cancels cleanly
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  // Reopen dialog and attempt deletion
  await deleteBtn.click();
  await expect(dialog).toBeVisible();
  const confirmBtn = dialog.getByRole("button", { name: "Confirmar eliminación" });
  await confirmBtn.click();

  await expect.poll(() => deleteAttempts).toBe(1);

  // Recovery message and button are inside the active modal (C06, C11, C13)
  const alert = dialog.getByRole("alert");
  await expect(alert).toContainText("La entrada cambió desde que la abriste");
  await expect(confirmBtn).toBeDisabled();

  const reconcileBtn = dialog.getByRole("button", { name: "Actualizar lista" });
  await expect(reconcileBtn).toBeVisible();

  // Recover by reconciling list
  reconciled = true;
  await reconcileBtn.click();

  // Dialog closes upon successful recovery and entry is removed
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("heading", { name: /Nombre comercial muy largo/ })).not.toBeVisible();
});
