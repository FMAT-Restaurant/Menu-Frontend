# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-10.demo.spec.ts >> UX10 one modal preserves query, recipe and option drafts at 600px
- Location: e2e\ux-ui-10.demo.spec.ts:27:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Elegir receta', exact: true })

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
    - generic [ref=e72]:
      - heading "Agregar opción · Principal" [level=2] [ref=e73]
      - button "Cerrar modal de opción" [ref=e74] [cursor=pointer]
    - generic [ref=e77]:
      - generic [ref=e78]:
        - generic [ref=e79]:
          - generic [ref=e80]: Nombre mostrado (opcional)
          - textbox "Nombre mostrado (opcional)" [active] [ref=e81]:
            - /placeholder: Ej. Coca-Cola o Papas a la francesa
            - text: Mi opción conservada
          - paragraph [ref=e82]: Puedes usar una etiqueta contextual distinta al nombre de la receta o del artículo.
        - generic [ref=e83]:
          - generic [ref=e84]: "Contenido actual:"
          - paragraph [ref=e85]: Elige una receta de la biblioteca para esta opción.
        - generic [ref=e86]:
          - generic [ref=e87]: Origen del contenido de esta opción
          - button "Elegir receta Seleccionar una preparación de la biblioteca." [ref=e89] [cursor=pointer]:
            - generic [ref=e90]: Elegir receta
            - generic [ref=e91]: Seleccionar una preparación de la biblioteca.
        - generic [ref=e92]:
          - generic [ref=e93]: Disponibilidad
          - paragraph [ref=e94]: Las opciones se crean activas por defecto.
      - generic [ref=e95]:
        - button "Cancelar" [ref=e96] [cursor=pointer]
        - button "Guardar opción" [disabled] [ref=e97]
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
  41  |     const node = await dialog.elementHandle();
  42  |     await page.getByLabel("Nombre mostrado (opcional)").fill("Mi opción conservada");
> 43  |     await page.getByRole("button", { name: "Elegir receta", exact: true }).click();
      |                                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  44  |     const search = page.getByLabel("Buscar recetas", { exact: true });
  45  |     await expect(search).toBeFocused();
  46  |     await search.fill("sin coincidencias UX10");
  47  |     await page.getByRole("button", { name: "Buscar ahora", exact: true }).click();
  48  |     await expect(page.getByText("No hay recetas que coincidan con tu búsqueda.")).toBeVisible();
  49  |     await page.getByRole("button", { name: "Limpiar búsqueda", exact: true }).click();
  50  |     await expect(search).toBeFocused();
  51  |     await search.fill("Limonada");
  52  |     await page.getByRole("button", { name: "Buscar ahora", exact: true }).click();
  53  |     await expect(page.getByRole("article", { name: "Receta Limonada de la casa", exact: true })).toBeVisible();
  54  |     expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(width);
  55  |     const controlHeights = await dialog.locator("button,input").evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height > 0).map(el => el.getBoundingClientRect().height));
  56  |     for (const height of controlHeights) expect(height).toBeGreaterThanOrEqual(48);
  57  |     expect((await evidence(page, info, `selector-${width}`)).modalCount).toBe(1);
  58  |     const create = page.getByRole("button", { name: "+ Nueva receta", exact: true });
  59  |     await create.click();
  60  |     await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();
  61  |     await page.getByLabel("Nombre", { exact: true }).fill("Borrador de receta UX10");
  62  |     await page.keyboard.press("Escape");
  63  |     await expect(page.getByRole("button", { name: "Seguir editando receta", exact: true })).toBeFocused();
  64  |     await page.getByRole("button", { name: "Seguir editando receta", exact: true }).click();
  65  |     await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Borrador de receta UX10");
  66  |     await page.keyboard.press("Escape");
  67  |     await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  68  |     await expect(create).toBeFocused();
  69  |     await expect(search).toHaveValue("Limonada");
  70  |     await create.click();
  71  |     await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Borrador de receta UX10");
  72  |     expect((await evidence(page, info, `create-${width}`)).modalCount).toBe(1);
  73  |     for (const key of ["Tab", "Shift+Tab", "Tab"]) {
  74  |       await page.keyboard.press(key);
  75  |       expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  76  |     }
  77  |     const lockedY = await page.evaluate(() => scrollY);
  78  |     await page.mouse.move(2, 2);
  79  |     await page.mouse.wheel(0, 600);
  80  |     await expect.poll(() => page.evaluate(() => scrollY)).toBe(lockedY);
  81  |     await page.keyboard.press("Escape");
  82  |     await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  83  |     await page.keyboard.press("Escape");
  84  |     await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Mi opción conservada");
  85  |     await expect(page.getByRole("button", { name: "Elegir receta", exact: true })).toBeFocused();
  86  |     expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  87  |     await page.keyboard.press("Escape");
  88  |     await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
  89  |     await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Mi opción conservada");
  90  |     await page.keyboard.press("Escape");
  91  |     await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  92  |     await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  93  |     await expect(trigger).toBeFocused();
  94  |     await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  95  |     expect((await evidence(page, info, `closed-${width}`)).modalCount).toBe(0);
  96  |     expect(errors).toEqual([]);
  97  |     expect(requests).toEqual([]);
  98  |   });
  99  | }
  100 | 
```