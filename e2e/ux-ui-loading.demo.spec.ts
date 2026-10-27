import { expect, test } from "@playwright/test";

// Hold only repository reads. The real demo routes, components and CSS still run.
const delayedRepository = `
export function createDemoRepository() {
  const repository = createImmediateDemoRepository();
  return new Proxy(repository, {
    get(target, key) {
      const method = target[key];
      if (typeof method !== "function" || !/^(list|get)/.test(String(key))) return method;
      return async (...args) => {
        await window.__releaseLoadingData;
        return method.apply(target, args);
      };
    }
  });
}`;

const views = [
  { name: "entries", path: "/", title: "Entradas del menú", skeleton: "entries", ready: ".entry-card h2", staticText: "Nueva entrada" },
  { name: "categories", path: "/categories", title: "Catálogo de categorías", skeleton: "category-rows", ready: ".category-row h3", staticText: "Nueva categoría" },
  { name: "recipes", path: "/recipes", title: "Biblioteca de recetas", skeleton: "recipe-rows", ready: ".recipe-card h3", staticText: "Nueva receta" },
  { name: "offers", path: "/entries/demo-entry-burger/offers", title: /Ofertas de/, skeleton: "offers", ready: ".offer-card h2", staticText: "Nueva oferta" },
  { name: "entry-edit", path: "/entries/demo-entry-burger/edit", title: "Editar entrada", skeleton: null, ready: "#entry-brandName", staticText: "Identidad de la entrada" },
  { name: "entry-new", path: "/entries/new", title: "Nueva entrada", skeleton: null, ready: "#entry-brandName", staticText: "Identidad de la entrada" },
  { name: "offer-edit", path: "/entries/demo-entry-burger/offers/demo-offer-burger/edit", title: "Editar oferta", skeleton: null, ready: "#offer-tag-input", staticText: "1. Información comercial" },
  { name: "offer-new", path: "/entries/demo-entry-burger/offers/new", title: "Nueva oferta", skeleton: null, ready: "#offer-tag-input", staticText: "1. Información comercial" },
] as const;

for (const width of [390, 1280]) {
  for (const view of views) {
    test(`local loading preserves ${view.name} structure at ${width}px`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        const state = window as typeof window & { __releaseLoadingData: Promise<void>; __finishLoadingData: () => void };
        state.__releaseLoadingData = new Promise<void>(resolve => { state.__finishLoadingData = resolve; });
      });
      await page.route("**/src/demo/repository.ts", async route => {
        const response = await route.fetch();
        const source = await response.text();
        expect(source).toContain("export function createDemoRepository()");
        await route.fulfill({ response, body: source.replace("export function createDemoRepository()", "function createImmediateDemoRepository()") + delayedRepository });
      });
      await page.goto(view.path);
      await expect(page.getByRole("heading", { level: 1, name: view.title })).toBeVisible();
      await expect(page.getByText(view.staticText, { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Cargando página…", { exact: true })).toHaveCount(0);
      if (view.skeleton) {
        await expect(page.locator(`[data-loading-state="${view.skeleton}"]`)).toBeVisible();
        await expect(page.locator(".menu-loading button, .menu-loading input, .menu-loading a")).toHaveCount(0);
      } else {
        if (view.name === "entry-new") {
          await expect(page.getByLabel("Nombre comercial", { exact: true })).toBeEnabled();
          await expect(page.locator(".loading-value")).toHaveCount(0);
        } else {
          await expect(page.getByRole("button", { name: /Guardar (entrada|Oferta|cambios)/ })).toBeDisabled();
          if (view.name !== "offer-new") await expect(page.locator(".loading-value--image")).toBeVisible();
        }
        if (view.name.startsWith("offer")) {
          await expect(page.getByRole("heading", { name: "2. Composición" })).toBeVisible();
          await expect(page.getByRole("button", { name: "Agregar grupo", exact: true })).toBeDisabled();
          if (view.name === "offer-edit") await expect(page.getByRole("alert")).toHaveCount(0);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: info.outputPath(`${view.name}-${width}-loading.png`), fullPage: true });
      await page.evaluate(() => (window as typeof window & { __finishLoadingData: () => void }).__finishLoadingData());
      await expect(page.locator(view.ready).first()).toBeVisible();
      await expect(page.locator(".menu-loading, .loading-value")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: info.outputPath(`${view.name}-${width}-loaded.png`), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}
