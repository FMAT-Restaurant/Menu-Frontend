# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-13.demo.spec.ts >> UX13 offer edits announce the named result once and preserve list context
- Location: e2e\ux-ui-13.demo.spec.ts:63:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver a ofertas" [ref=e7] [cursor=pointer]:
      - /url: /entries/demo-entry-burger/offers?q=Individual&page=1
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
              - text: Individual UX13
            - paragraph [ref=e20]: La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
          - generic [ref=e21]:
            - generic [ref=e22]: Precio base (MXN)
            - generic [ref=e23]:
              - generic [aria-hidden] [ref=e24]: MXN
              - spinbutton "Precio base (MXN)" [ref=e25]: "145"
            - paragraph [ref=e26]: MXN 145.00
            - paragraph [ref=e27]: El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
          - generic [ref=e28]:
            - generic [ref=e29]: Estado de la oferta
            - generic [ref=e30]:
              - radiogroup "Estado de la oferta" [ref=e31]:
                - generic [ref=e32] [cursor=pointer]:
                  - radio "Activa" [checked] [ref=e33]
                  - generic [ref=e34]: Activa
                - generic [ref=e35] [cursor=pointer]:
                  - radio "Inactiva" [ref=e36]
                  - generic [ref=e37]: Inactiva
              - paragraph [ref=e38]: El borrador incluye al menos un grupo con opciones activas para solicitar el estado activo. Toda oferta inicia inactiva (INACTIVE) al crearse y la composición local no garantiza la aceptación del servidor hasta guardar.
        - generic [ref=e40]:
          - generic [ref=e41]: Imagen de la oferta (opcional si se conserva)
          - button "Seleccionar o arrastrar imagen de la oferta" [ref=e42] [cursor=pointer]:
            - generic [ref=e43]:
              - img "Vista previa de la oferta" [ref=e44]
              - generic [ref=e45]: Cambiar imagen
          - paragraph [ref=e46]: "Formatos aceptados: JPEG, PNG o WebP. Tamaño máximo: 10 MiB y 4096 × 4096 px."
    - region [ref=e47]:
      - generic [ref=e49]:
        - heading "2. Composición" [level=2] [ref=e50]
        - paragraph [ref=e51]: Cada grupo define su participación y cantidad; cada opción elige su propia fuente de contenido.
      - generic [ref=e52]:
        - article "Grupo Plato principal" [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]:
              - heading "Plato principal" [level=3] [ref=e56]
              - generic [ref=e57]:
                - generic [ref=e58]: 1 ronda
                - generic [ref=e59]: Plato fuerte
                - generic [ref=e60]: Activo
            - generic [ref=e61]:
              - button "Editar grupo Plato principal" [ref=e62] [cursor=pointer]: Editar
              - button "Eliminar grupo Plato principal" [ref=e63] [cursor=pointer]: Retirar grupo
          - generic [ref=e64]:
            - paragraph [ref=e65]: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
            - generic [ref=e67]:
              - generic [ref=e69]:
                - strong [ref=e70]: Hamburguesa clásica
                - generic [ref=e71]: Receta
              - generic [ref=e72]: Activa
              - generic [ref=e73]:
                - button "Cambiar estado de Hamburguesa clásica" [pressed] [ref=e74] [cursor=pointer]: Desactivar
                - button "Editar opción Hamburguesa clásica" [ref=e75] [cursor=pointer]: Editar
                - button "Eliminar opción Hamburguesa clásica" [ref=e76] [cursor=pointer]: Retirar
          - button "Agregar opción a Plato principal" [ref=e78] [cursor=pointer]: + Agregar opción
        - button "Agregar grupo" [active] [ref=e79] [cursor=pointer]:
          - generic [aria-hidden] [ref=e80]: +
    - generic [ref=e82]:
      - link "Cancelar" [ref=e83] [cursor=pointer]:
        - /url: /entries/demo-entry-burger/offers?q=Individual&page=1
      - button "Guardar Oferta" [ref=e84] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  2  | import { writeFile } from "node:fs/promises";
  3  | 
  4  | async function record(page: Page, info: TestInfo, name: string) {
  5  |   const measures = await page.locator("form").evaluate(form => {
  6  |     const footer = form.querySelector("footer")!;
  7  |     const rect = footer.getBoundingClientRect();
  8  |     const active = document.activeElement?.getBoundingClientRect();
  9  |     const diagnostics = { scrollY, viewport: innerHeight, footerPosition: getComputedStyle(footer).position, footerBottom: getComputedStyle(footer).bottom, formTop: form.getBoundingClientRect().top, formBottom: form.getBoundingClientRect().bottom, ancestors: [] as { tag: string; classes: string; overflow: string; height: number; scrollHeight: number; top: number }[] };
  10 |     for (let ancestor = footer.parentElement; ancestor; ancestor = ancestor.parentElement) diagnostics.ancestors.push({ tag: ancestor.tagName, classes: ancestor.className, overflow: getComputedStyle(ancestor).overflowY, height: ancestor.clientHeight, scrollHeight: ancestor.scrollHeight, top: ancestor.getBoundingClientRect().top });
  11 |     return { diagnostics, persistent: form.getAttribute("data-actions-persistent"), formHeight: form.getAttribute("data-form-height"), available: form.getAttribute("data-available-height"), footer: { top: rect.top, bottom: rect.bottom, height: rect.height }, active: active ? { top: active.top, bottom: active.bottom } : null, submitCount: form.querySelectorAll('[type="submit"]').length, overflow: document.documentElement.scrollWidth > innerWidth };
  12 |   });
  13 |   const json = info.outputPath(`${name}.json`);
  14 |   await writeFile(json, JSON.stringify(measures, null, 2));
  15 |   await info.attach(name, { path: json, contentType: "application/json" });
  16 |   const png = info.outputPath(`${name}.png`);
  17 |   await page.screenshot({ path: png, fullPage: true });
  18 |   await info.attach(name, { path: png, contentType: "image/png" });
  19 |   expect(measures.submitCount).toBe(1);
  20 |   expect(measures.overflow).toBe(false);
  21 |   return measures;
  22 | }
  23 | 
  24 | async function expectFocusClearOfFooter(page: Page) {
  25 |   await expect.poll(() => page.locator("form").evaluate(form => {
  26 |     const active = document.activeElement;
  27 |     const footer = form.querySelector("footer")!;
  28 |     if (!(active instanceof HTMLElement) || footer.contains(active)) return false;
  29 |     const bounds = active.getBoundingClientRect();
  30 |     const actions = footer.getBoundingClientRect();
  31 |     return bounds.top >= 0 && bounds.bottom <= innerHeight && bounds.bottom <= actions.top;
> 32 |   })).toBe(true);
     |       ^ Error: expect(received).toBe(expected) // Object.is equality
  33 | }
  34 | 
  35 | for (const [width, height] of [[390, 844], [390, 568], [844, 390], [1440, 1100]]) {
  36 |   test(`UX13 entry actions remain usable at ${width}x${height}`, async ({ page }, info) => {
  37 |     const errors: string[] = []; const api: string[] = [];
  38 |     page.on("pageerror", error => errors.push(error.message));
  39 |     page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  40 |     await page.setViewportSize({ width, height });
  41 |     await page.goto("/entries/new");
  42 |     const heading = page.getByRole("heading", { name: "Nueva entrada", exact: true });
  43 |     await expect(heading).toBeVisible();
  44 |     const save = page.getByRole("button", { name: "Guardar entrada", exact: true });
  45 |     await expect(save).toBeEnabled();
  46 |     await save.focus();
  47 |     await page.keyboard.press("Shift+Tab");
  48 |     await page.keyboard.press("Tab");
  49 |     await expect(save).toBeFocused();
  50 |     const metrics = await record(page, info, "entry-actions");
  51 |     expect(metrics.persistent).toBe(Number(metrics.formHeight) > height ? "true" : "false");
  52 |     await page.locator("#entry-description").focus();
  53 |     await expectFocusClearOfFooter(page);
  54 |     await record(page, info, "entry-field-focus");
  55 |     await save.click();
  56 |     await expect(page.locator(".entry-form [role=alert]").first()).toBeFocused();
  57 |     await expectFocusClearOfFooter(page);
  58 |     await record(page, info, "entry-errors");
  59 |     expect(errors).toEqual([]); expect(api).toEqual([]);
  60 |   });
  61 | }
  62 | 
  63 | test("UX13 offer edits announce the named result once and preserve list context", async ({ page }, info) => {
  64 |   const errors: string[] = []; const api: string[] = [];
  65 |   page.on("pageerror", error => errors.push(error.message));
  66 |   page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  67 |   await page.setViewportSize({ width: 390, height: 568 });
  68 |   await page.goto("/entries/demo-entry-burger/offers?q=Individual&page=1");
  69 |   await page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true }).click();
  70 |   await page.getByLabel("Etiqueta de presentación (opcional)", { exact: true }).fill("Individual UX13");
  71 |   await page.getByRole("button", { name: "Agregar grupo", exact: true }).focus();
  72 |   await record(page, info, "offer-actions");
  73 |   await expectFocusClearOfFooter(page);
  74 |   await page.getByRole("button", { name: "Guardar Oferta", exact: true }).click();
  75 |   await expect(page.getByRole("status").filter({ hasText: 'Oferta "Individual UX13" actualizada.' })).toHaveCount(1);
  76 |   await expect(page).toHaveURL(/offers\?q=Individual&page=1$/);
  77 |   await page.reload();
  78 |   await expect(page.locator("h1[data-route-heading]")).toContainText("Ofertas de");
  79 |   await expect(page.getByText('Oferta "Individual UX13" actualizada.', { exact: true })).toHaveCount(0);
  80 |   expect(errors).toEqual([]); expect(api).toEqual([]);
  81 | });
  82 | 
  83 | test("UX13 CSS 200 percent zoom emulation retains entry focus and one local save", async ({ page }, info) => {
  84 |   await page.setViewportSize({ width: 844, height: 568 });
  85 |   await page.goto("/entries/new");
  86 |   await expect(page.getByRole("heading", { name: "Nueva entrada", exact: true })).toBeVisible();
  87 |   await page.addStyleTag({ content: "html { zoom: 2; }" });
  88 |   await expect(page.getByRole("button", { name: "Guardar entrada", exact: true })).toBeEnabled();
  89 |   await page.locator("#entry-description").focus();
  90 |   await expectFocusClearOfFooter(page);
  91 |   await record(page, info, "css-zoom-200-emulation");
  92 | });
  93 | 
```