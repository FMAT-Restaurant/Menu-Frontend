import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("creates and edits an entry with separate image upload and JSON writes", async ({ page }) => {
  const imageBytes = readFileSync(resolve(process.cwd(), "mockups/renders/V2-crear-editar-entrada.png"));
  const requests: { method: string; url: string; body: string }[] = [];
  let detailReads = 0;
  await page.route("**/image-1", (route) => route.fulfill({ contentType: "image/png", body: imageBytes }));

  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({
    json: {
      data: [{ id: "category-1", name: "Principales", description: "" }],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
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
  await page.route("**/api/v1/media/images", async (route) => {
    const request = route.request();
    requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
    await route.fulfill({ status: 201, json: { data: { id: "image-1" } } });
  });
  await page.route("**/api/v1/menu/entries", async (route) => {
    const request = route.request();
    requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
    await route.fulfill({
      status: 201,
      json: {
        data: {
          id: "entry-1", brandName: "Bowl de pollo", description: "Pollo con arroz.",
          image: { id: "image-1", url: "/image-1", thumbnailUrl: "/image-1" }, status: "INACTIVE", categoryIds: ["category-1"],
        },
      },
    });
  });
  await page.route("**/api/v1/menu/entries/entry-1", async (route) => {
    if (route.request().method() === "GET") {
      detailReads += 1;
      await route.fulfill({
        headers: { ETag: '"rev-3"' },
        json: {
          data: {
            id: "entry-1", brandName: "Bowl de pollo", description: "Pollo con arroz.",
            image: { id: "image-1", url: "/image-1", thumbnailUrl: "/image-1" }, status: "INACTIVE", categoryIds: ["category-1"],
          },
        },
      });
      return;
    }
    const request = route.request();
    expect(request.headers()["if-match"]).toBe('"rev-3"');
    requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
    await route.fulfill({
      json: {
        data: {
          id: "entry-1", brandName: "Bowl especial", description: "Con vegetales.",
          image: { id: "image-1", url: "/image-1", thumbnailUrl: "/image-1" }, status: "INACTIVE", categoryIds: ["category-1"],
        },
      },
    });
  });

  await page.goto("/?q=bowl&status=INACTIVE");
  await page.getByRole("link", { name: "Nueva entrada" }).click();
  await expect(page).toHaveURL(/\/entries\/new$/);
  await page.getByLabel("Nombre comercial").fill("Bowl de pollo");
  await page.getByLabel("Descripción").fill("Pollo con arroz.");
  await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  await page.getByRole("checkbox", { name: "Principales" }).check();
  await page.getByLabel("Archivo de imagen").setInputFiles({
    name: "bowl.png", mimeType: "image/png", buffer: imageBytes,
  });
  await expect(page.getByRole("button", { name: "Guardar entrada" })).toBeEnabled();
  await page.getByRole("button", { name: "Guardar entrada" }).click();
  await expect(page).toHaveURL(/\/?q=bowl&status=INACTIVE$/);
  await expect(page.getByRole("heading", { name: "Bowl de pollo" })).toBeVisible();

  expect(requests[0].method).toBe("POST");
  expect(requests[0].url).toContain("/media/images");
  expect(requests[0].body).toContain('name="file"');
  expect(requests[0].body).toContain("bowl.png");
  expect(requests[1].url).toContain("/menu/entries");
  expect(JSON.parse(requests[1].body)).toEqual({
    brandName: "Bowl de pollo", description: "Pollo con arroz.", categoryIds: ["category-1"], imageId: "image-1",
  });

  await page.getByRole("link", { name: "Editar Bowl de pollo" }).click();
  await expect(page.getByRole("img", { name: "Vista previa de la imagen de la entrada" })).toBeVisible();
  await expect(page.getByText("Si no seleccionas otra imagen, se conservará la actual.")).toBeVisible();
  await page.getByLabel("Descripción").fill("Con vegetales.");
  const readsBeforeSave = detailReads;
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(/\/?q=bowl&status=INACTIVE$/);

  expect(requests[2]).toMatchObject({ method: "PATCH" });
  expect(detailReads).toBe(readsBeforeSave);
  expect(requests[2].body).toBe(JSON.stringify({
    brandName: "Bowl de pollo", description: "Con vegetales.", categoryIds: ["category-1"], status: "INACTIVE",
  }));
});
