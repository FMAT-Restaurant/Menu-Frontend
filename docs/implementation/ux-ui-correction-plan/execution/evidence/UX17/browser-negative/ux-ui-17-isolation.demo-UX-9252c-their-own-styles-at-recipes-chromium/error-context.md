# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-17-isolation.demo.spec.ts >> UX17 external controls keep their own styles at /recipes
- Location: e2e\ux-ui-17-isolation.demo.spec.ts:14:1

# Error details

```
Error: /recipes: recipe-card

expect(received).toMatchObject(expected)

- Expected  - 2
+ Received  + 2

  Object {
-   "border": "0px",
+   "border": "1px",
    "display": "block",
    "gap": "0px",
-   "padding": "3px",
+   "padding": "20px",
    "position": "static",
  }
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - region "Controles externos de prueba" [ref=e2]:
    - generic [ref=e3]: "Control externo: modal-header"
    - generic [ref=e4]: "Control externo: modal-body"
    - generic [ref=e5]: "Control externo: modal-footer"
    - generic [ref=e6]: "Control externo: form-row"
    - generic [ref=e7]: "Control externo: filters"
    - generic [ref=e8]: "Control externo: category-row"
    - generic [ref=e9]: "Control externo: entry-form"
    - generic [ref=e10]: "Control externo: recipe-card"
  - main [ref=e14]:
    - generic [ref=e15]:
      - link "Volver al menú" [ref=e16] [cursor=pointer]:
        - /url: /
      - generic [ref=e17]:
        - generic [ref=e18]:
          - heading "Biblioteca de recetas" [active] [level=1] [ref=e19]
          - paragraph [ref=e20]: Consulta y administra las recetas base y sus insumos.
        - button "+ Nueva receta" [ref=e21] [cursor=pointer]: Nueva receta
    - region "Biblioteca de recetas" [ref=e24]:
      - search [ref=e26]:
        - generic [ref=e27]: Buscar recetas
        - generic [ref=e28]:
          - searchbox "Buscar recetas" [ref=e33]
          - button "Buscar ahora" [ref=e34] [cursor=pointer]: Buscar
      - list [ref=e35]:
        - listitem [ref=e36]:
          - article [ref=e37]:
            - generic [ref=e38]:
              - generic [ref=e39]:
                - heading "Hamburguesa de res" [level=3] [ref=e40]
                - paragraph [ref=e41]: Preparación base de la hamburguesa clásica.
              - generic [ref=e42]:
                - button "Editar Hamburguesa de res" [ref=e43] [cursor=pointer]: Editar
                - button "Eliminar Hamburguesa de res" [ref=e44] [cursor=pointer]: Eliminar
            - paragraph [ref=e46]:
              - strong [ref=e47]: "Insumos:"
              - text: Carne de res (180 g), Pan brioche (1 pza), Queso cheddar (30 g)
        - listitem [ref=e48]:
          - article [ref=e49]:
            - generic [ref=e50]:
              - generic [ref=e51]:
                - heading "Limonada de la casa" [level=3] [ref=e52]
                - paragraph [ref=e53]: Bebida preparada al momento.
              - generic [ref=e54]:
                - button "Editar Limonada de la casa" [ref=e55] [cursor=pointer]: Editar
                - button "Eliminar Limonada de la casa" [ref=e56] [cursor=pointer]: Eliminar
            - paragraph [ref=e58]:
              - strong [ref=e59]: "Insumos:"
              - text: Jugo de limón (60 ml), Agua mineral (300 ml)
        - listitem [ref=e60]:
          - article [ref=e61]:
            - generic [ref=e62]:
              - generic [ref=e63]:
                - heading "Brownie artesanal" [level=3] [ref=e64]
                - paragraph [ref=e65]: Base de chocolate para el postre.
              - generic [ref=e66]:
                - button "Editar Brownie artesanal" [ref=e67] [cursor=pointer]: Editar
                - button "Eliminar Brownie artesanal" [ref=e68] [cursor=pointer]: Eliminar
            - paragraph [ref=e70]:
              - strong [ref=e71]: "Insumos:"
              - text: Chocolate (80 g)
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { writeFile } from "node:fs/promises";
  3  | 
  4  | const routes = [
  5  |   ["/", "Entradas del menú"],
  6  |   ["/categories", "Catálogo de categorías"],
  7  |   ["/recipes", "Biblioteca de recetas"],
  8  |   ["/entries/demo-entry-burger/edit", "Editar entrada"],
  9  |   ["/entries/demo-entry-burger/offers", "Ofertas de Hamburguesa clásica"],
  10 |   ["/entries/demo-entry-burger/offers/demo-offer-burger/edit", "Editar oferta"],
  11 | ];
  12 | 
  13 | for (const [path, title] of routes) {
  14 | test(`UX17 external controls keep their own styles at ${path}`, async ({ page }, info) => {
  15 |   const api: string[] = [];
  16 |   const errors: string[] = [];
  17 |   page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  18 |   page.on("pageerror", error => errors.push(error.message));
  19 |     await page.goto(path);
  20 |     await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  21 |     await expect(page.locator("[data-menu-module] .button").first()).toBeVisible();
  22 |     const result = await page.evaluate(() => {
  23 |       const host = document.createElement("section");
  24 |       host.dataset.uxHost = "";
  25 |       host.setAttribute("aria-label", "Controles externos de prueba");
  26 |       const style = document.createElement("style");
  27 |       // Zero specificity lets any leaked feature class override the host's rules.
  28 |       style.textContent = `:where([data-ux-host]) { --border: #123456; --surface: #f0f1f2; --radius-card: 13px; --control-height: 37px; font-family: serif; }
  29 |         :where([data-ux-host] > div) { display: block; position: static; padding: 3px; margin: 2px; border: 0; gap: 0; box-shadow: none; }`;
  30 |       const classes = ["modal-header", "modal-body", "modal-footer", "form-row", "filters", "category-row", "entry-form", "recipe-card"];
  31 |       for (const name of classes) {
  32 |         const element = document.createElement("div");
  33 |         element.className = name;
  34 |         element.textContent = `Control externo: ${name}`;
  35 |         host.append(element);
  36 |       }
  37 |       document.head.append(style);
  38 |       document.body.prepend(host);
  39 |       const external = [...host.children].map(element => {
  40 |         const computed = getComputedStyle(element);
  41 |         return { className: element.className, display: computed.display, position: computed.position,
  42 |           padding: computed.padding, border: computed.borderTopWidth, gap: computed.rowGap };
  43 |       });
  44 |       const internal = document.querySelector<HTMLElement>("[data-menu-module] .button");
  45 |       return { path: location.pathname, external, internalControlHeight: internal?.getBoundingClientRect().height ?? 0,
  46 |         moduleWidth: document.querySelector("[data-menu-module]")?.getBoundingClientRect().width,
  47 |         environment: "controlled external DOM fixture; not the real shell" };
  48 |     });
  49 |     await page.screenshot({ path: info.outputPath("external-controls.png"), fullPage: true });
  50 |   const json = info.outputPath("external-controls.json");
  51 |   await writeFile(json, JSON.stringify({ result, api, errors }, null, 2));
  52 |   await info.attach("external-controls", { path: json, contentType: "application/json" });
  53 |     expect(result.internalControlHeight, result.path).toBeGreaterThanOrEqual(40);
  54 |     for (const control of result.external) {
> 55 |       expect(control, `${result.path}: ${control.className}`).toMatchObject({ display: "block", position: "static", padding: "3px", border: "0px", gap: "0px" });
     |                                                               ^ Error: /recipes: recipe-card
  56 |     }
  57 |   expect(api).toEqual([]);
  58 |   expect(errors).toEqual([]);
  59 | });
  60 | }
  61 | 
```