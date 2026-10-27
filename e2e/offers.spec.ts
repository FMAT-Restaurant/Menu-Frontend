import { expect, test } from "@playwright/test";

test("opens an entry's offers and returns to the catalog without losing the query", async ({ page }) => {
  const status = "INACTIVE";
  const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE", image: null, categories: [], offerCount: 1 };
  const offer = () => ({
    id: "offer-1", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Combo",
    basePrice: 180, status, image: null, slotCount: 1,
  });
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } }));
  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({ json: { data: [entry], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  await page.route("**/api/v1/menu/offers?*", (route) => route.fulfill({ json: { data: [offer()], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/offers/offer-1", (route) => route.fulfill({
    headers: { ETag: '"offer-rev-1"' },
    json: {
      data: {
        ...offer(),
        composition: { slots: [] },
      },
    },
  }));

  await page.goto("/?q=hawai");
  await page.getByRole("link", { name: "Ver ofertas de Hamburguesa Hawaiana", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Combo" })).toBeVisible();
  await expect(page.getByText(/solo se publica si la entrada está activa/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Eliminar oferta Combo" })).toBeVisible();
  const statusControl = page.getByRole("button", { name: "Cambiar estado de oferta Combo: Inactiva" });
  await expect(statusControl).toHaveCSS("border-radius", "8px");
  await expect(statusControl).toHaveText("Activar oferta");
  await expect(statusControl).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".offer-state--inactive")).toHaveText("Inactiva");
  await expect(page.locator(".offer-card__composition")).toHaveCSS("align-items", "center");
  await page.getByRole("link", { name: "Abrir oferta Combo para editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar oferta" })).toBeVisible();
  await page.getByRole("link", { name: /Volver a ofertas/ }).click();
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa Hawaiana" })).toBeVisible();
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(page).toHaveURL(/\/?q=hawai$/);
});

test("keeps the offers view inside narrow screens and reconciles an out-of-range last page", async ({ page }) => {
  let total = 13;
  const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "ACTIVE", image: null, categories: [], offerCount: total };
  const offers = (requestedPage: number) => ({
    data: requestedPage === 1 ? Array.from({ length: 12 }, (_, index) => ({
      id: `offer-${index + 1}`, entryId: "entry-1", entryName: entry.brandName,
      presentationTag: `Presentación ${index + 1}`, basePrice: 180 + index,
      status: "INACTIVE", image: null, slotCount: 1,
    })) : total > 12 ? [{ id: "offer-13", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Familiar", basePrice: 240, status: "INACTIVE", image: null, slotCount: 1 }] : [],
    meta: { page: requestedPage, pageSize: 12, total, totalPages: Math.ceil(total / 12) },
  });
  await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  await page.route("**/api/v1/menu/offers/offer-13", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ headers: { ETag: '"offer-rev-13"' }, json: { data: { id: "offer-13", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Familiar", basePrice: 240, status: "INACTIVE", image: null, slotCount: 1, composition: { slots: [] } } } });
      return;
    }
    if (route.request().method() === "DELETE") total = 12;
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/v1/menu/offers?*", async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    await route.fulfill({ json: offers(requestedPage) });
  });
  await page.goto("/entries/entry-1/offers?page=2");
  await expect(page.getByRole("heading", { name: "Familiar" })).toBeVisible();
  await page.getByRole("button", { name: "Eliminar oferta Familiar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar oferta", exact: true }).click();
  await expect(page).toHaveURL(/\/entries\/entry-1\/offers\?page=1$/);
  await expect(page.getByRole("heading", { name: "Presentación 1", exact: true })).toBeVisible();

  for (const [width, height] of [[1366, 768], [1024, 600], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test("keeps the single empty-state CTA visible at 1024x600 and prevents horizontal overflow at 320x568", async ({ page }) => {
  const entry = { id: "fixture-entry", brandName: "Entrada de prueba", description: "Descripción", status: "INACTIVE", image: null, categories: [], offerCount: 0 };
  await page.route("**/api/v1/menu/entries/fixture-entry", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  await page.route("**/api/v1/menu/offers?*", (route) => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/entries/fixture-entry/offers");
  await expect(page.getByText("No hay ofertas configuradas.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Crear primera oferta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nueva oferta" })).toHaveCount(0);
  await expect(page.getByText(/Mostrando/)).toHaveCount(0);
  const cta = await page.getByRole("link", { name: "Crear primera oferta" }).boundingBox();
  expect(cta).not.toBeNull();
  expect(cta!.y + cta!.height).toBeLessThanOrEqual(600);
  await page.setViewportSize({ width: 320, height: 568 });
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
});

test("separately verifies delete dialog cancel button and Escape key restore focus to trigger without mutating", async ({ page }) => {
  let deleteAttempts = 0;
  const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE", image: null, categories: [], offerCount: 1 };
  const offer = {
    id: "offer-1", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Combo",
    basePrice: 180, status: "INACTIVE", image: null, slotCount: 1,
  };
  await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  await page.route("**/api/v1/menu/offers?*", (route) => route.fulfill({ json: { data: [offer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/offers/offer-1", (route) => {
    if (route.request().method() === "DELETE") {
      deleteAttempts++;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: { data: offer } });
  });

  await page.goto("/entries/entry-1/offers");
  await expect(page.getByRole("heading", { name: "Combo" })).toBeVisible();

  // Test 1: Cancel button
  const trigger = page.getByRole("button", { name: "Eliminar oferta Combo" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const cancelBtn = dialog.getByRole("button", { name: "Cancelar" });
  await expect(cancelBtn).toBeFocused();
  await cancelBtn.click();
  await expect(dialog).toBeHidden();
  expect(deleteAttempts).toBe(0);
  await expect(trigger).toBeFocused();

  // Test 2: Escape key
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(deleteAttempts).toBe(0);
  await expect(trigger).toBeFocused();
});

test("handles delete error with single alert and recovery reachable inside the modal dialog", async ({ page }) => {
  let deleteCount = 0;
  const entry = { id: "entry-1", brandName: "Hamburguesa Hawaiana", description: "Con piña", status: "INACTIVE", image: null, categories: [], offerCount: 1 };
  const offer = {
    id: "offer-1", entryId: "entry-1", entryName: entry.brandName, presentationTag: "Combo",
    basePrice: 180, status: "INACTIVE", image: null, slotCount: 1,
  };

  await page.route("**/api/v1/menu/entries/entry-1", (route) => route.fulfill({ json: { data: { ...entry, categoryIds: [] } } }));
  await page.route("**/api/v1/menu/offers?*", (route) => {
    if (deleteCount > 1) {
      return route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } });
    }
    return route.fulfill({ json: { data: [offer], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } } });
  });
  await page.route("**/api/v1/menu/offers/offer-1", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteCount++;
      if (deleteCount === 1) {
        // First delete attempt returns 412 precondition failed
        return route.fulfill({ status: 412, json: { error: { message: "Los datos cambiaron desde que se cargaron." } } });
      }
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({
      headers: { ETag: '"offer-rev-1"' },
      json: {
        data: {
          ...offer,
          composition: { slots: [] },
        },
      },
    });
  });

  await page.goto("/entries/entry-1/offers");
  await expect(page.getByRole("heading", { name: "Combo" })).toBeVisible();
  await page.getByRole("button", { name: "Eliminar oferta Combo" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Eliminar oferta", exact: true }).click();

  // O26: Single alert, rendered inside active modal dialog
  await expect(dialog.getByRole("alert")).toContainText("Los datos cambiaron");
  await expect(page.getByRole("alert")).toHaveCount(1);

  // O24: Delete button disabled, "Actualizar lista" button visible inside modal
  const deleteBtn = dialog.getByRole("button", { name: "Eliminar oferta", exact: true });
  await expect(deleteBtn).toBeDisabled();
  const reconcileBtn = dialog.getByRole("button", { name: "Actualizar lista" });
  await expect(reconcileBtn).toBeVisible();

  // Click "Actualizar lista" inside modal dialog
  await reconcileBtn.click();

  // After list update where item was still present, delete button is re-enabled
  await expect(deleteBtn).toBeEnabled();

  // Now delete again (second call returns 204)
  await deleteBtn.click();

  // Modal closes, success notice displayed, item removed
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Oferta eliminada.")).toBeVisible();
  await expect(page.getByText("No hay ofertas configuradas.")).toBeVisible();
});
