# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-11.demo.spec.ts >> UX11 browser back keeps entry image/categories and discards once to the exact filtered catalog
- Location: e2e\ux-ui-11.demo.spec.ts:52:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "borrador.png"
Received: undefined
```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver a entradas" [ref=e7] [cursor=pointer]:
      - /url: /?q=Hamburguesa&page=1
    - generic [ref=e8]:
      - heading "Editar entrada" [level=1] [ref=e9]
      - paragraph [ref=e10]: Nombre, descripción, categorías e imagen de referencia.
  - generic [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]:
        - region [ref=e14]:
          - heading "Identidad de la entrada" [level=2] [ref=e15]
          - generic [ref=e16]:
            - generic [ref=e17]: Nombre comercial
            - textbox "Nombre comercial" [ref=e18]: Hamburguesa con borrador UX11
          - generic [ref=e19]:
            - generic [ref=e20]: Descripción
            - textbox "Descripción" [ref=e21]: Carne de res, queso cheddar y pan brioche.
        - group "Categorías" [ref=e22]:
          - paragraph [ref=e24]: Puedes asignar varias o guardar sin clasificación.
          - button "2 categorías seleccionadas" [active] [ref=e25] [cursor=pointer]
          - list "Categorías seleccionadas" [ref=e28]:
            - listitem [ref=e29]:
              - generic [ref=e30]: Platos fuertes
              - button "Retirar categoría Platos fuertes" [ref=e31] [cursor=pointer]
            - listitem [ref=e34]:
              - generic [ref=e35]: Bebidas
              - button "Retirar categoría Bebidas" [ref=e36] [cursor=pointer]
      - complementary [ref=e39]:
        - region [ref=e40]:
          - heading "Imagen de referencia" [level=2] [ref=e41]
          - button "Cambiar imagen" [ref=e42] [cursor=pointer]:
            - img "Vista previa de la imagen de la entrada" [ref=e44]
          - button "Archivo de imagen" [ref=e46]
          - paragraph [ref=e47]: borrador.png
          - paragraph [ref=e48]: JPEG, PNG o WebP · hasta aprox. 10,49 MB y 4096 × 4096 px.
        - group "Estado administrativo" [ref=e49]:
          - combobox "Estado administrativo" [ref=e52]:
            - option "Activa" [selected]
            - option "Inactiva"
            - option "Archivada"
          - paragraph [ref=e53]: Activar la entrada no cambia sus ofertas ni garantiza su publicación.
    - generic [ref=e54]:
      - button "Cancelar" [ref=e55] [cursor=pointer]
      - button "Guardar cambios" [ref=e56] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  2   | import { writeFile } from "node:fs/promises";
  3   | 
  4   | test.beforeEach(async ({ page }) => {
  5   |   const errors: string[] = []; const api: string[] = [];
  6   |   page.on("pageerror", error => errors.push(error.message));
  7   |   page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.url()); });
  8   |   await page.exposeFunction("assertUx11Demo", () => { expect(errors).toEqual([]); expect(api).toEqual([]); });
  9   | });
  10  | test.afterEach(async ({ page }) => {
  11  |   await page.evaluate(async () => (window as unknown as { assertUx11Demo(): Promise<void> }).assertUx11Demo());
  12  | });
  13  | async function evidence(page: Page, info: TestInfo, name: string) {
  14  |   const data = await page.evaluate(() => ({ url: location.href, modals: document.querySelectorAll("dialog[open]:modal").length,
  15  |     focus: document.activeElement?.id || document.activeElement?.textContent, bodyPosition: getComputedStyle(document.body).position,
  16  |     dialogs: [...document.querySelectorAll("dialog[open]")].map(el => ({ width: el.getBoundingClientRect().width, backdrop: getComputedStyle(el, "::backdrop").backgroundColor })) }));
  17  |   const json = info.outputPath(`${name}.json`); await writeFile(json, JSON.stringify(data, null, 2));
  18  |   await info.attach(name, { path: json, contentType: "application/json" });
  19  |   const png = info.outputPath(`${name}.png`); await page.screenshot({ path: png, fullPage: true });
  20  |   await info.attach(`${name}-image`, { path: png, contentType: "image/png" });
  21  | }
  22  | 
  23  | for (const family of ["category", "recipe"] as const) {
  24  |   test(`UX11 ${family} keeps edits in its original modal and closes directly after reversal`, async ({ page }, info) => {
  25  |     await page.setViewportSize({ width: 390, height: 844 });
  26  |     await page.goto(family === "category" ? "/categories" : "/recipes");
  27  |     const trigger = page.getByRole("button", { name: family === "category" ? "Nueva categoría" : "+ Nueva receta", exact: true });
  28  |     await trigger.click(); await page.keyboard.press("Escape");
  29  |     await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  30  |     await trigger.click();
  31  |     const node = await page.locator("dialog[open]:modal").elementHandle();
  32  |     const name = page.getByLabel("Nombre", { exact: true });
  33  |     await name.fill("Borrador conservado UX11");
  34  |     await page.keyboard.press("Escape");
  35  |     await expect(page.getByRole("button", { name: "Seguir editando", exact: true })).toBeFocused();
  36  |     await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  37  |     expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  38  |     await evidence(page, info, `${family}-confirm`);
  39  |     await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
  40  |     await expect(name).toHaveValue("Borrador conservado UX11"); await expect(name).toBeFocused();
  41  |     await name.fill(""); await page.keyboard.press("Escape");
  42  |     await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  43  |     await expect(trigger).toBeFocused();
  44  |     await trigger.click(); await name.fill("Descartar explícitamente");
  45  |     await page.getByRole("button", { name: "Cerrar formulario", exact: true }).click();
  46  |     await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  47  |     await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  48  |     await expect(trigger).toBeFocused();
  49  |   });
  50  | }
  51  | 
  52  | test("UX11 browser back keeps entry image/categories and discards once to the exact filtered catalog", async ({ page }, info) => {
  53  |   await page.setViewportSize({ width: 390, height: 844 });
  54  |   await page.goto("/?q=Hamburguesa&page=1");
  55  |   await page.getByRole("link", { name: "Editar Hamburguesa clásica", exact: true }).click();
  56  |   const name = page.getByLabel("Nombre comercial", { exact: true });
  57  |   await expect(name).toHaveValue("Hamburguesa clásica");
  58  |   const editorUrl = page.url();
  59  |   await name.fill("Hamburguesa con borrador UX11");
  60  |   await page.locator("#entry-categoryIds").click();
  61  |   await page.getByRole("checkbox", { name: "Bebidas", exact: true }).check();
  62  |   await page.locator("#entry-categoryIds").click();
  63  |   const buffer = Buffer.from(await page.evaluate(() => {
  64  |     const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 48;
  65  |     return canvas.toDataURL("image/png").split(",")[1];
  66  |   }), "base64");
  67  |   await page.getByLabel("Archivo de imagen", { exact: true }).setInputFiles({ name: "borrador.png", mimeType: "image/png", buffer });
  68  |   await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
  69  |   await page.goBack();
  70  |   await expect(page.getByRole("button", { name: "Seguir editando", exact: true })).toBeVisible();
  71  |   await expect(page).toHaveURL(editorUrl);
  72  |   await evidence(page, info, "entry-back");
  73  |   await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
  74  |   await expect(name).toHaveValue("Hamburguesa con borrador UX11");
> 75  |   expect(await page.getByLabel("Archivo de imagen", { exact: true }).evaluate(el => (el as HTMLInputElement).files?.[0]?.name)).toBe("borrador.png");
      |                                                                                                                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  76  |   await page.locator("#entry-categoryIds").click();
  77  |   await expect(page.getByRole("checkbox", { name: "Bebidas", exact: true })).toBeChecked();
  78  |   await page.locator("#entry-categoryIds").click();
  79  |   await page.goBack();
  80  |   await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  81  |   await expect(page).toHaveURL(/\/\?q=Hamburguesa&page=1$/);
  82  |   await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeVisible();
  83  |   await page.goForward();
  84  |   await expect(name).toHaveValue("Hamburguesa clásica");
  85  |   await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  86  | });
  87  | 
  88  | test("UX11 route exit protects a retained recipe even when the offer and option remain unchanged", async ({ page }, info) => {
  89  |   await page.setViewportSize({ width: 390, height: 844 });
  90  |   await page.goto("/entries/demo-entry-burger/offers");
  91  |   const listUrl = page.url();
  92  |   await page.getByRole("link", { name: "Abrir oferta Combo con bebida para editar", exact: true }).click();
  93  |   await page.getByRole("button", { name: "Editar opción Hamburguesa clásica", exact: true }).click();
  94  |   await page.getByRole("button", { name: /^Elegir receta/ }).click();
  95  |   await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  96  |   await page.getByLabel("Nombre", { exact: true }).fill("Receta retenida UX11");
  97  |   await page.keyboard.press("Escape");
  98  |   await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  99  |   await page.keyboard.press("Escape");
  100 |   await expect(page.getByRole("button", { name: /^Elegir receta/ })).toBeFocused();
  101 |   const node = await page.locator("dialog[open]:modal").elementHandle();
  102 |   await page.goBack();
  103 |   await expect(page.getByRole("button", { name: "Seguir editando", exact: true })).toBeFocused();
  104 |   await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  105 |   expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  106 |   await evidence(page, info, "retained-recipe");
  107 |   await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
  108 |   await page.getByRole("button", { name: /^Elegir receta/ }).click();
  109 |   await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  110 |   await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Receta retenida UX11");
  111 |   await page.keyboard.press("Escape");
  112 |   await page.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  113 |   await page.keyboard.press("Escape");
  114 |   await page.goBack();
  115 |   await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  116 |   await expect(page).toHaveURL(listUrl);
  117 |   await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  118 |   await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  119 | });
  120 | 
  121 | test("UX11 reload uses the native warning only while a category has unsaved changes", async ({ page }, info) => {
  122 |   await page.goto("/categories");
  123 |   await page.getByRole("button", { name: "Nueva categoría", exact: true }).click();
  124 |   await page.getByLabel("Nombre", { exact: true }).fill("No perder por recarga");
  125 |   let warnings = 0;
  126 |   page.on("dialog", async dialog => { expect(dialog.type()).toBe("beforeunload"); warnings += 1; await dialog.dismiss(); });
  127 |   const warning = page.waitForEvent("dialog");
  128 |   await page.reload().catch(error => {
  129 |     if (!(error instanceof Error) || !/ERR_ABORTED|Navigation.*cancel|net::ERR_FAILED/i.test(error.message)) throw error;
  130 |   });
  131 |   await warning;
  132 |   await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("No perder por recarga");
  133 |   expect(warnings).toBe(1);
  134 |   await evidence(page, info, "native-unload");
  135 |   await page.keyboard.press("Escape");
  136 |   await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  137 |   await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  138 |   await page.reload();
  139 |   await expect(page.getByRole("heading", { name: "Categorías", exact: true })).toBeVisible();
  140 |   expect(warnings).toBe(1);
  141 | });
  142 | 
```