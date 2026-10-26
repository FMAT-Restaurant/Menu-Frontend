import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function evidence(page: Page, info: TestInfo, name: string) {
  const data = await page.locator("[data-menu-module]").evaluate(module => ({
    width: module.getBoundingClientRect().width,
    overflow: document.documentElement.scrollWidth > innerWidth,
    visibleText: (module as HTMLElement).innerText,
    modalCount: document.querySelectorAll("dialog[open]:modal").length,
  }));
  const json = info.outputPath(`${name}.json`);
  await writeFile(json, JSON.stringify(data, null, 2));
  await info.attach(name, { path: json, contentType: "application/json" });
  const png = info.outputPath(`${name}.png`);
  await page.screenshot({ path: png, fullPage: true });
  await info.attach(name, { path: png, contentType: "image/png" });
  expect(data.overflow).toBe(false);
}

for (const width of [320, 390, 1024]) {
  test(`UX14 image help and selection rounds stay consistent at ${width}px`, async ({ page }, info) => {
    const api: string[] = []; const errors: string[] = [];
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    const help = "JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px.";
    await page.goto("/entries/new");
    await expect(page.getByRole("heading", { name: "Nueva entrada", exact: true })).toBeVisible();
    await expect(page.getByText(help, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Archivo de imagen", { exact: true })).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    await evidence(page, info, "entry-help");

    await page.goto("/entries/demo-entry-burger/offers/new");
    await expect(page.getByRole("heading", { name: "Nueva oferta", exact: true })).toBeVisible();
    await expect(page.getByText(help, { exact: true })).toBeVisible();
    await expect(page.getByText("La oferta se crea inactiva. Guardar la composición no la activa; podrás solicitar su activación después.", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Activa", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Definir nuevo grupo", exact: true });
    await page.getByLabel("Nombre del grupo", { exact: true }).fill("Principal");
    const rounds = page.getByLabel("Rondas de selección", { exact: true });
    await expect(rounds).toHaveAccessibleDescription("Indica cuántas veces se elige entre las opciones de este grupo.");
    await rounds.fill("0");
    await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Escribe un número entero de rondas de selección, igual o mayor que 1.");
    await evidence(page, info, "rounds-validation");
    await rounds.fill("3");
    await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("article", { name: "Grupo Principal", exact: true }).getByText("3 rondas de selección", { exact: true })).toBeVisible();
    await evidence(page, info, "rounds-summary");
    expect(api).toEqual([]); expect(errors).toEqual([]);
  });
}
