import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

for (const width of [390, 1024]) {
  test(`UX05 category HTTP uncertainty retains draft and original operation at ${width}px`, async ({ page }, info) => {
    const writes: { key?: string; body: { name: string; description: string } }[] = [];
    const errors: string[] = [];
    const items: { id: string; name: string; description: string; entryCount: number }[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/v1/menu/categories?*", route => route.fulfill({ json: { data: items, meta: { page: 1, pageSize: 100, total: items.length, totalPages: 1 } } }));
    await page.route("**/api/v1/menu/categories", route => {
      const body = route.request().postDataJSON();
      writes.push({ key: route.request().headers()["idempotency-key"], body });
      if (writes.length === 1) return route.abort("timedout");
      const created = { id: "ux05-created", ...body, entryCount: 0 };
      items.push(created);
      return route.fulfill({ status: 201, headers: { ETag: '"ux05-created-v1"' }, json: { data: created } });
    });
    await page.goto("/categories");
    await page.getByRole("button", { name: "Nueva categoría", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Crear categoría", exact: true });
    const name = dialog.getByRole("textbox", { name: "Nombre", exact: true });
    await name.fill("Categoría con recuperación");
    await dialog.getByRole("textbox", { name: "Descripción", exact: true }).fill("Borrador original");
    await dialog.getByRole("button", { name: "Guardar categoría", exact: true }).click();
    const retry = dialog.getByRole("button", { name: "Reintentar", exact: true });
    await expect(retry).toBeVisible();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(name).toHaveValue("Categoría con recuperación");
    await expect(dialog.getByRole("textbox", { name: "Descripción", exact: true })).toHaveValue("Borrador original");
    expect(writes).toHaveLength(1);
    expect(writes[0].key).toBeTruthy();
    await page.screenshot({ path: info.outputPath("category-recovery.png") });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Categoría con recuperación", exact: true })).toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[1]).toEqual(writes[0]);
    expect(errors).toEqual([]);
    const path = info.outputPath("category-recovery.json");
    await writeFile(path, JSON.stringify({ environment: "production build with controlled HTTP fixtures, not a live backend", viewport: width, writes, errors }, null, 2));
    await info.attach("category-recovery", { path, contentType: "application/json" });
  });
}
