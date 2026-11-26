import { expect, test } from "@playwright/test";

test("demo query permissions open the read-only menu and display available and unavailable examples", async ({ page }) => {
  await page.goto("/?permissions=menu%3Acatalog%3Aread");

  await expect(page).toHaveTitle(/^\[DEMO\]/);
  await expect(page.getByRole("heading", { name: "Menú", level: 1 })).toBeVisible();
  const burger = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Hamburguesa clásica" }) });
  const lemonade = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Limonada natural" }) });
  await expect(burger).toBeVisible();
  await expect(burger).not.toContainText("No disponible");
  await expect(lemonade).toContainText("No disponible");
  await expect(page.getByRole("link", { name: /Nueva entrada|Categorías|Biblioteca de recetas/ })).toHaveCount(0);
});

test("demo permission query selects management access or denies an empty set", async ({ page }) => {
  await page.goto("/?permissions=menu%3Aentries%3Aread");
  await expect(page.getByRole("heading", { name: "Entradas del menú", level: 1 })).toBeVisible();
  await page.goto("/?permissions=");
  await expect(page.getByRole("heading", { name: "Sin acceso", level: 1 })).toBeVisible();
});
