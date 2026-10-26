import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

for (const status of [409, 503]) {
  test(`UX14 category ${status} explains the next action without automatic resubmission`, async ({ page }, info) => {
    const writes: { body: unknown; key: string | undefined }[] = [];
    const errors: string[] = [];
    const items: { id: string; name: string; description: string; entryCount: number }[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/v1/menu/categories?*", route => route.fulfill({ json: { data: items, meta: { page: 1, pageSize: 100, total: items.length, totalPages: 1 } } }));
    await page.route("**/api/v1/menu/categories", async route => {
      const body = route.request().postDataJSON();
      writes.push({ body, key: route.request().headers()["idempotency-key"] });
      if (writes.length === 1) return route.fulfill({ status, json: { error: { message: status === 409 ? "La clave de idempotencia ya fue utilizada." : "Servicio no disponible.", details: { code: status === 409 ? "IDEMPOTENCY_KEY_REUSED" : "SERVICE_UNAVAILABLE" } } } });
      const created = { id: "ux14-category", ...body, entryCount: 0 };
      items.push(created);
      return route.fulfill({ status: 201, headers: { ETag: '"ux14-v1"' }, json: { data: created } });
    });
    await page.goto("/categories");
    await page.getByRole("button", { name: "Nueva categoría", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Crear categoría", exact: true });
    await dialog.getByLabel("Nombre", { exact: true }).fill("Categoría UX14");
    await dialog.getByLabel("Descripción", { exact: true }).fill("Datos conservados");
    await dialog.getByRole("button", { name: "Guardar categoría", exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(writes).toHaveLength(1);
    await expect(dialog.getByLabel("Nombre", { exact: true })).toHaveValue("Categoría UX14");
    if (status === 409) {
      await expect(dialog.getByRole("alert")).toContainText("Este envío fue rechazado y no puede repetirse como está.");
      await expect(dialog.getByRole("alert")).not.toContainText("idempotencia");
    } else {
      await expect(dialog.getByRole("alert")).toContainText("No sabemos si se creó la categoría.");
      await expect(dialog.getByRole("alert")).toContainText("Reintentar recupera el mismo envío");
      await expect(dialog.getByRole("alert")).toContainText("No reintentaremos automáticamente.");
      await expect(dialog.getByRole("alert")).not.toContainText("No se pudo guardar la categoría");
    }
    const before = info.outputPath(`category-${status}.png`);
    await page.screenshot({ path: before });
    await info.attach("recovery", { path: before, contentType: "image/png" });
    if (status === 409) {
      await dialog.getByRole("button", { name: "Iniciar nueva operación", exact: true }).click();
      expect(writes).toHaveLength(1);
      await dialog.getByRole("button", { name: "Guardar categoría", exact: true }).click();
    } else {
      await dialog.getByRole("button", { name: "Reintentar", exact: true }).click();
    }
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Categoría UX14", exact: true })).toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[0].key).toBeTruthy();
    expect(writes[1].body).toEqual(writes[0].body);
    if (status === 409) expect(writes[1].key).not.toBe(writes[0].key);
    else expect(writes[1].key).toBe(writes[0].key);
    expect(errors).toEqual([]);
    const json = info.outputPath(`category-${status}.json`);
    await writeFile(json, JSON.stringify({ environment: "controlled HTTP fixtures, not a live backend", status, writes, errors }, null, 2));
    await info.attach("contract", { path: json, contentType: "application/json" });
  });
}
