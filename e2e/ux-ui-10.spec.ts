import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

for (const status of [422, 503]) {
test(`UX10 creation HTTP ${status} preserves option and controls manual recovery in one modal`, async ({ page }, info) => {
  const posts: Array<{ key?: string; body: unknown }> = [];
  const offerPosts: string[] = [];
  page.on("request", request => {
    if (request.method() === "POST" && request.url().includes("/offers")) offerPosts.push(request.url());
  });
  await page.route("**/api/v1/menu/entries/entry-ux10", route => route.fulfill({ json: { data: { id: "entry-ux10", brandName: "Entrada UX10", description: "Contrato", status: "ACTIVE", categoryIds: [] } } }));
  await page.route("**/api/v1/menu/recipes?*", route => {
    const query = new URL(route.request().url());
    return route.fulfill({ json: { data: [{ id: "existing", name: "Receta existente", description: "Base", supplies: [] }], meta: { page: Number(query.searchParams.get("page") || 1), pageSize: 50, total: 51, totalPages: 2 } } });
  });
  await page.route("**/api/v1/inventory/items?*", route => route.fulfill({ json: { data: [{ id: "flour", name: "Harina", unit: "kg" }], meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/recipes", async route => {
    posts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postDataJSON() });
    if (posts.length === 1) return route.fulfill({ status, json: { message: "No se pudo guardar la receta" } });
    return route.fulfill({ status: 201, headers: { ETag: '"ux10-v1"' }, json: { data: { id: "created-ux10", ...route.request().postDataJSON() } } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/entries/entry-ux10/offers/new");
  await page.getByLabel("Precio base").fill("195");
  await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
  await page.getByLabel("Nombre del grupo").fill("Principal");
  await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
  await page.getByRole("button", { name: "Agregar opción a Principal", exact: true }).click();
  await page.getByLabel("Nombre mostrado (opcional)").fill("Etiqueta conservada");
  await page.getByRole("button", { name: /^Elegir receta/ }).click();
  await page.getByLabel("Buscar recetas").fill("Base");
  await page.getByRole("button", { name: "Buscar ahora", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente página", exact: true }).click();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Nueva UX10");
  await page.getByLabel("Descripción", { exact: true }).fill("Descripción UX10");
  await page.getByLabel("Instrucciones", { exact: true }).fill("Mezclar");
  await page.getByLabel("Insumo 1", { exact: true }).selectOption("flour");
  await page.getByLabel("Cantidad del insumo 1", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Guardar receta", exact: true }).click();
  const retry = page.getByRole("button", { name: status === 422 ? "Guardar receta" : "Reintentar", exact: true });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(retry).toBeEnabled();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Nueva UX10");
  expect(posts).toHaveLength(1);
  const rejected = info.outputPath("rejected.png");
  await page.screenshot({ path: rejected, fullPage: true });
  await info.attach("rejected", { path: rejected, contentType: "image/png" });
  await retry.click();
  await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Etiqueta conservada");
  await expect(page.getByText("Receta asignada: Nueva UX10")).toBeVisible();
  expect(posts).toHaveLength(2);
  expect(posts[0].key).toBeTruthy();
  expect(posts[1].body).toEqual(posts[0].body);
  if (status === 422) expect(posts[1].key).not.toBe(posts[0].key);
  else expect(posts[1].key).toBe(posts[0].key);
  expect(offerPosts).toEqual([]);
  await page.getByRole("button", { name: "Guardar opción", exact: true }).click();
  await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  const json = info.outputPath("http-contract.json");
  await writeFile(json, JSON.stringify({ posts, offerPosts, finalModalCount: await page.locator("dialog[open]:modal").count() }, null, 2));
  await info.attach("http-contract", { path: json, contentType: "application/json" });
});
}

test("UX10 pending recipe keeps one modal through repeated Escape after submit disables its trigger", async ({ page }, info) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>(resolve => { releaseResponse = resolve; });
  const posts: Array<{ key?: string; body: unknown }> = [];
  await page.route("**/api/v1/menu/entries/entry-ux10", route => route.fulfill({ json: { data: { id: "entry-ux10", brandName: "Entrada UX10", description: "Contrato", status: "ACTIVE", categoryIds: [] } } }));
  await page.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 1 } } }));
  await page.route("**/api/v1/inventory/items?*", route => route.fulfill({ json: { data: [{ id: "flour", name: "Harina", unit: "kg" }], meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
  await page.route("**/api/v1/menu/recipes", async route => {
    posts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postDataJSON() });
    await responseGate;
    await route.fulfill({ status: 201, headers: { ETag: '"pending-v1"' }, json: { data: { id: "pending-created", ...route.request().postDataJSON() } } });
  });
  try {
    await page.goto("/entries/entry-ux10/offers/new");
    await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
    await page.getByLabel("Nombre del grupo").fill("Principal");
    await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
    await page.getByRole("button", { name: "Agregar opción a Principal", exact: true }).click();
    await page.getByLabel("Nombre mostrado (opcional)").fill("Opción pendiente");
    await page.getByRole("button", { name: /^Elegir receta/ }).click();
    await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Receta pendiente");
    await page.getByLabel("Descripción", { exact: true }).fill("Respuesta controlada");
    await page.getByLabel("Instrucciones", { exact: true }).fill("Mezclar");
    await page.getByLabel("Insumo 1", { exact: true }).selectOption("flour");
    await page.getByLabel("Cantidad del insumo 1", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Guardar receta", exact: true }).click();
    await expect.poll(() => posts.length).toBe(1);
    const states: unknown[] = [];
    for (let index = 0; index < 2; index += 1) {
      await page.keyboard.press("Escape");
      states.push(await page.evaluate(() => ({ modalCount: document.querySelectorAll("dialog[open]:modal").length, focus: document.activeElement?.tagName, bodyPosition: getComputedStyle(document.body).position })));
      const json = info.outputPath("pending-escape.json");
      await writeFile(json, JSON.stringify({ states, posts }, null, 2));
      await info.attach(`pending-escape-${index}`, { path: json, contentType: "application/json" });
      await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
      await expect(page.getByRole("dialog", { name: "Nueva receta", exact: true })).toBeVisible();
      expect(posts).toHaveLength(1);
    }
    const png = info.outputPath("pending-escape.png");
    await page.screenshot({ path: png, fullPage: true });
    await info.attach("pending-escape", { path: png, contentType: "image/png" });
    releaseResponse();
    await expect(page.getByText("Receta asignada: Receta pendiente")).toBeVisible();
    await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Opción pendiente");
    expect(posts).toHaveLength(1);
    await page.getByRole("button", { name: "Guardar opción", exact: true }).click();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  } finally {
    releaseResponse();
  }
});
