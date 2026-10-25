# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-09.demo.spec.ts >> UX09 composition follows viewport, module and own form width without horizontal traversal
- Location: e2e\ux-ui-09.demo.spec.ts:41:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 161
Received:    166
```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver a ofertas" [ref=e7] [cursor=pointer]:
      - /url: /entries/demo-entry-burger/offers
    - generic [ref=e8]:
      - heading "Editar oferta" [level=1] [ref=e9]
      - paragraph [ref=e10]:
        - text: "Entrada:"
        - strong [ref=e11]: Hamburguesa clásica
  - generic [ref=e12]:
    - region [ref=e13]:
      - heading "1. Información comercial" [level=2] [ref=e14]
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]: Etiqueta de presentación (opcional)
            - textbox "Etiqueta de presentación (opcional)" [ref=e19]:
              - /placeholder: Ej. Individual, Mediana o Combo
              - text: Combo con bebida
            - paragraph [ref=e20]: La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
          - generic [ref=e21]:
            - generic [ref=e22]: Precio base
            - generic [ref=e23]:
              - generic [aria-hidden] [ref=e24]: $
              - spinbutton "Precio base" [ref=e25]: "185"
            - paragraph [ref=e26]: El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
          - generic [ref=e27]:
            - generic [ref=e28]: Estado de la oferta
            - radiogroup "Estado de la oferta" [ref=e30]:
              - generic [ref=e31] [cursor=pointer]:
                - radio "Activa" [ref=e32]
                - generic [ref=e33]: Activa
              - generic [ref=e34] [cursor=pointer]:
                - radio "Inactiva" [checked] [ref=e35]
                - generic [ref=e36]: Inactiva
        - generic [ref=e38]:
          - generic [ref=e39]: Imagen de la oferta (opcional si se conserva)
          - button "Seleccionar o arrastrar imagen de la oferta" [ref=e40] [cursor=pointer]:
            - generic [ref=e41]:
              - img "Vista previa de la oferta" [ref=e42]
              - generic [ref=e43]: Cambiar imagen
          - paragraph [ref=e44]: "Formatos aceptados: JPEG, PNG o WebP. Tamaño máximo: 10 MiB y 4096 × 4096 px."
    - region [ref=e45]:
      - generic [ref=e47]:
        - heading "2. Composición" [level=2] [ref=e48]
        - paragraph [ref=e49]: Cada grupo define su participación y cantidad; cada opción elige su propia fuente de contenido.
      - generic [ref=e50]:
        - article "Grupo Plato principal" [ref=e51]:
          - generic [ref=e52]:
            - generic [ref=e53]:
              - heading "Plato principal" [level=3] [ref=e54]
              - generic [ref=e55]:
                - generic [ref=e56]: 1 ronda
                - generic [ref=e57]: Plato fuerte
                - generic [ref=e58]: Activo
            - generic [ref=e59]:
              - button "Editar grupo Plato principal" [ref=e60] [cursor=pointer]: Editar
              - button "Eliminar grupo Plato principal" [ref=e61] [cursor=pointer]: Retirar grupo
          - generic [ref=e62]:
            - paragraph [ref=e63]: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
            - generic [ref=e64]:
              - generic [ref=e65]:
                - generic [ref=e67]:
                  - strong [ref=e68]: Hamburguesa clásica
                  - generic [ref=e69]: Receta
                - generic [ref=e70]: Activa
                - generic [ref=e71]:
                  - button "Cambiar estado de Hamburguesa clásica" [pressed] [ref=e72] [cursor=pointer]: Desactivar
                  - button "Editar opción Hamburguesa clásica" [ref=e73] [cursor=pointer]: Editar
                  - button "Eliminar opción Hamburguesa clásica" [ref=e74] [cursor=pointer]: Retirar
              - generic [ref=e75]:
                - generic [ref=e76]:
                  - generic [ref=e77]:
                    - strong [ref=e78]: Alternativa de limonada con nombre largo para comprobar opciones completas
                    - generic [ref=e79]: Receta
                  - paragraph [ref=e80]: "Origen: Limonada de la casa"
                - generic [ref=e81]: Inactiva
                - generic [ref=e82]:
                  - button "Cambiar estado de Alternativa de limonada con nombre largo para comprobar opciones completas" [active] [ref=e83] [cursor=pointer]: Activar
                  - button "Editar opción Alternativa de limonada con nombre largo para comprobar opciones completas" [ref=e84] [cursor=pointer]: Editar
                  - button "Eliminar opción Alternativa de limonada con nombre largo para comprobar opciones completas" [ref=e85] [cursor=pointer]: Retirar
          - button "Agregar opción a Plato principal" [ref=e87] [cursor=pointer]: + Agregar opción
        - article "Grupo Bebida" [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]:
              - heading "Bebida" [level=3] [ref=e91]
              - generic [ref=e92]:
                - generic [ref=e93]: 1 ronda
                - generic [ref=e94]: Bebida
                - generic [ref=e95]: Activo
            - generic [ref=e96]:
              - button "Editar grupo Bebida" [ref=e97] [cursor=pointer]: Editar
              - button "Eliminar grupo Bebida" [ref=e98] [cursor=pointer]: Retirar grupo
          - generic [ref=e99]:
            - paragraph [ref=e100]: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
            - generic [ref=e102]:
              - generic [ref=e103]:
                - generic [ref=e104]:
                  - strong [ref=e105]: Agua mineral
                  - generic [ref=e106]: Inventario
                - paragraph [ref=e107]: 350 ml
              - generic [ref=e108]: Activa
              - generic [ref=e109]:
                - button "Cambiar estado de Agua mineral" [pressed] [ref=e110] [cursor=pointer]: Desactivar
                - button "Editar opción Agua mineral" [ref=e111] [cursor=pointer]: Editar
                - button "Eliminar opción Agua mineral" [ref=e112] [cursor=pointer]: Retirar
          - button "Agregar opción a Bebida" [ref=e114] [cursor=pointer]: + Agregar opción
        - button "Agregar grupo" [ref=e115] [cursor=pointer]:
          - generic [aria-hidden] [ref=e116]: +
    - generic [ref=e118]:
      - link "Cancelar" [ref=e119] [cursor=pointer]:
        - /url: /entries/demo-entry-burger/offers
      - button "Guardar Oferta" [ref=e120] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  2   | import { writeFile } from "node:fs/promises";
  3   | 
  4   | function observe(page: Page) {
  5   |   const errors: string[] = [];
  6   |   const api: string[] = [];
  7   |   page.on("pageerror", error => errors.push(error.message));
  8   |   page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  9   |   return () => { expect(errors).toEqual([]); expect(api).toEqual([]); };
  10  | }
  11  | async function evidence(page: Page, info: TestInfo, name: string, data: unknown) {
  12  |   const json = info.outputPath(`${name}.json`);
  13  |   const png = info.outputPath(`${name}.png`);
  14  |   await writeFile(json, JSON.stringify(data, null, 2));
  15  |   await info.attach(name, { path: json, contentType: "application/json" });
  16  |   await page.screenshot({ path: png, fullPage: true });
  17  |   await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
  18  | }
  19  | async function addRecipeOption(page: Page) {
  20  |   await page.getByRole("button", { name: "Agregar opción a Plato principal", exact: true }).click();
  21  |   await expect(page.getByRole("button", { name: /Elegir artículo de inventario/ })).toHaveCount(0);
  22  |   await page.getByRole("button", { name: /Elegir receta/ }).click();
  23  |   await page.getByRole("article", { name: "Limonada de la casa", exact: true }).getByRole("button", { name: "Asignar", exact: true }).click();
  24  |   await page.getByLabel("Nombre mostrado (opcional)").fill("Alternativa de limonada con nombre largo para comprobar opciones completas");
  25  |   await page.getByRole("button", { name: "Guardar opción", exact: true }).click();
  26  | }
  27  | async function measure(page: Page) {
  28  |   return page.locator(".offer-form").evaluate(form => {
  29  |     const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  30  |     const slots = [...form.querySelectorAll(".slot-card")];
  31  |     const grid = form.querySelector(".composition-editor__slots-container")!;
  32  |     const controls = [...form.querySelectorAll<HTMLElement>("button, input:not([type=file]):not([type=radio]), select")].filter(el => el.getBoundingClientRect().height > 0).map(el => {
  33  |       const style = getComputedStyle(el);
  34  |       return { name: el.getAttribute("aria-label") || el.textContent?.trim() || el.id, ...rect(el), lineHeight: style.lineHeight, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  35  |     });
  36  |     const metadata = [...form.querySelectorAll(".slot-card__badge,.slot-option-item__source-badge,.slot-option-item__source-ref,.slot-option-item__quantity,.offer-state")].map(el => ({ text: el.textContent, font: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight }));
  37  |     return { viewport: innerWidth, module: rect(form.closest("[data-menu-module]")!), form: rect(form), clientWidth: form.clientWidth, scrollWidth: form.scrollWidth, grid: rect(grid), columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length, slots: slots.map(rect), add: rect(form.querySelector(".add-slot-card")!), controls, metadata, stripes: slots.flatMap(slot => [slot, ...slot.querySelectorAll(".slot-option-item")]).map(el => { const s = getComputedStyle(el); return { left: s.borderLeftWidth, right: s.borderRightWidth, top: s.borderTopWidth, bottom: s.borderBottomWidth }; }) };
  38  |   });
  39  | }
  40  | 
  41  | test("UX09 composition follows viewport, module and own form width without horizontal traversal", async ({ page }, info) => {
  42  |   const check = observe(page);
  43  |   await page.goto("/entries/demo-entry-burger/offers/demo-offer-combo/edit");
  44  |   await expect(page.getByRole("article", { name: "Grupo Bebida", exact: true })).toBeVisible();
  45  |   await addRecipeOption(page);
  46  |   await page.getByRole("button", { name: "Cambiar estado de Alternativa de limonada con nombre largo para comprobar opciones completas", exact: true }).click();
  47  |   await expect(page.locator(".slot-option-item .offer-state--inactive")).toHaveText("Inactiva");
  48  |   await expect(page.getByRole("button", { name: /Copiar composición/ })).toHaveCount(0);
  49  |   const all = [];
  50  |   for (const host of ["viewport", "module", "form"] as const) {
  51  |     for (const width of [320, 390, 600, 740, 1024, 1440]) {
  52  |       await page.setViewportSize({ width: host === "viewport" ? width : 1440, height: 1000 });
  53  |       await page.locator("[data-menu-module]").evaluate((el, value) => { (el as HTMLElement).style.width = value; }, host === "module" ? `${width}px` : "");
  54  |       await page.locator(".offer-form").evaluate((el, value) => { (el as HTMLElement).style.width = value; }, host === "form" ? `${width}px` : "");
  55  |       const data = await measure(page);
  56  |       expect(data.scrollWidth).toBeLessThanOrEqual(data.clientWidth + 1);
  57  |       expect(data.columns).toBe(data.form.width < 768 ? 1 : 2);
  58  |       if (data.form.width < 768) {
  59  |         expect(data.slots[1].y).toBeGreaterThanOrEqual(data.slots[0].bottom);
  60  |         expect(data.add.y).toBeGreaterThanOrEqual(data.slots[1].bottom);
  61  |       }
  62  |       for (const control of data.controls) {
  63  |         expect(control.height, `${control.name}: ${host} ${width}`).toBeGreaterThanOrEqual(data.form.width < 768 || data.module.width < 1200 ? 48 : 40);
> 64  |         expect(control.scrollHeight).toBeLessThanOrEqual(control.clientHeight + 1);
      |                                      ^ Error: expect(received).toBeLessThanOrEqual(expected)
  65  |         expect(control.right).toBeLessThanOrEqual(data.form.right + 1);
  66  |       }
  67  |       for (const meta of data.metadata) { expect(Number.parseFloat(meta.font)).toBeGreaterThanOrEqual(12); expect(Number.parseFloat(meta.line)).toBeGreaterThanOrEqual(16); }
  68  |       for (const border of data.stripes) { expect(border.left).toBe(border.right); expect(border.top).toBe(border.bottom); }
  69  |       all.push({ host, requested: width, ...data });
  70  |       if (host === "viewport") await evidence(page, info, `w${width}`, data);
  71  |     }
  72  |   }
  73  |   await page.getByRole("button", { name: "Agregar grupo", exact: true }).scrollIntoViewIfNeeded();
  74  |   await expect(page.getByRole("button", { name: "Agregar grupo", exact: true })).toBeInViewport();
  75  |   await evidence(page, info, "widths", all);
  76  |   check();
  77  | });
  78  | 
  79  | test("UX09 existing inventory option remains editable and image replacement works by keyboard and touch", async ({ browser }, info) => {
  80  |   const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  81  |   const page = await context.newPage();
  82  |   const check = observe(page);
  83  |   try {
  84  |     await page.goto("/entries/demo-entry-burger/offers/demo-offer-combo/edit");
  85  |     await page.getByRole("button", { name: "Editar opción Agua mineral", exact: true }).click();
  86  |     await expect(page.getByText(/Artículo de inventario: Agua mineral/)).toBeVisible();
  87  |     await page.getByLabel("Nombre mostrado (opcional)").fill("Agua mineral en vaso");
  88  |     await page.getByRole("button", { name: "Guardar opción", exact: true }).click();
  89  |     await expect(page.getByText("Agua mineral en vaso", { exact: true })).toBeVisible();
  90  |     const imageControl = page.getByRole("button", { name: "Seleccionar o arrastrar imagen de la oferta", exact: true });
  91  |     await expect(imageControl.getByText("Cambiar imagen", { exact: true })).toBeVisible();
  92  |     await imageControl.focus();
  93  |     const [keyboardChooser] = await Promise.all([page.waitForEvent("filechooser"), imageControl.press("Enter")]);
  94  |     const buffer = Buffer.from(await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 40; c.height = 30; c.getContext("2d")!.fillRect(0, 0, 40, 30); return c.toDataURL("image/png").split(",")[1]; }), "base64");
  95  |     await keyboardChooser.setFiles({ name: "keyboard.png", mimeType: "image/png", buffer });
  96  |     await expect(page.getByRole("img", { name: "Vista previa de la oferta", exact: true })).toHaveAttribute("src", /^blob:/);
  97  |     const [touchChooser] = await Promise.all([page.waitForEvent("filechooser"), imageControl.tap()]);
  98  |     await touchChooser.setFiles({ name: "touch.png", mimeType: "image/png", buffer });
  99  |     const details = await page.locator("#offer-image-input").evaluate(el => ({ file: (el as HTMLInputElement).files?.[0]?.name, accept: (el as HTMLInputElement).accept }));
  100 |     expect(details.file).toBe("touch.png");
  101 |     await evidence(page, info, "image", { ...details, changeVisible: await imageControl.getByText("Cambiar imagen", { exact: true }).isVisible(), option: "Agua mineral en vaso" });
  102 |     check();
  103 |   } finally { await context.close(); }
  104 | });
  105 | 
  106 | test("UX09 cards retain untagged offers, independent state, deletion restriction and catalog return", async ({ page }, info) => {
  107 |   const check = observe(page);
  108 |   const returnTo = "/?q=Hamburguesa&status=ACTIVE&page=1&pageSize=12";
  109 |   await page.goto(returnTo);
  110 |   await page.getByRole("link", { name: "Ver ofertas de Hamburguesa clásica", exact: true }).click();
  111 |   await page.getByRole("link", { name: "Abrir oferta Combo con bebida para editar", exact: true }).click();
  112 |   await page.getByLabel("Etiqueta de presentación (opcional)", { exact: true }).fill("");
  113 |   await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  114 |   await expect(page.getByRole("heading", { name: "Sin etiqueta de presentación", exact: true })).toBeVisible();
  115 |   const cards = page.locator(".offer-card");
  116 |   await expect(cards.locator(".offer-state--active")).toHaveText("Activa");
  117 |   await expect(cards.locator(".offer-state--inactive")).toHaveText("Inactiva");
  118 |   const activeDelete = page.getByRole("button", { name: "Eliminar oferta Individual", exact: true });
  119 |   await expect(activeDelete).toBeDisabled();
  120 |   await expect(activeDelete).toHaveAccessibleDescription("Desactiva la oferta antes de eliminarla.");
  121 |   const keys = await cards.locator("[data-return-key]").evaluateAll(elements => elements.map(el => el.getAttribute("data-return-key")));
  122 |   expect(new Set(keys).size).toBe(keys.length);
  123 |   await page.getByRole("button", { name: "Eliminar oferta Sin etiqueta de presentación", exact: true }).click();
  124 |   const dialog = page.getByRole("dialog");
  125 |   await expect(dialog).toBeVisible();
  126 |   await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  127 |   await expect(page.getByRole("heading", { name: "Sin etiqueta de presentación", exact: true })).toBeVisible();
  128 |   await evidence(page, info, "cards", { keys, activeDeletionDisabled: await activeDelete.isDisabled(), returnTo });
  129 |   await page.getByRole("link", { name: /Volver a entradas/ }).click();
  130 |   await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
  131 |   check();
  132 | });
  133 | 
```