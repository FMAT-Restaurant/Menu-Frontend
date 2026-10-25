# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-11.demo.spec.ts >> UX11 reload uses the native warning only while a category has unsaved changes
- Location: e2e\ux-ui-11.demo.spec.ts:121:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.reload: Test timeout of 30000ms exceeded.
Call log:
  - waiting for navigation until "load"

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - main [ref=e5]:
    - generic [ref=e6]:
      - link "← Volver al menú" [ref=e7] [cursor=pointer]:
        - /url: /
      - generic [ref=e8]:
        - generic [ref=e9]:
          - heading "Catálogo de categorías" [level=1] [ref=e10]
          - paragraph [ref=e11]: Organiza las entradas del menú por categorías. Una entrada puede pertenecer a varias categorías.
        - button "Nueva categoría" [ref=e12] [cursor=pointer]
    - region "Catálogo de categorías" [ref=e13]:
      - list [ref=e14]:
        - listitem [ref=e15]:
          - generic [ref=e16]:
            - heading "Platos fuertes" [level=3] [ref=e17]
            - paragraph [ref=e18]: Platillos preparados al momento.
            - text: 2 entradas asociadas
          - button "Editar Platos fuertes" [ref=e19] [cursor=pointer]: Editar
        - listitem [ref=e20]:
          - generic [ref=e21]:
            - heading "Bebidas" [level=3] [ref=e22]
            - paragraph [ref=e23]: Bebidas frías y calientes.
            - text: 1 entrada asociada
          - button "Editar Bebidas" [ref=e24] [cursor=pointer]: Editar
        - listitem [ref=e25]:
          - generic [ref=e26]:
            - heading "Postres" [level=3] [ref=e27]
            - paragraph [ref=e28]: Un cierre dulce para la comida.
            - text: 1 entrada asociada
          - button "Editar Postres" [ref=e29] [cursor=pointer]: Editar
  - dialog [ref=e30]:
    - generic [ref=e31]:
      - heading "Crear categoría" [level=2] [ref=e32]
      - button "Cerrar formulario" [ref=e33] [cursor=pointer]
    - generic [ref=e36]:
      - generic [ref=e37]:
        - generic [ref=e38]:
          - generic [ref=e39]: Nombre
          - paragraph [ref=e40]: Obligatorio. Hasta 255 caracteres.
          - textbox "Nombre" [active] [ref=e41]:
            - /placeholder: Ej. Postres
            - text: No perder por recarga
        - generic [ref=e42]:
          - generic [ref=e43]: Descripción
          - paragraph [ref=e44]: Opcional. Hasta 255 caracteres.
          - textbox "Descripción" [ref=e45]:
            - /placeholder: Describe qué entradas agrupa
      - generic [ref=e46]:
        - button "Cancelar" [ref=e47] [cursor=pointer]
        - button "Guardar categoría" [ref=e48] [cursor=pointer]
```

# Test source

```ts
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
  75  |   expect(await page.getByLabel("Archivo de imagen", { exact: true }).evaluate(el => (el as HTMLInputElement).files?.[0]?.name)).toBe("borrador.png");
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
> 128 |   await page.reload().catch(error => {
      |              ^ Error: page.reload: Test timeout of 30000ms exceeded.
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