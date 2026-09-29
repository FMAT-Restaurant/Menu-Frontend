import { expect, test } from "@playwright/test";

test("opens the menu route", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Menú" })).toBeVisible();

  await page.getByRole("link", { name: "Ver menú" }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByText("La carta se conectará al catálogo del restaurante.")).toBeVisible();
});
