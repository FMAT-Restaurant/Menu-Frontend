import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("pending DELETE keeps Tab and Shift+Tab inside the modal without closing or submitting twice", async ({ page }, info) => {
  let releaseDelete: () => void = () => {};
  const pending = new Promise<void>(resolve => { releaseDelete = resolve; });
  let writes = 0;
  let deleted = false;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const recipe = { id: "ux03-pending-recipe", name: "Receta pendiente UX03", description: "Caso HTTP controlado", instructions: "Conservar foco durante eliminación", supplies: [] };

  await page.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: {
    data: deleted ? [] : [recipe],
    meta: { page: 1, pageSize: 50, total: deleted ? 0 : 1, totalPages: deleted ? 0 : 1 },
  } }));
  await page.route("**/api/v1/menu/recipes/ux03-pending-recipe", async route => {
    if (route.request().method() === "GET") {
      return route.fulfill({ headers: { etag: '"ux03-pending-v1"' }, json: { data: recipe } });
    }
    if (route.request().method() === "DELETE") {
      writes += 1;
      await pending;
      deleted = true;
      return route.fulfill({ status: 204 });
    }
    return route.continue();
  });

  await page.goto("/recipes");
  await page.getByRole("button", { name: "Eliminar Receta pendiente UX03", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar receta?", exact: true });
  await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Eliminar receta", exact: true }).click();

  try {
    await expect.poll(() => writes).toBe(1);
    const buttons = dialog.getByRole("button");
    await expect(buttons).toHaveCount(2);
    for (const button of await buttons.all()) await expect(button).toBeDisabled();
    const states: unknown[] = [];
    const measure = async (step: string) => dialog.evaluate((el, step) => ({
      step,
      activeTag: document.activeElement?.tagName,
      activeName: document.activeElement?.textContent?.trim(),
      focusWithin: el.contains(document.activeElement),
      modalOpen: (el as HTMLDialogElement).open,
    }), step);
    states.push(await measure("all controls disabled after DELETE"));
    for (const key of ["Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      const state = await measure(key);
      states.push(state);
      expect.soft(state.focusWithin, `${key} must keep focus inside the pending modal`).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Enter");
    expect(writes, "An in-flight DELETE must never be submitted twice").toBe(1);
    expect(errors).toEqual([]);
    const path = info.outputPath("pending-modal-focus.json");
    await writeFile(path, JSON.stringify({ environment: "production preview with retained HTTP fixture, not demo", writes, states, errors }, null, 2));
    await info.attach("pending-modal-focus.json", { path, contentType: "application/json" });
    await page.screenshot({ path: info.outputPath("pending-modal-focus.png") });
  } finally {
    releaseDelete();
  }
  await expect(dialog).toBeHidden();
  expect(writes).toBe(1);
});
