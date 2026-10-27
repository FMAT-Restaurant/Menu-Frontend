import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const routes = [
  ["/", "Entradas del menú"],
  ["/categories", "Catálogo de categorías"],
  ["/recipes", "Biblioteca de recetas"],
  ["/entries/demo-entry-burger/edit", "Editar entrada"],
  ["/entries/demo-entry-burger/offers", "Ofertas de Hamburguesa clásica"],
  ["/entries/demo-entry-burger/offers/demo-offer-burger/edit", "Editar oferta"],
];

for (const [path, title] of routes) {
test(`UX17 external controls keep their own styles at ${path}`, async ({ page }, info) => {
  const api: string[] = [];
  const errors: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
    await page.goto(path);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator("[data-menu-module] .button").first()).toBeVisible();
    const result = await page.evaluate(() => {
      const host = document.createElement("section");
      host.dataset.uxHost = "";
      host.setAttribute("aria-label", "Controles externos de prueba");
      const style = document.createElement("style");
      // Zero specificity lets any leaked feature class override the host's rules.
      style.textContent = `:where([data-ux-host]) { --border: #123456; --surface: #f0f1f2; --radius-card: 13px; --control-height: 37px; font-family: serif; }
        :where([data-ux-host] > div) { display: block; position: static; padding: 3px; margin: 2px; border: 0; gap: 0; box-shadow: none; }`;
      const classes = ["modal-header", "modal-body", "modal-footer", "form-row", "filters", "category-row", "entry-form", "recipe-card"];
      for (const name of classes) {
        const element = document.createElement("div");
        element.className = name;
        element.textContent = `Control externo: ${name}`;
        host.append(element);
      }
      document.head.append(style);
      document.body.prepend(host);
      const external = [...host.children].map(element => {
        const computed = getComputedStyle(element);
        return { className: element.className, display: computed.display, position: computed.position,
          padding: computed.padding, border: computed.borderTopWidth, gap: computed.rowGap };
      });
      const internal = document.querySelector<HTMLElement>("[data-menu-module] .button");
      return { path: location.pathname, external, internalControlHeight: internal?.getBoundingClientRect().height ?? 0,
        moduleWidth: document.querySelector("[data-menu-module]")?.getBoundingClientRect().width,
        environment: "controlled external DOM fixture; not the real shell" };
    });
    await page.screenshot({ path: info.outputPath("external-controls.png"), fullPage: true });
  const json = info.outputPath("external-controls.json");
  await writeFile(json, JSON.stringify({ result, api, errors }, null, 2));
  await info.attach("external-controls", { path: json, contentType: "application/json" });
    expect(result.internalControlHeight, result.path).toBeGreaterThanOrEqual(40);
    for (const control of result.external) {
      expect(control, `${result.path}: ${control.className}`).toMatchObject({ display: "block", position: "static", padding: "3px", border: "0px", gap: "0px" });
    }
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
});
}
