# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-17-foundations.demo.spec.ts >> UX17 equivalent component titles and spacing follow DESIGN at 390px
- Location: e2e\ux-ui-17-foundations.demo.spec.ts:13:3

# Error details

```
Error: /categories

expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
-   "line": "26px",
-   "size": "18px",
+   "line": "24px",
+   "size": "16px",
    "weight": "600",
  }
```

# Page snapshot

```yaml
- main [ref=f4e5]:
  - generic [ref=f4e6]:
    - link "← Volver a ofertas" [ref=f4e7] [cursor=pointer]:
      - /url: /entries/demo-entry-burger/offers
    - generic [ref=f4e8]:
      - heading "Editar oferta" [active] [level=1] [ref=f4e9]
      - paragraph [ref=f4e10]:
        - text: "Entrada:"
        - strong [ref=f4e11]: Hamburguesa clásica
  - generic [ref=f4e12]:
    - region [ref=f4e13]:
      - heading "1. Información comercial" [level=2] [ref=f4e14]
      - generic [ref=f4e15]:
        - generic [ref=f4e16]:
          - generic [ref=f4e17]:
            - generic [ref=f4e18]: Etiqueta de presentación (opcional)
            - textbox "Etiqueta de presentación (opcional)" [ref=f4e19]:
              - /placeholder: Ej. Individual, Mediana o Combo
              - text: Individual
            - paragraph [ref=f4e20]: La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
          - generic [ref=f4e21]:
            - generic [ref=f4e22]: Precio base (MXN)
            - generic [ref=f4e23]:
              - generic [aria-hidden] [ref=f4e24]: MXN
              - spinbutton "Precio base (MXN)" [ref=f4e25]: "145"
            - paragraph [ref=f4e26]: MXN 145.00
            - paragraph [ref=f4e27]: El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
          - generic [ref=f4e28]:
            - generic [ref=f4e29]: Estado de la oferta
            - generic [ref=f4e30]:
              - radiogroup "Estado de la oferta" [ref=f4e31]:
                - generic [ref=f4e32] [cursor=pointer]:
                  - radio "Activa" [checked] [ref=f4e33]
                  - generic [ref=f4e34]: Activa
                - generic [ref=f4e35] [cursor=pointer]:
                  - radio "Inactiva" [ref=f4e36]
                  - generic [ref=f4e37]: Inactiva
              - paragraph [ref=f4e38]: El borrador tiene un grupo con opciones activas. Al guardar solicitarás la activación; sólo se aplicará si la composición cumple los requisitos.
        - generic [ref=f4e40]:
          - generic [ref=f4e41]: Imagen de la oferta (opcional si se conserva)
          - button "Seleccionar o arrastrar imagen de la oferta" [ref=f4e42] [cursor=pointer]:
            - generic [ref=f4e43]:
              - img "Vista previa de la oferta" [ref=f4e44]
              - generic [ref=f4e45]: Cambiar imagen
          - paragraph [ref=f4e46]: JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px.
    - region [ref=f4e47]:
      - generic [ref=f4e49]:
        - heading "2. Composición" [level=2] [ref=f4e50]
        - paragraph [ref=f4e51]: Cada grupo indica cuántas rondas de selección incluye. En cada ronda se elige entre sus opciones.
      - generic [ref=f4e52]:
        - article "Grupo Plato principal" [ref=f4e53]:
          - generic [ref=f4e54]:
            - generic [ref=f4e55]:
              - heading "Plato principal" [level=3] [ref=f4e56]
              - generic [ref=f4e57]:
                - generic [ref=f4e58]: 1 ronda de selección
                - generic [ref=f4e59]: Plato fuerte
                - generic [ref=f4e60]: Activo
            - generic [ref=f4e61]:
              - button "Editar grupo Plato principal" [ref=f4e62] [cursor=pointer]: Editar
              - button "Eliminar grupo Plato principal" [ref=f4e63] [cursor=pointer]: Retirar grupo
          - generic [ref=f4e64]:
            - paragraph [ref=f4e65]: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
            - generic [ref=f4e67]:
              - generic [ref=f4e69]:
                - strong [ref=f4e70]: Hamburguesa clásica
                - generic [ref=f4e71]: Receta
              - generic [ref=f4e72]: Activa
              - generic [ref=f4e73]:
                - button "Cambiar estado de Hamburguesa clásica" [pressed] [ref=f4e74] [cursor=pointer]: Desactivar
                - button "Editar opción Hamburguesa clásica" [ref=f4e75] [cursor=pointer]: Editar
                - button "Eliminar opción Hamburguesa clásica" [ref=f4e76] [cursor=pointer]: Retirar
          - button "Agregar opción a Plato principal" [ref=f4e78] [cursor=pointer]: + Agregar opción
        - button "Agregar grupo" [ref=f4e79] [cursor=pointer]:
          - generic [aria-hidden] [ref=f4e80]: +
    - generic [ref=f4e82]:
      - link "Cancelar" [ref=f4e83] [cursor=pointer]:
        - /url: /entries/demo-entry-burger/offers
      - button "Guardar Oferta" [ref=f4e84] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { writeFile } from "node:fs/promises";
  3  | 
  4  | const consumers = [
  5  |   { path: "/", title: ".entry-card h2", frame: ".entry-card", padding: ".entry-card__body", radius: "12px" },
  6  |   { path: "/categories", title: ".category-row h3", frame: ".category-row", padding: ".category-row", radius: "8px" },
  7  |   { path: "/recipes", title: ".recipe-card h3", frame: ".recipe-card", padding: ".recipe-card", radius: "12px" },
  8  |   { path: "/entries/demo-entry-burger/offers", title: ".offer-card__content h2", frame: ".offer-card", padding: ".offer-card__content", radius: "12px" },
  9  |   { path: "/entries/demo-entry-burger/offers/demo-offer-burger/edit", title: ".slot-card__title", frame: ".slot-card", padding: ".slot-card__header", radius: "12px" },
  10 | ];
  11 | 
  12 | for (const width of [390, 1440]) {
  13 |   test(`UX17 equivalent component titles and spacing follow DESIGN at ${width}px`, async ({ page }, info) => {
  14 |     await page.setViewportSize({ width, height: 1000 });
  15 |     const results = [];
  16 |     const errors: string[] = [];
  17 |     const api: string[] = [];
  18 |     page.on("pageerror", error => errors.push(error.message));
  19 |     page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  20 |     for (const [index, consumer] of consumers.entries()) {
  21 |       await page.goto(consumer.path);
  22 |       await expect(page.locator(consumer.title).first()).toBeVisible();
  23 |       const result = await page.evaluate(({ title, frame, padding }) => {
  24 |         const typography = (element: Element) => { const style = getComputedStyle(element); return { size: style.fontSize, line: style.lineHeight, weight: style.fontWeight }; };
  25 |         const box = getComputedStyle(document.querySelector(padding)!);
  26 |         return { path: location.pathname, heading: typography(document.querySelector("[data-route-heading]")!), title: typography(document.querySelector(title)!),
  27 |           radius: getComputedStyle(document.querySelector(frame)!).borderRadius,
  28 |           padding: [box.paddingTop, box.paddingRight, box.paddingBottom, box.paddingLeft] };
  29 |       }, consumer);
  30 |       results.push({ ...result, expectedRadius: consumer.radius });
  31 |       await page.screenshot({ path: info.outputPath(`role-${index}.png`) });
  32 |     }
  33 |     const json = info.outputPath("foundations.json");
  34 |     await writeFile(json, JSON.stringify({ width, results, errors, api }, null, 2));
  35 |     await info.attach("foundations", { path: json, contentType: "application/json" });
  36 |     for (const result of results) {
  37 |       expect(result.heading, result.path).toEqual({ size: "28px", line: "36px", weight: "700" });
> 38 |       expect(result.title, result.path).toEqual({ size: "18px", line: "26px", weight: "600" });
     |                                         ^ Error: /categories
  39 |       expect(result.radius, result.path).toBe(result.expectedRadius);
  40 |       for (const value of result.padding) expect(Number.parseFloat(value) % 4, `${result.path}: padding ${value}`).toBe(0);
  41 |     }
  42 |     expect(errors).toEqual([]);
  43 |     expect(api).toEqual([]);
  44 |   });
  45 | }
  46 | 
```