# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-03.demo.spec.ts >> narrow forms in a wide module use 48px controls and scroll internally while the document stays fixed
- Location: e2e\ux-ui-03.demo.spec.ts:88:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 48
Received: 42
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - main [ref=f1e5]:
    - generic [ref=f1e6]:
      - link "Volver al menú" [ref=f1e7] [cursor=pointer]:
        - /url: /
      - generic [ref=f1e8]:
        - generic [ref=f1e9]:
          - heading "Biblioteca de recetas" [level=1] [ref=f1e10]
          - paragraph [ref=f1e11]: Consulta y administra las recetas base y sus insumos.
        - button "+ Nueva receta" [ref=f1e12] [cursor=pointer]: Nueva receta
    - region "Biblioteca de recetas" [ref=f1e15]:
      - search [ref=f1e17]:
        - generic [ref=f1e18]: Buscar recetas
        - generic [ref=f1e19]:
          - searchbox "Buscar recetas" [ref=f1e24]
          - button "Buscar ahora" [ref=f1e25] [cursor=pointer]: Buscar
      - list [ref=f1e26]:
        - listitem [ref=f1e27]:
          - article [ref=f1e28]:
            - generic [ref=f1e29]:
              - generic [ref=f1e30]:
                - heading "Hamburguesa de res" [level=3] [ref=f1e31]
                - paragraph [ref=f1e32]: Preparación base de la hamburguesa clásica.
              - generic [ref=f1e33]:
                - button "Editar Hamburguesa de res" [ref=f1e34] [cursor=pointer]: Editar
                - button "Eliminar Hamburguesa de res" [ref=f1e35] [cursor=pointer]: Eliminar
            - paragraph [ref=f1e37]:
              - strong [ref=f1e38]: "Insumos:"
              - text: Carne de res (180 g), Pan brioche (1 pza), Queso cheddar (30 g)
        - listitem [ref=f1e39]:
          - article [ref=f1e40]:
            - generic [ref=f1e41]:
              - generic [ref=f1e42]:
                - heading "Limonada de la casa" [level=3] [ref=f1e43]
                - paragraph [ref=f1e44]: Bebida preparada al momento.
              - generic [ref=f1e45]:
                - button "Editar Limonada de la casa" [ref=f1e46] [cursor=pointer]: Editar
                - button "Eliminar Limonada de la casa" [ref=f1e47] [cursor=pointer]: Eliminar
            - paragraph [ref=f1e49]:
              - strong [ref=f1e50]: "Insumos:"
              - text: Jugo de limón (60 ml), Agua mineral (300 ml)
        - listitem [ref=f1e51]:
          - article [ref=f1e52]:
            - generic [ref=f1e53]:
              - generic [ref=f1e54]:
                - heading "Brownie artesanal" [level=3] [ref=f1e55]
                - paragraph [ref=f1e56]: Base de chocolate para el postre.
              - generic [ref=f1e57]:
                - button "Editar Brownie artesanal" [ref=f1e58] [cursor=pointer]: Editar
                - button "Eliminar Brownie artesanal" [ref=f1e59] [cursor=pointer]: Eliminar
            - paragraph [ref=f1e61]:
              - strong [ref=f1e62]: "Insumos:"
              - text: Chocolate (80 g)
  - dialog [ref=f1e63]:
    - generic [ref=f1e64]:
      - heading "Nueva receta" [level=2] [ref=f1e65]
      - button "Cerrar formulario" [ref=f1e66] [cursor=pointer]
    - generic [ref=f1e69]:
      - generic [ref=f1e70]:
        - generic [ref=f1e71]:
          - generic [ref=f1e72]: Nombre
          - textbox "Nombre" [active] [ref=f1e73]:
            - /placeholder: Ej. Hamburguesa Hawaiana
        - generic [ref=f1e74]:
          - generic [ref=f1e75]: Descripción
          - textbox "Descripción" [ref=f1e76]:
            - /placeholder: Descripción breve de la receta
        - generic [ref=f1e77]:
          - generic [ref=f1e78]: Instrucciones
          - textbox "Instrucciones" [ref=f1e79]:
            - /placeholder: Pasos de preparación
        - group "Insumos del inventario" [ref=f1e80]:
          - button "+ Agregar insumo" [ref=f1e83] [cursor=pointer]: Agregar insumo
          - generic [ref=f1e86]:
            - searchbox "Buscar insumos de inventario" [ref=f1e87]
            - button "Buscar insumos" [ref=f1e88] [cursor=pointer]
          - table [ref=f1e89]:
            - rowgroup [ref=f1e90]:
              - row [ref=f1e91]:
                - columnheader "Insumo seleccionado" [ref=f1e92]
                - columnheader "Cantidad" [ref=f1e93]
                - columnheader "U. Medida" [ref=f1e94]
                - columnheader "Acción" [ref=f1e95]
            - rowgroup [ref=f1e96]:
              - row [ref=f1e97]:
                - cell "Seleccione insumo…" [ref=f1e98]:
                  - combobox "Insumo 1" [ref=f1e99]:
                    - option "Seleccione insumo…" [selected]
                    - option "Carne de res"
                    - option "Pan brioche"
                    - option "Queso cheddar"
                    - option "Jugo de limón"
                    - option "Agua mineral"
                    - option "Chocolate"
                - cell [ref=f1e100]:
                  - spinbutton "Cantidad del insumo 1" [ref=f1e101]: "1"
                - cell "--" [ref=f1e102]
                - cell [ref=f1e103]:
                  - button "Eliminar insumo 1" [disabled] [ref=f1e104]
      - generic [ref=f1e107]:
        - button "Cancelar" [ref=f1e108] [cursor=pointer]
        - button "Guardar receta" [ref=f1e109] [cursor=pointer]
```

# Test source

```ts
  2   | import { writeFile } from "node:fs/promises";
  3   | 
  4   | test.beforeEach(async ({ page }) => {
  5   |   const errors: string[] = [];
  6   |   const api: string[] = [];
  7   |   page.on("pageerror", error => errors.push(error.message));
  8   |   page.on("request", request => {
  9   |     if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url());
  10  |   });
  11  |   await page.exposeFunction("assertUx03Demo", () => {
  12  |     expect(errors).toEqual([]);
  13  |     expect(api).toEqual([]);
  14  |   });
  15  | });
  16  | 
  17  | test.afterEach(async ({ page }) => {
  18  |   await page.evaluate(async () => {
  19  |     await (window as unknown as { assertUx03Demo(): Promise<void> }).assertUx03Demo();
  20  |   });
  21  | });
  22  | 
  23  | async function saveEvidence(page: Page, info: TestInfo, name: string, data: unknown) {
  24  |   const path = info.outputPath(`${name}.json`);
  25  |   await writeFile(path, JSON.stringify(data, null, 2));
  26  |   await info.attach(`${name}.json`, { path, contentType: "application/json" });
  27  |   await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
  28  | }
  29  | 
  30  | async function backdropMeasures(page: Page) {
  31  |   return page.locator("dialog[open]").evaluateAll(dialogs => dialogs.map(dialog => ({
  32  |     name: dialog.getAttribute("aria-label") || dialog.querySelector("h2")?.textContent,
  33  |     modal: dialog.matches(":modal"),
  34  |     backdrop: getComputedStyle(dialog, "::backdrop").backgroundColor,
  35  |     covered: dialog.hasAttribute("data-modal-covered"),
  36  |     width: dialog.getBoundingClientRect().width,
  37  |     height: dialog.getBoundingClientRect().height,
  38  |   })));
  39  | }
  40  | 
  41  | for (const scenario of [
  42  |   { name: "archived entry", path: "/", trigger: "Eliminar definitivamente Especial de temporada", dialog: "Eliminar entrada archivada", cancel: "Cancelar eliminación" },
  43  |   { name: "inactive offer", path: "/entries/demo-entry-burger/offers", trigger: "Eliminar oferta Combo con bebida", dialog: "Eliminar oferta inactiva", cancel: "Cancelar" },
  44  |   { name: "recipe", path: "/recipes", trigger: "Eliminar Hamburguesa de res", dialog: "¿Eliminar receta?", cancel: "Cancelar" },
  45  | ]) {
  46  |   test(`${scenario.name}: one native backdrop, safe focus, scroll lock, Cancel and Escape restore the exact session`, async ({ page }, info) => {
  47  |     await page.setViewportSize({ width: 390, height: 600 });
  48  |     await page.goto(scenario.path);
  49  |     const trigger = page.getByRole("button", { name: scenario.trigger, exact: true });
  50  |     await trigger.scrollIntoViewIfNeeded();
  51  |     await trigger.focus();
  52  |     const original = await page.evaluate(() => ({ scrollY, style: document.body.getAttribute("style"), rootStyle: document.documentElement.getAttribute("style"), anchorY: document.querySelector("h1")!.getBoundingClientRect().y }));
  53  |     for (const close of ["cancel", "escape"]) {
  54  |       await trigger.click();
  55  |       const dialog = page.getByRole("dialog", { name: scenario.dialog, exact: true });
  56  |       const cancel = dialog.getByRole("button", { name: scenario.cancel, exact: true });
  57  |       await expect(cancel).toBeFocused();
  58  |       await expect(page.locator("dialog[open]")).toHaveCount(1);
  59  |       await expect(page.locator(".dialog-backdrop")).toHaveCSS("display", "contents");
  60  |       const measures = await backdropMeasures(page);
  61  |       expect(measures).toHaveLength(1);
  62  |       expect(measures[0].modal).toBe(true);
  63  |       expect(measures[0].backdrop).toBe("rgba(17, 24, 39, 0.4)");
  64  |       expect(await page.evaluate(() => document.querySelector("h1")!.getBoundingClientRect().y)).toBeCloseTo(original.anchorY, 0);
  65  |       const lockedY = await page.evaluate(() => scrollY);
  66  |       await page.keyboard.press("PageDown");
  67  |       await page.keyboard.press("PageUp");
  68  |       await page.mouse.move(2, 2);
  69  |       await page.mouse.wheel(0, 700);
  70  |       await expect.poll(() => page.evaluate(() => scrollY)).toBe(lockedY);
  71  |       await expect(page.locator("body")).toHaveCSS("position", "fixed");
  72  |       for (let index = 0; index < 4; index += 1) {
  73  |         await page.keyboard.press("Tab");
  74  |         expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  75  |       }
  76  |       await saveEvidence(page, info, `${scenario.name.replaceAll(" ", "-")}-${close}`, { original, lockedY, measures });
  77  |       if (close === "cancel") await cancel.click();
  78  |       else await page.keyboard.press("Escape");
  79  |       await expect(page.locator("dialog[open]")).toHaveCount(0);
  80  |       await expect(trigger).toBeFocused();
  81  |       await expect.poll(() => page.evaluate(() => scrollY)).toBe(original.scrollY);
  82  |       expect(await page.evaluate(() => document.body.getAttribute("style") || "")).toBe(original.style || "");
  83  |       expect(await page.evaluate(() => document.documentElement.getAttribute("style") || "")).toBe(original.rootStyle || "");
  84  |     }
  85  |   });
  86  | }
  87  | 
  88  | test("narrow forms in a wide module use 48px controls and scroll internally while the document stays fixed", async ({ page }, info) => {
  89  |   await page.setViewportSize({ width: 1440, height: 600 });
  90  |   await page.goto("/categories");
  91  |   const categoryTrigger = page.getByRole("button", { name: "Nueva categoría" });
  92  |   await categoryTrigger.click();
  93  |   const category = page.getByRole("dialog", { name: "Crear categoría" });
  94  |   expect((await category.boundingBox())!.width).toBeLessThan(768);
  95  |   expect((await category.getByLabel("Nombre", { exact: true }).boundingBox())!.height).toBe(48);
  96  |   expect((await category.getByRole("button", { name: "Cerrar formulario" }).boundingBox())!.width).toBe(48);
  97  |   await page.keyboard.press("Escape");
  98  |   await expect(categoryTrigger).toBeFocused();
  99  |   await page.goto("/recipes");
  100 |   await page.getByRole("button", { name: /Nueva receta/ }).click();
  101 |   const recipe = page.getByRole("dialog", { name: "Nueva receta", exact: true });
> 102 |   expect((await recipe.getByLabel("Nombre", { exact: true }).boundingBox())!.height).toBe(48);
      |                                                                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  103 |   const fields = recipe.locator(".recipe-form-dialog__fields");
  104 |   const start = await fields.evaluate(el => ({ scroll: el.scrollTop, overflow: el.scrollHeight > el.clientHeight }));
  105 |   expect(start.overflow).toBe(true);
  106 |   await fields.hover();
  107 |   await page.mouse.wheel(0, 500);
  108 |   await expect.poll(() => fields.evaluate(el => el.scrollTop)).toBeGreaterThan(start.scroll);
  109 |   const top = await page.evaluate(() => scrollY);
  110 |   await page.mouse.move(2, 2);
  111 |   await page.mouse.wheel(0, 900);
  112 |   await expect.poll(() => page.evaluate(() => scrollY)).toBe(top);
  113 |   await saveEvidence(page, info, "form-container-and-scroll", { moduleWidth: 1440, categoryControl: 48, recipeControl: 48, recipe: await backdropMeasures(page), internalScroll: await fields.evaluate(el => el.scrollTop) });
  114 |   await page.keyboard.press("Escape");
  115 |   await expect(page.locator("dialog[open]")).toHaveCount(0);
  116 | });
  117 | 
  118 | test("nested existing recipe flow shares its lock and only its top native backdrop is colored", async ({ page }, info) => {
  119 |   await page.setViewportSize({ width: 390, height: 700 });
  120 |   await page.goto("/entries/demo-entry-burger/offers/new");
  121 |   await page.getByRole("button", { name: "Agregar grupo" }).click();
  122 |   await page.getByLabel("Nombre del grupo").fill("Grupo modal");
  123 |   await page.getByRole("button", { name: "Guardar grupo" }).click();
  124 |   await page.getByRole("button", { name: "Agregar opción a Grupo modal" }).click();
  125 |   await page.getByLabel("Nombre mostrado (opcional)").fill("Borrador conservado");
  126 |   await page.getByRole("button", { name: "Elegir receta" }).click();
  127 |   await page.getByRole("button", { name: /Nueva receta/ }).click();
  128 |   await expect(page.locator("dialog[open]")).toHaveCount(3);
  129 |   const measures = await backdropMeasures(page);
  130 |   expect(measures.filter(measure => measure.backdrop === "rgba(17, 24, 39, 0.4)")).toHaveLength(1);
  131 |   expect(measures.filter(measure => measure.covered)).toHaveLength(2);
  132 |   await saveEvidence(page, info, "nested-backdrop-ownership", measures);
  133 |   await page.keyboard.press("Escape");
  134 |   await expect(page.locator("dialog[open]")).toHaveCount(2);
  135 |   await expect(page.locator("body")).toHaveCSS("position", "fixed");
  136 |   await page.keyboard.press("Escape");
  137 |   await expect(page.locator("dialog[open]")).toHaveCount(1);
  138 |   await expect(page.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Borrador conservado");
  139 |   await page.keyboard.press("Escape");
  140 |   await expect(page.locator("dialog[open]")).toHaveCount(0);
  141 |   await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  142 | });
  143 | 
  144 | test.describe("touch emulation", () => {
  145 |   test.use({ hasTouch: true, viewport: { width: 390, height: 700 } });
  146 |   test("a touch gesture on the backdrop leaves the long catalog in place", async ({ page }, info) => {
  147 |     await page.goto("/");
  148 |     const trigger = page.getByRole("button", { name: "Eliminar definitivamente Especial de temporada" });
  149 |     await trigger.scrollIntoViewIfNeeded();
  150 |     await trigger.click();
  151 |     const lockedY = await page.evaluate(() => scrollY);
  152 |     const session = await page.context().newCDPSession(page);
  153 |     await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 2, y: 600 }] });
  154 |     await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 2, y: 250 }] });
  155 |     await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  156 |     await expect.poll(() => page.evaluate(() => scrollY)).toBe(lockedY);
  157 |     await saveEvidence(page, info, "emulated-touch-backdrop", { lockedY, after: await page.evaluate(() => scrollY), physicalDevice: false });
  158 |     await page.keyboard.press("Escape");
  159 |     await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  160 |   });
  161 | });
  162 | 
```