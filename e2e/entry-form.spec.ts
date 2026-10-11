import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("creates and edits an entry with the documented multipart contract", async ({ page }) => {
  const imageBytes = readFileSync(resolve(process.cwd(), "mockups/renders/V2-crear-editar-entrada.png"));
  const requests: { method: string; url: string; body: string }[] = [];

  await page.route("**/api/v1/menus/1/categories?*", (route) => route.fulfill({
    json: {
      items: [{ id: "category-1", menuId: "1", name: "Principales", description: "" }],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    },
  }));
  await page.route("**/api/v1/menu/entries?*", (route) => route.fulfill({
    json: {
      data: [{
        id: "entry-1", brandName: "Bowl de pollo", description: "Pollo con arroz.", status: "INACTIVE",
        image: null, categories: [{ id: "category-1", name: "Principales" }], offerCount: 0,
      }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    },
  }));
  await page.route("**/api/v1/menus/1/entries", async (route) => {
    const request = route.request();
    requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
    await route.fulfill({
      status: 201,
      json: {
        id: "entry-1", menuId: "1", brandName: "Bowl de pollo", description: "Pollo con arroz.",
        imageRef: "image-1", status: "INACTIVE", categoryIds: ["category-1"], offers: [],
      },
    });
  });
  await page.route("**/api/v1/menus/1/entries/entry-1", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          id: "entry-1", menuId: "1", brandName: "Bowl de pollo", description: "Pollo con arroz.",
          imageRef: "image-1", status: "INACTIVE", categoryIds: ["category-1"], offers: [],
        },
      });
      return;
    }
    const request = route.request();
    requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
    await route.fulfill({
      json: {
        id: "entry-1", menuId: "1", brandName: "Bowl especial", description: "Con vegetales.",
        imageRef: "image-1", status: "INACTIVE", categoryIds: ["category-1"], offers: [],
      },
    });
  });

  await page.goto("/?q=bowl&status=INACTIVE");
  await page.getByRole("link", { name: "Nueva entrada" }).click();
  await expect(page).toHaveURL(/\/entries\/new$/);
  await page.getByLabel("Nombre comercial").fill("Bowl de pollo");
  await page.getByLabel("Descripción").fill("Pollo con arroz.");
  await page.getByRole("checkbox", { name: "Principales" }).check();
  await page.getByLabel("Seleccionar imagen").setInputFiles({
    name: "bowl.png", mimeType: "image/png", buffer: imageBytes,
  });
  await expect(page.getByRole("button", { name: "Guardar entrada" })).toBeEnabled();
  await page.getByRole("button", { name: "Guardar entrada" }).click();
  await expect(page).toHaveURL(/\/?q=bowl&status=INACTIVE$/);
  await expect(page.getByRole("heading", { name: "Bowl de pollo" })).toBeVisible();

  expect(requests[0].method).toBe("POST");
  expect(requests[0].url).toContain("/menus/1/entries");
  expect(requests[0].body).toContain('name="entry"');
  expect(requests[0].body).toContain('"brandName":"Bowl de pollo"');
  expect(requests[0].body).toContain('name="image"');
  expect(requests[0].body).toContain("bowl.png");

  await page.getByRole("link", { name: "Editar Bowl de pollo" }).click();
  await expect(page.getByText(/Imagen actual conservada/)).toBeVisible();
  await page.getByLabel("Descripción").fill("Con vegetales.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(/\/?q=bowl&status=INACTIVE$/);

  expect(requests[1]).toMatchObject({ method: "PATCH" });
  expect(requests[1].body).toBe(JSON.stringify({
    brandName: "Bowl de pollo", description: "Con vegetales.", categoryIds: ["category-1"], status: "INACTIVE",
  }));
});
