import { expect, test } from "@playwright/test";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const deniedToken = `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions: [] })}.signature`;

const protectedRoutes = [
  ["/categories", "menu:categories:read"],
  ["/recipes", "menu:recipes:read"],
  ["/entries/entry-1/offers", "menu:offers:read"],
  ["/entries/entry-1/offers/new", "menu:offers:read"],
  ["/entries/entry-1/offers/offer-1/edit", "menu:offers:read"],
  ["/entries/new", "menu:entries:write"],
  ["/entries/entry-1/edit", "menu:entries:write"],
] as const;

for (const [path, permission] of protectedRoutes) {
  test(`blocks ${path} without ${permission} and makes no API request`, async ({ page }) => {
    const apiRequests: string[] = [];
    await page.addInitScript((token) => {
      localStorage.setItem("fmat_restaurant_auth_session", JSON.stringify({ accessToken: token }));
    }, deniedToken);
    await page.route("**/api/**", async (route) => {
      apiRequests.push(route.request().url());
      await route.abort();
    });

    await page.goto(path);

    await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
    expect(apiRequests).toEqual([]);
  });
}
