import { expect, test } from "@playwright/test";
import { routeEvidence } from "./ux-ui-15-evidence";

test.beforeEach(async ({ page }) => {
  const errors: string[] = []; const api: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  await page.exposeFunction("assertUx15Demo", () => { expect(errors).toEqual([]); expect(api).toEqual([]); });
});
test.afterEach(async ({ page }) => {
  await page.evaluate(async () => (window as unknown as { assertUx15Demo(): Promise<void> }).assertUx15Demo());
});

test("UX15 restores nested entry and offer origins through back links and browser history", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?q=Hamburguesa&page=1");
  await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeFocused();
  const entry = page.getByRole("link", { name: "Ver ofertas de Hamburguesa clásica", exact: true });
  await entry.click();
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa clásica", exact: true })).toBeFocused();
  await expect(page).toHaveTitle("[DEMO] Ofertas de Hamburguesa clásica | FMAT Restaurant");
  const offer = page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true });
  await offer.click();
  await expect(page.getByRole("heading", { name: "Editar oferta", exact: true })).toBeFocused();
  await page.getByRole("link", { name: /Volver a ofertas/ }).click();
  await expect(offer).toBeFocused();
  await routeEvidence(page, info, "offer-origin");
  await page.getByRole("link", { name: /Volver a entradas/ }).click();
  await expect(entry).toBeFocused();
  await expect(page).toHaveURL(/\/?q=Hamburguesa&page=1$/);
  await routeEvidence(page, info, "entry-origin");
  await page.goBack();
  await expect(offer).toBeFocused();
  await page.goForward();
  await expect(entry).toBeFocused();
});

for (const [path, title] of [["/", "Entradas del menú"], ["/categories", "Catálogo de categorías"], ["/recipes", "Biblioteca de recetas"], ["/entries/new", "Nueva entrada"], ["/entries/demo-entry-burger/edit", "Editar entrada"], ["/entries/demo-entry-burger/offers/new", "Nueva oferta"], ["/ux15-missing", "Página no encontrada"]]) {
  test(`UX15 direct task ${path} has a local focus and demo document title`, async ({ page }, info) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeFocused();
    await expect(page).toHaveTitle(`[DEMO] ${title} | FMAT Restaurant`);
    const result = await routeEvidence(page, info, "direct-task");
    expect(result.extraLiveAnnouncements).toBe(0);
    expect(result.dialogs).toBe(0);
  });
}

test("UX15 filtering preserves the search focus and a local dialog retains its own focus", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeFocused();
  const search = page.getByRole("searchbox", { name: "Buscar entradas", exact: true });
  await search.fill("Hamburguesa");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=Hamburguesa/);
  await expect(search).toBeFocused();
  await routeEvidence(page, info, "filter-focus");
  await page.getByRole("link", { name: "Categorías", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catálogo de categorías", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Nueva categoría", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Nombre", exact: true })).toBeFocused();
  await routeEvidence(page, info, "dialog-priority");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Nueva categoría", exact: true })).toBeFocused();
});

test("UX15 a confirmed save keeps one local receipt after the route state is consumed", async ({ page }, info) => {
  await page.goto("/entries/demo-entry-burger/offers");
  await page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Editar oferta", exact: true })).toBeFocused();
  await page.getByLabel("Etiqueta de presentación (opcional)", { exact: true }).fill("Individual UX15");
  await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  const success = page.getByRole("status").filter({ hasText: 'Oferta "Individual UX15" actualizada.' });
  await expect(success).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Abrir oferta Individual UX15 para editar", exact: true })).toBeFocused();
  const data = await routeEvidence(page, info, "save-receipt");
  expect(data.extraLiveAnnouncements).toBe(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa clásica", exact: true })).toBeFocused();
  await expect(success).toHaveCount(0);
});
