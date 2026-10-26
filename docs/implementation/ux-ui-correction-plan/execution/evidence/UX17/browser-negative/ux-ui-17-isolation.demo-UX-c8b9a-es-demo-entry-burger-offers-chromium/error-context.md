# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-17-isolation.demo.spec.ts >> UX17 external controls keep their own styles at /entries/demo-entry-burger/offers
- Location: e2e\ux-ui-17-isolation.demo.spec.ts:14:1

# Error details

```
Error: /entries/demo-entry-burger/offers: modal-header

expect(received).toMatchObject(expected)

- Expected  - 2
+ Received  + 2

  Object {
    "border": "0px",
-   "display": "block",
+   "display": "flex",
    "gap": "0px",
-   "padding": "3px",
+   "padding": "16px 20px",
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
      - link "← Volver a entradas" [ref=e16] [cursor=pointer]:
        - /url: /
      - generic [ref=e17]:
        - generic [ref=e18]:
          - heading "Ofertas de Hamburguesa clásica" [active] [level=1] [ref=e19]
          - paragraph [ref=e20]: Presentaciones vendibles de la misma identidad comercial.
        - link "Nueva oferta" [ref=e21] [cursor=pointer]:
          - /url: /entries/demo-entry-burger/offers/new
    - paragraph [ref=e22]:
      - text: "Estado administrativo de la entrada:"
      - strong [ref=e23]: Activa
      - text: . Una oferta activa solo se publica si la entrada está activa y cumple las reglas de publicación.
    - paragraph [ref=e24]: Mostrando 1–2 de 2 ofertas
    - region "Ofertas de la entrada" [ref=e25]:
      - article [ref=e26]:
        - link "Abrir oferta Individual para editar" [ref=e27] [cursor=pointer]:
          - /url: /entries/demo-entry-burger/offers/demo-offer-burger/edit
          - img "Imagen de la oferta Individual" [ref=e29]
          - heading "Individual" [level=2] [ref=e30]
          - paragraph [ref=e31]: Hamburguesa clásica
          - paragraph [ref=e32]: MXN 145.00
        - generic [ref=e33]:
          - generic [ref=e34]: Activa
          - 'button "Cambiar estado de oferta Individual: Activa" [pressed] [ref=e35] [cursor=pointer]': Desactivar oferta
          - paragraph [ref=e36]:
            - text: "Grupos de composición:"
            - strong [ref=e37]: "1"
        - button "Eliminar oferta Individual" [disabled] [ref=e39]: Eliminar oferta
        - paragraph [ref=e40]: Desactiva la oferta antes de eliminarla.
      - article [ref=e41]:
        - link "Abrir oferta Combo con bebida para editar" [ref=e42] [cursor=pointer]:
          - /url: /entries/demo-entry-burger/offers/demo-offer-combo/edit
          - img "Imagen de la oferta Combo con bebida" [ref=e44]
          - heading "Combo con bebida" [level=2] [ref=e45]
          - paragraph [ref=e46]: Hamburguesa clásica
          - paragraph [ref=e47]: MXN 185.00
        - generic [ref=e48]:
          - generic [ref=e49]: Inactiva
          - 'button "Cambiar estado de oferta Combo con bebida: Inactiva" [ref=e50] [cursor=pointer]': Activar oferta
          - paragraph [ref=e51]:
            - text: "Grupos de composición:"
            - strong [ref=e52]: "2"
        - button "Eliminar oferta Combo con bebida" [ref=e54] [cursor=pointer]: Eliminar oferta
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
     |                                                               ^ Error: /entries/demo-entry-burger/offers: modal-header
  56 |     }
  57 |   expect(api).toEqual([]);
  58 |   expect(errors).toEqual([]);
  59 | });
  60 | }
  61 | 
```