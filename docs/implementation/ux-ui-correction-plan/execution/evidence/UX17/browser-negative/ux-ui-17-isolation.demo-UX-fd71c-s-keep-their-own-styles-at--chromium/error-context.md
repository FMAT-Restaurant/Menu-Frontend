# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-17-isolation.demo.spec.ts >> UX17 external controls keep their own styles at /
- Location: e2e\ux-ui-17-isolation.demo.spec.ts:14:1

# Error details

```
Error: /: filters

expect(received).toMatchObject(expected)

- Expected  - 4
+ Received  + 4

  Object {
-   "border": "0px",
-   "display": "block",
-   "gap": "0px",
-   "padding": "3px",
+   "border": "1px",
+   "display": "grid",
+   "gap": "12px",
+   "padding": "16px",
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
    - generic [ref=e16]:
      - heading "Entradas del menú" [active] [level=1] [ref=e18]
      - generic [ref=e19]:
        - link "Biblioteca de recetas" [ref=e20] [cursor=pointer]:
          - /url: /recipes
        - link "Categorías" [ref=e21] [cursor=pointer]:
          - /url: /categories
        - link "Nueva entrada" [ref=e22] [cursor=pointer]:
          - /url: /entries/new
    - region "Filtros de entradas" [ref=e23]:
      - search [ref=e24]:
        - generic [ref=e25]: Buscar entradas
        - generic [ref=e26]:
          - searchbox "Buscar entradas" [ref=e31]
          - button "Buscar ahora" [ref=e32] [cursor=pointer]: Buscar
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]: Categoría
          - combobox "Categoría" [ref=e36]:
            - option "Todas las categorías" [selected]
            - option "Sin categoría"
            - option "Platos fuertes"
            - option "Bebidas"
            - option "Postres"
        - generic [ref=e37]:
          - generic [ref=e38]: Estado administrativo
          - combobox "Estado administrativo" [ref=e39]:
            - option "Todos los estados" [selected]
            - option "Activa"
            - option "Inactiva"
            - option "Archivada"
      - button "Limpiar filtros" [disabled] [ref=e40]
    - generic [ref=e41]:
      - paragraph [ref=e43]: Mostrando 1–4 de 4 entradas
      - generic [ref=e44]:
        - generic [ref=e45]: Entradas por página
        - combobox "Entradas por página" [ref=e46]:
          - option "6"
          - option "12" [selected]
          - option "24"
    - generic "Entradas administrativas" [ref=e48]:
      - article [ref=e49]:
        - generic [ref=e50]:
          - img "Imagen de Hamburguesa clásica" [ref=e51]
          - generic [ref=e52]: Activa
        - generic [ref=e54]:
          - heading "Hamburguesa clásica" [level=2] [ref=e55]
          - paragraph [ref=e56]: Carne de res, queso cheddar y pan brioche.
          - generic "Categorías" [ref=e57]: Platos fuertes
          - generic [ref=e59]:
            - generic [ref=e60]:
              - text: "Estado:"
              - strong [ref=e61]: Activa
            - generic [ref=e62]:
              - text: "Ofertas:"
              - strong [ref=e63]: "2"
          - generic [ref=e64]:
            - link "Ver ofertas de Hamburguesa clásica" [ref=e65] [cursor=pointer]:
              - /url: /entries/demo-entry-burger/offers
              - text: Ver ofertas
            - link "Editar Hamburguesa clásica" [ref=e66] [cursor=pointer]:
              - /url: /entries/demo-entry-burger/edit
              - text: Editar
          - generic [ref=e67]:
            - button "Eliminar definitivamente Hamburguesa clásica" [disabled] [ref=e68]: Eliminar
            - paragraph [ref=e69]: Solo se pueden eliminar entradas archivadas.
      - article [ref=e70]:
        - generic [ref=e71]:
          - img "Imagen de Limonada natural" [ref=e72]
          - generic [ref=e73]: Activa
        - generic [ref=e75]:
          - heading "Limonada natural" [level=2] [ref=e76]
          - paragraph [ref=e77]: Jugo de limón recién exprimido con agua mineral.
          - generic "Categorías" [ref=e78]: Bebidas
          - generic [ref=e80]:
            - generic [ref=e81]:
              - text: "Estado:"
              - strong [ref=e82]: Activa
            - generic [ref=e83]:
              - text: "Ofertas:"
              - strong [ref=e84]: "1"
          - generic [ref=e85]:
            - link "Ver ofertas de Limonada natural" [ref=e86] [cursor=pointer]:
              - /url: /entries/demo-entry-lemonade/offers
              - text: Ver ofertas
            - link "Editar Limonada natural" [ref=e87] [cursor=pointer]:
              - /url: /entries/demo-entry-lemonade/edit
              - text: Editar
          - generic [ref=e88]:
            - button "Eliminar definitivamente Limonada natural" [disabled] [ref=e89]: Eliminar
            - paragraph [ref=e90]: Solo se pueden eliminar entradas archivadas.
      - article [ref=e91]:
        - generic [ref=e92]:
          - img "Imagen de Brownie de chocolate" [ref=e93]
          - generic [ref=e94]: Inactiva
        - generic [ref=e96]:
          - heading "Brownie de chocolate" [level=2] [ref=e97]
          - paragraph [ref=e98]: Brownie tibio con una porción de helado.
          - generic "Categorías" [ref=e99]: Postres
          - generic [ref=e101]:
            - generic [ref=e102]:
              - text: "Estado:"
              - strong [ref=e103]: Inactiva
            - generic [ref=e104]:
              - text: "Ofertas:"
              - strong [ref=e105]: "0"
          - generic [ref=e106]:
            - link "Ver ofertas de Brownie de chocolate" [ref=e107] [cursor=pointer]:
              - /url: /entries/demo-entry-brownie/offers
              - text: Ver ofertas
            - link "Editar Brownie de chocolate" [ref=e108] [cursor=pointer]:
              - /url: /entries/demo-entry-brownie/edit
              - text: Editar
          - generic [ref=e109]:
            - button "Eliminar definitivamente Brownie de chocolate" [disabled] [ref=e110]: Eliminar
            - paragraph [ref=e111]: Solo se pueden eliminar entradas archivadas.
      - article [ref=e112]:
        - generic [ref=e113]:
          - img "Imagen de Especial de temporada" [ref=e114]
          - generic [ref=e115]: Archivada
        - generic [ref=e117]:
          - heading "Especial de temporada" [level=2] [ref=e118]
          - paragraph [ref=e119]: Entrada archivada para explorar los cambios de estado.
          - generic "Categorías" [ref=e120]: Platos fuertes
          - generic [ref=e122]:
            - generic [ref=e123]:
              - text: "Estado:"
              - strong [ref=e124]: Archivada
            - generic [ref=e125]:
              - text: "Ofertas:"
              - strong [ref=e126]: "0"
          - generic [ref=e127]:
            - link "Ver ofertas de Especial de temporada" [ref=e128] [cursor=pointer]:
              - /url: /entries/demo-entry-seasonal/offers
              - text: Ver ofertas
            - link "Editar Especial de temporada" [ref=e129] [cursor=pointer]:
              - /url: /entries/demo-entry-seasonal/edit
              - text: Editar
          - generic [ref=e130]:
            - button "Eliminar definitivamente Especial de temporada" [ref=e131] [cursor=pointer]: Eliminar
            - paragraph [ref=e132]: La eliminación es definitiva.
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
     |                                                               ^ Error: /: filters
  56 |     }
  57 |   expect(api).toEqual([]);
  58 |   expect(errors).toEqual([]);
  59 | });
  60 | }
  61 | 
```