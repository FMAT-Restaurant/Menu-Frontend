# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-10.demo.spec.ts >> UX10 one modal preserves query, recipe and option drafts at 740px
- Location: e2e\ux-ui-10.demo.spec.ts:27:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 740
Received:    960
```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver a ofertas" [ref=e7] [cursor=pointer]:
      - /url: /entries/demo-entry-burger/offers
    - generic [ref=e8]:
      - heading "Nueva oferta" [level=1] [ref=e9]
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
            - paragraph [ref=e20]: La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
          - generic [ref=e21]:
            - generic [ref=e22]: Precio base
            - generic [ref=e23]:
              - generic [aria-hidden] [ref=e24]: $
              - spinbutton "Precio base" [ref=e25]
            - paragraph [ref=e26]: El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
          - generic [ref=e27]:
            - generic [ref=e28]: Estado de la oferta
            - generic [ref=e29]:
              - generic [ref=e30]: Inactiva
              - paragraph [ref=e31]: Toda oferta se crea con estado inactivo (INACTIVE); la composición del borrador local no garantiza la aceptación del servidor ni activa la oferta automáticamente.
        - generic [ref=e33]:
          - generic [ref=e34]: Imagen de la oferta (obligatoria)
          - button "Seleccionar o arrastrar imagen de la oferta" [ref=e35] [cursor=pointer]:
            - generic [ref=e36]:
              - generic [ref=e41]: Arrastra una imagen aquí o haz clic para seleccionar
              - generic [ref=e42]: Seleccionar archivo
          - paragraph [ref=e43]: "Formatos aceptados: JPEG, PNG o WebP. Tamaño máximo: 10 MiB y 4096 × 4096 px."
    - region [ref=e44]:
      - generic [ref=e46]:
        - heading "2. Composición" [level=2] [ref=e47]
        - paragraph [ref=e48]: Cada grupo define su participación y cantidad; cada opción elige su propia fuente de contenido.
      - generic [ref=e49]:
        - article "Grupo Principal" [ref=e50]:
          - generic [ref=e51]:
            - generic [ref=e52]:
              - heading "Principal" [level=3] [ref=e53]
              - generic [ref=e54]:
                - generic [ref=e55]: 1 ronda
                - generic [ref=e56]: Inactivo
            - generic [ref=e57]:
              - button "Editar grupo Principal" [ref=e58] [cursor=pointer]: Editar
              - button "Eliminar grupo Principal" [ref=e59] [cursor=pointer]: Retirar grupo
          - generic [ref=e60]:
            - paragraph [ref=e61]: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
            - paragraph [ref=e62]: Este grupo aún no tiene opciones. Debe incluir al menos una opción para ser válido.
          - button "Agregar opción a Principal" [ref=e64] [cursor=pointer]: + Agregar opción
        - button "Agregar grupo" [ref=e65] [cursor=pointer]:
          - generic [aria-hidden] [ref=e66]: +
    - generic [ref=e68]:
      - link "Cancelar" [ref=e69] [cursor=pointer]:
        - /url: /entries/demo-entry-burger/offers
      - button "Guardar Oferta" [ref=e70] [cursor=pointer]
  - dialog [ref=e71]:
    - region [ref=e74]:
      - generic [ref=e75]:
        - button "Volver a la opción" [ref=e76] [cursor=pointer]
        - heading "Elegir receta · Principal" [level=2] [ref=e77]
        - button "+ Nueva receta" [ref=e78] [cursor=pointer]: Nueva receta
      - search [ref=e79]:
        - generic [ref=e80]: Buscar recetas
        - generic [ref=e81]:
          - searchbox "Buscar recetas" [ref=e86]: Limonada
          - button "Buscar ahora" [active] [ref=e87] [cursor=pointer]: Buscar
      - list [ref=e88]:
        - listitem [ref=e89]:
          - article [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]:
                - heading "Limonada de la casa" [level=3] [ref=e93]
                - paragraph [ref=e94]: Bebida preparada al momento.
              - button "Asignar" [ref=e96] [cursor=pointer]
            - paragraph [ref=e98]:
              - strong [ref=e99]: "Insumos:"
              - text: Jugo de limón (60 ml), Agua mineral (300 ml)
```

# Test source

```ts
  1   | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  2   | import { writeFile } from "node:fs/promises";
  3   | 
  4   | async function evidence(page: Page, info: TestInfo, name: string) {
  5   |   const data = await page.evaluate(() => ({
  6   |     modalCount: document.querySelectorAll("dialog[open]:modal").length,
  7   |     dialogs: [...document.querySelectorAll("dialog[open]")].map(dialog => ({
  8   |       title: dialog.getAttribute("aria-labelledby"),
  9   |       backdrop: getComputedStyle(dialog, "::backdrop").backgroundColor,
  10  |       width: dialog.getBoundingClientRect().width,
  11  |       height: dialog.getBoundingClientRect().height,
  12  |     })),
  13  |     active: document.activeElement?.getAttribute("aria-label") || document.activeElement?.id || document.activeElement?.textContent,
  14  |     bodyPosition: getComputedStyle(document.body).position,
  15  |     scrollY,
  16  |   }));
  17  |   const json = info.outputPath(`${name}.json`);
  18  |   const png = info.outputPath(`${name}.png`);
  19  |   await writeFile(json, JSON.stringify(data, null, 2));
  20  |   await page.screenshot({ path: png, fullPage: true });
  21  |   await info.attach(name, { path: json, contentType: "application/json" });
  22  |   await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
  23  |   return data;
  24  | }
  25  | 
  26  | for (const width of [390, 1024, 600, 740]) {
  27  |   test(`UX10 one modal preserves query, recipe and option drafts at ${width}px`, async ({ page }, info) => {
  28  |     const errors: string[] = [];
  29  |     const requests: string[] = [];
  30  |     page.on("pageerror", error => errors.push(error.message));
  31  |     page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
  32  |     await page.setViewportSize({ width: width === 600 || width === 740 ? 1440 : width, height: 844 });
  33  |     await page.goto("/entries/demo-entry-burger/offers/new");
  34  |     if (width === 600 || width === 740) await page.locator("[data-menu-module]").evaluate((el, size) => { (el as HTMLElement).style.width = `${size}px`; }, width);
  35  |     await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
  36  |     await page.getByLabel("Nombre del grupo").fill("Principal");
  37  |     await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
  38  |     const trigger = page.getByRole("button", { name: "Agregar opción a Principal", exact: true });
  39  |     await trigger.click();
  40  |     const dialog = page.locator("dialog[open]:modal");
  41  |     await page.evaluate(() => {
  42  |       const log: unknown[] = [];
  43  |       (window as unknown as { ux10Events: unknown[] }).ux10Events = log;
  44  |       const snapshot = (phase: string, event?: Event) => log.push({ phase, type: event?.type, key: event instanceof KeyboardEvent ? event.key : undefined, cancelable: event?.cancelable, prevented: event?.defaultPrevented, dialogs: [...document.querySelectorAll("dialog")].map(el => ({ open: el.open, modal: el.matches(":modal"), title: el.getAttribute("aria-labelledby"), connected: el.isConnected })), focus: document.activeElement?.outerHTML.slice(0, 180) });
  45  |       for (const type of ["keydown", "cancel", "close"]) document.addEventListener(type, event => {
  46  |         if (event instanceof KeyboardEvent && event.key !== "Escape") return;
  47  |         snapshot("capture", event);
  48  |         queueMicrotask(() => snapshot("after", event));
  49  |         setTimeout(() => snapshot("after-dispatch", event), 0);
  50  |       }, true);
  51  |       document.querySelector("dialog[open]")?.addEventListener("cancel", event => snapshot("target-after-react", event));
  52  |       const close = HTMLDialogElement.prototype.close;
  53  |       HTMLDialogElement.prototype.close = function (...args) { snapshot("close-called"); return close.apply(this, args); };
  54  |       new MutationObserver(records => {
  55  |         if (records.some(record => record.type === "attributes" && record.target instanceof HTMLDialogElement)) snapshot("attribute-change");
  56  |       }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open", "aria-labelledby"] });
  57  |     });
  58  |     const node = await dialog.elementHandle();
  59  |     await page.getByLabel("Nombre mostrado (opcional)").fill("Mi opción conservada");
  60  |     await page.getByRole("button", { name: /^Elegir receta/ }).click();
  61  |     const search = page.getByLabel("Buscar recetas", { exact: true });
  62  |     await expect(search).toBeFocused();
  63  |     await search.fill("sin coincidencias UX10");
  64  |     await page.getByRole("button", { name: "Buscar ahora", exact: true }).click();
  65  |     await expect(page.getByText("No hay recetas que coincidan con tu búsqueda.")).toBeVisible();
  66  |     await page.getByRole("button", { name: "Limpiar búsqueda", exact: true }).click();
  67  |     await expect(search).toBeFocused();
  68  |     await search.fill("Limonada");
  69  |     await page.getByRole("button", { name: "Buscar ahora", exact: true }).click();
  70  |     await expect(page.getByRole("article", { name: "Limonada de la casa", exact: true })).toBeVisible();
> 71  |     expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(width);
      |                                                 ^ Error: expect(received).toBeLessThanOrEqual(expected)
  72  |     const controlHeights = await dialog.locator("button,input").evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height > 0).map(el => el.getBoundingClientRect().height));
  73  |     for (const height of controlHeights) expect(height).toBeGreaterThanOrEqual(48);
  74  |     expect((await evidence(page, info, `selector-${width}`)).modalCount).toBe(1);
  75  |     const create = page.getByRole("button", { name: "+ Nueva receta", exact: true });
  76  |     await create.click();
  77  |     await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();
  78  |     await page.getByLabel("Nombre", { exact: true }).fill("Borrador de receta UX10");
  79  |     await page.keyboard.press("Escape");
  80  |     await expect(page.getByRole("button", { name: "Seguir editando receta", exact: true })).toBeFocused();
  81  |     await page.getByRole("button", { name: "Seguir editando receta", exact: true }).click();
  82  |     await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Borrador de receta UX10");
  83  |     await page.keyboard.press("Escape");
  84  |     await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  85  |     await expect(create).toBeFocused();
  86  |     await expect(search).toHaveValue("Limonada");
  87  |     await create.click();
  88  |     await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Borrador de receta UX10");
  89  |     expect((await evidence(page, info, `create-${width}`)).modalCount).toBe(1);
  90  |     for (const key of ["Tab", "Shift+Tab", "Tab"]) {
  91  |       await page.keyboard.press(key);
  92  |       expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  93  |     }
  94  |     const lockedY = await page.evaluate(() => scrollY);
  95  |     await page.mouse.move(2, 2);
  96  |     await page.mouse.wheel(0, 600);
  97  |     await expect.poll(() => page.evaluate(() => scrollY)).toBe(lockedY);
  98  |     await page.keyboard.press("Escape");
  99  |     await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  100 |     await page.keyboard.press("Escape");
  101 |     await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Mi opción conservada");
  102 |     const eventLog = info.outputPath(`events-${width}.json`);
  103 |     await writeFile(eventLog, JSON.stringify(await page.evaluate(() => (window as unknown as { ux10Events: unknown[] }).ux10Events), null, 2));
  104 |     await info.attach("native-events", { path: eventLog, contentType: "application/json" });
  105 |     await expect(page.getByRole("button", { name: /^Elegir receta/ })).toBeFocused();
  106 |     expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  107 |     await page.keyboard.press("Escape");
  108 |     await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
  109 |     await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Mi opción conservada");
  110 |     await page.keyboard.press("Escape");
  111 |     await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  112 |     await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  113 |     await expect(trigger).toBeFocused();
  114 |     await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  115 |     expect((await evidence(page, info, `closed-${width}`)).modalCount).toBe(0);
  116 |     expect(errors).toEqual([]);
  117 |     expect(requests).toEqual([]);
  118 |   });
  119 | }
  120 | 
```