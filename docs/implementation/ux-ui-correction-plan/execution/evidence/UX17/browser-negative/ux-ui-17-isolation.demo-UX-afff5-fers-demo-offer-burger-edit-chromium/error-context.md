# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-17-isolation.demo.spec.ts >> UX17 external controls keep their own styles at /entries/demo-entry-burger/offers/demo-offer-burger/edit
- Location: e2e\ux-ui-17-isolation.demo.spec.ts:14:1

# Error details

```
Error: /entries/demo-entry-burger/offers/demo-offer-burger/edit: modal-header

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
      - link "← Volver a ofertas" [ref=e16] [cursor=pointer]:
        - /url: /entries/demo-entry-burger/offers
      - generic [ref=e17]:
        - heading "Editar oferta" [active] [level=1] [ref=e18]
        - paragraph [ref=e19]:
          - text: "Entrada:"
          - strong [ref=e20]: Hamburguesa clásica
    - generic [ref=e21]:
      - region [ref=e22]:
        - heading "1. Información comercial" [level=2] [ref=e23]
        - generic [ref=e24]:
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]: Etiqueta de presentación (opcional)
              - textbox "Etiqueta de presentación (opcional)" [ref=e28]:
                - /placeholder: Ej. Individual, Mediana o Combo
                - text: Individual
              - paragraph [ref=e29]: La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
            - generic [ref=e30]:
              - generic [ref=e31]: Precio base (MXN)
              - generic [ref=e32]:
                - generic [aria-hidden] [ref=e33]: MXN
                - spinbutton "Precio base (MXN)" [ref=e34]: "145"
              - paragraph [ref=e35]: MXN 145.00
              - paragraph [ref=e36]: El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
            - generic [ref=e37]:
              - generic [ref=e38]: Estado de la oferta
              - generic [ref=e39]:
                - radiogroup "Estado de la oferta" [ref=e40]:
                  - generic [ref=e41] [cursor=pointer]:
                    - radio "Activa" [checked] [ref=e42]
                    - generic [ref=e43]: Activa
                  - generic [ref=e44] [cursor=pointer]:
                    - radio "Inactiva" [ref=e45]
                    - generic [ref=e46]: Inactiva
                - paragraph [ref=e47]: El borrador tiene un grupo con opciones activas. Al guardar solicitarás la activación; sólo se aplicará si la composición cumple los requisitos.
          - generic [ref=e49]:
            - generic [ref=e50]: Imagen de la oferta (opcional si se conserva)
            - button "Seleccionar o arrastrar imagen de la oferta" [ref=e51] [cursor=pointer]:
              - generic [ref=e52]:
                - img "Vista previa de la oferta" [ref=e53]
                - generic [ref=e54]: Cambiar imagen
            - paragraph [ref=e55]: JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px.
      - region [ref=e56]:
        - generic [ref=e58]:
          - heading "2. Composición" [level=2] [ref=e59]
          - paragraph [ref=e60]: Cada grupo indica cuántas rondas de selección incluye. En cada ronda se elige entre sus opciones.
        - generic [ref=e61]:
          - article "Grupo Plato principal" [ref=e62]:
            - generic [ref=e63]:
              - generic [ref=e64]:
                - heading "Plato principal" [level=3] [ref=e65]
                - generic [ref=e66]:
                  - generic [ref=e67]: 1 ronda de selección
                  - generic [ref=e68]: Plato fuerte
                  - generic [ref=e69]: Activo
              - generic [ref=e70]:
                - button "Editar grupo Plato principal" [ref=e71] [cursor=pointer]: Editar
                - button "Eliminar grupo Plato principal" [ref=e72] [cursor=pointer]: Retirar grupo
            - generic [ref=e73]:
              - paragraph [ref=e74]: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
              - generic [ref=e76]:
                - generic [ref=e78]:
                  - strong [ref=e79]: Hamburguesa clásica
                  - generic [ref=e80]: Receta
                - generic [ref=e81]: Activa
                - generic [ref=e82]:
                  - button "Cambiar estado de Hamburguesa clásica" [pressed] [ref=e83] [cursor=pointer]: Desactivar
                  - button "Editar opción Hamburguesa clásica" [ref=e84] [cursor=pointer]: Editar
                  - button "Eliminar opción Hamburguesa clásica" [ref=e85] [cursor=pointer]: Retirar
            - button "Agregar opción a Plato principal" [ref=e87] [cursor=pointer]: + Agregar opción
          - button "Agregar grupo" [ref=e88] [cursor=pointer]:
            - generic [aria-hidden] [ref=e89]: +
      - generic [ref=e91]:
        - link "Cancelar" [ref=e92] [cursor=pointer]:
          - /url: /entries/demo-entry-burger/offers
        - button "Guardar Oferta" [ref=e93] [cursor=pointer]
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
     |                                                               ^ Error: /entries/demo-entry-burger/offers/demo-offer-burger/edit: modal-header
  56 |     }
  57 |   expect(api).toEqual([]);
  58 |   expect(errors).toEqual([]);
  59 | });
  60 | }
  61 | 
```