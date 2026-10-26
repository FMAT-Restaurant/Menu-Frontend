# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-17-isolation.demo.spec.ts >> UX17 external controls keep their own styles at /entries/demo-entry-burger/edit
- Location: e2e\ux-ui-17-isolation.demo.spec.ts:14:1

# Error details

```
Error: /entries/demo-entry-burger/edit: entry-form

expect(received).toMatchObject(expected)

- Expected  - 1
+ Received  + 1

  Object {
-   "border": "0px",
+   "border": "1px",
    "display": "block",
    "gap": "0px",
    "padding": "3px",
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
        - heading "Editar entrada" [active] [level=1] [ref=e18]
        - paragraph [ref=e19]: Nombre, descripción, categorías e imagen de referencia.
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]:
          - region [ref=e23]:
            - heading "Identidad de la entrada" [level=2] [ref=e24]
            - generic [ref=e25]:
              - generic [ref=e26]: Nombre comercial
              - textbox "Nombre comercial" [ref=e27]: Hamburguesa clásica
            - generic [ref=e28]:
              - generic [ref=e29]: Descripción
              - textbox "Descripción" [ref=e30]: Carne de res, queso cheddar y pan brioche.
          - group "Categorías" [ref=e31]:
            - paragraph [ref=e33]: Puedes asignar varias o guardar sin clasificación.
            - button "1 categoría seleccionada" [ref=e34] [cursor=pointer]
            - list "Categorías seleccionadas" [ref=e37]:
              - listitem [ref=e38]:
                - generic [ref=e39]: Platos fuertes
                - button "Retirar categoría Platos fuertes" [ref=e40] [cursor=pointer]
        - complementary [ref=e43]:
          - region [ref=e44]:
            - heading "Imagen de referencia" [level=2] [ref=e45]
            - button "Reemplazar imagen" [ref=e46] [cursor=pointer]:
              - img "Vista previa de la imagen de la entrada" [ref=e48]
            - button "Archivo de imagen" [ref=e50]
            - paragraph [ref=e51]: Si no seleccionas otra imagen, se conservará la actual.
            - paragraph [ref=e52]: JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px.
          - group "Estado administrativo" [ref=e53]:
            - combobox "Estado administrativo" [ref=e56]:
              - option "Activa" [selected]
              - option "Inactiva"
              - option "Archivada"
            - paragraph [ref=e57]: Activar la entrada no cambia sus ofertas ni garantiza su publicación.
      - generic [ref=e58]:
        - button "Cancelar" [ref=e59] [cursor=pointer]
        - button "Guardar cambios" [ref=e60] [cursor=pointer]
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
     |                                                               ^ Error: /entries/demo-entry-burger/edit: entry-form
  56 |     }
  57 |   expect(api).toEqual([]);
  58 |   expect(errors).toEqual([]);
  59 | });
  60 | }
  61 | 
```