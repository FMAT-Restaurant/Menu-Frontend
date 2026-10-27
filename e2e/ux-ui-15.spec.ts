import { expect, test } from "@playwright/test";
import { routeEvidence } from "./ux-ui-15-evidence";

test("UX15 delayed entry context updates the task title without moving the user's focus", async ({ page }, info) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const entry = { id: "entry-1", brandName: "Bowl tardío", description: "Arroz", status: "INACTIVE", categoryIds: [], image: null };
  await page.route("**/api/v1/menu/entries/entry-1", async route => { await gate; await route.fulfill({ json: { data: entry } }); });
  await page.route("**/api/v1/menu/offers?*", route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/entries/entry-1/offers");
  await expect(page.getByRole("heading", { name: "Ofertas de la entrada", exact: true })).toBeFocused();
  const back = page.getByRole("link", { name: /Volver a entradas/ });
  await back.focus();
  await page.keyboard.press("Shift");
  release();
  await expect(page).toHaveTitle("Ofertas de Bowl tardío | FMAT Restaurant");
  await expect(back).toBeFocused();
  await routeEvidence(page, info, "late-context");
  expect(errors).toEqual([]);
});

for (const interaction of ["persistent", "removed"] as const) {
test(`UX15 a suspended editor preserves a ${interaction} control's useful focus context`, async ({ page }, info) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const requestedChunk = new Promise<void>(resolve => { requested = resolve; });
  await page.route("**/assets/EntryFormPage-*.js", async route => { requested(); await gate; await route.continue(); });
  await page.route("**/api/v1/menu/categories?*", route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } }));
  await page.route("**/api/v1/menu/entries?*", route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeFocused();
  if (interaction === "persistent") await page.evaluate(() => {
    const control = document.createElement("button");
    control.id = "ux15-controlled-external-button";
    control.textContent = "Control externo de prueba";
    document.body.prepend(control);
  });
  await page.locator(".task-header").getByRole("link", { name: "Nueva entrada", exact: true }).click();
  await requestedChunk;
  await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeVisible();
  const control = interaction === "persistent"
    ? page.getByRole("button", { name: "Control externo de prueba", exact: true })
    : page.getByRole("searchbox", { name: "Buscar entradas", exact: true });
  await control.click();
  await page.keyboard.press("ArrowRight");
  await expect(control).toBeFocused();
  release();
  await expect(page.getByRole("heading", { name: "Nueva entrada", exact: true })).toBeVisible();
  await expect(page).toHaveTitle("Nueva entrada | FMAT Restaurant");
  if (interaction === "persistent") {
    await expect(control).toBeFocused();
    await expect(control).toBeInViewport({ ratio: 1 });
  }
  else await expect(page.getByRole("heading", { name: "Nueva entrada", exact: true })).toBeFocused();
  await routeEvidence(page, info, `suspended-route-${interaction}`);
});
}
