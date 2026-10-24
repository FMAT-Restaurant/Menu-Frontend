# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-04.demo.spec.ts >> V18: saving an entry with its category panel open delivers one click after the shorter header
- Location: e2e\ux-ui-04.demo.spec.ts:110:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Entrada con categorías abiertas', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Entrada con categorías abiertas', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Entrada con categorías abiertas', exact: true })

```

```yaml
- main:
  - link "← Volver a entradas":
    - /url: /
  - heading "Nueva entrada" [level=1]
  - paragraph: Nombre, descripción, categorías e imagen de referencia.
  - region "Identidad de la entrada":
    - heading "Identidad de la entrada" [level=2]
    - text: Nombre comercial
    - textbox "Nombre comercial": Entrada con categorías abiertas
    - text: Descripción
    - textbox "Descripción": Conservar el primer intento de guardar.
  - group "Categorías":
    - text: Categorías
    - paragraph: Puedes asignar varias o guardar sin clasificación.
    - button "1 categoría seleccionada"
    - list "Categorías seleccionadas":
      - listitem:
        - text: Platos fuertes
        - button "Retirar categoría Platos fuertes": ×
  - complementary:
    - region "Imagen de referencia":
      - heading "Imagen de referencia" [level=2]
      - button "Cambiar imagen":
        - img "Vista previa de la imagen de la entrada"
        - text: Cambiar imagen
      - button "Archivo de imagen"
      - paragraph: open-category.png
      - paragraph: JPEG, PNG o WebP · hasta aprox. 10,49 MB y 4096 × 4096 px.
  - button "Cancelar"
  - button "Guardar entrada"
```

# Test source

```ts
  40  |       await expect(heading).toHaveAttribute("tabindex", "-1");
  41  |       await expect(heading).toHaveCSS("font-size", "28px");
  42  |       await expect(heading).toHaveCSS("line-height", "36px");
  43  |       await expect(heading).toHaveCSS("color", "rgb(17, 24, 39)");
  44  |       await expect(page.locator(".global-nav, .brand, .brand__mark")).toHaveCount(0);
  45  |       await expect(page.getByText("Administración del menú", { exact: true })).toHaveCount(0);
  46  |       await expect(page.getByText("Administración / Menú / Ofertas", { exact: true })).toHaveCount(0);
  47  |       await expect(page.getByRole("heading", { name: "Categorías del menú", exact: true })).toHaveCount(0);
  48  |       await expect(page.getByRole("heading", { name: "Recetas de la biblioteca", exact: true })).toHaveCount(0);
  49  |       const geometry = await heading.evaluate(element => {
  50  |         const header = element.closest(".task-header")!;
  51  |         const main = header.closest("main")!;
  52  |         const rect = (node: Element) => {
  53  |           const { x, y, width, height, right, bottom } = node.getBoundingClientRect();
  54  |           return { x, y, width, height, right, bottom };
  55  |         };
  56  |         return {
  57  |           path: location.pathname,
  58  |           viewport: innerWidth,
  59  |           moduleWidth: element.closest("[data-menu-module]")!.getBoundingClientRect().width,
  60  |           main: rect(main), header: rect(header), title: rect(element),
  61  |           headerBackground: getComputedStyle(header).backgroundColor,
  62  |           scrollWidth: document.documentElement.scrollWidth,
  63  |         };
  64  |       });
  65  |       expect(geometry.header.y, "The task starts inside the local page gutter, without the old brand row").toBeLessThanOrEqual(24);
  66  |       expect(Math.abs(geometry.header.x - geometry.main.x)).toBeLessThanOrEqual(1);
  67  |       expect(Math.abs(geometry.header.width - geometry.main.width)).toBeLessThanOrEqual(1);
  68  |       expect(geometry.title.right).toBeLessThanOrEqual(geometry.header.right);
  69  |       expect(geometry.headerBackground).toBe("rgba(0, 0, 0, 0)");
  70  |       measurements.push(geometry);
  71  |       await page.screenshot({ path: testInfo.outputPath(`header-${width}-${index}.png`), fullPage: true });
  72  |     }
  73  |     const output = testInfo.outputPath("header-measurements.json");
  74  |     await writeFile(output, JSON.stringify(measurements, null, 2));
  75  |     await testInfo.attach("header-measurements", { path: output, contentType: "application/json" });
  76  |     assertDemo();
  77  |   });
  78  | }
  79  | 
  80  | test("U05/U24: local back links retain catalog filters and offer origins without a brand navigation row", async ({ page }, testInfo) => {
  81  |   const assertDemo = observeDemo(page);
  82  |   const returnTo = "/?q=Hamburguesa&status=ACTIVE&page=1&pageSize=12";
  83  |   await page.goto(returnTo);
  84  |   await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  85  |   for (const name of ["Categorías", "Biblioteca de recetas"]) {
  86  |     await page.getByRole("link", { name, exact: true }).click();
  87  |     const back = page.getByRole("link", { name: /Volver al menú/ });
  88  |     await expect(back).toHaveAttribute("href", returnTo);
  89  |     await back.click();
  90  |     await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
  91  |     await expect(page.getByRole("heading", { name: "Hamburguesa clásica", exact: true })).toBeVisible();
  92  |   }
  93  |   await page.getByRole("link", { name: "Nueva entrada", exact: true }).click();
  94  |   await page.getByRole("link", { name: /Volver a entradas/ }).click();
  95  |   await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
  96  |   await page.getByRole("link", { name: "Ver ofertas de Hamburguesa clásica", exact: true }).click();
  97  |   await page.getByRole("link", { name: "Abrir oferta Individual para editar", exact: true }).click();
  98  |   await expect(page.getByRole("heading", { name: "Editar oferta", exact: true })).toBeVisible();
  99  |   await page.getByRole("link", { name: /Volver a ofertas/ }).click();
  100 |   await expect(page.getByRole("heading", { name: "Ofertas de Hamburguesa clásica", exact: true })).toBeVisible();
  101 |   await page.getByRole("link", { name: /Volver a entradas/ }).click();
  102 |   await expect(page).toHaveURL(url => url.pathname + url.search === returnTo);
  103 |   await expect(page.getByRole("searchbox", { name: "Buscar entradas" })).toHaveValue("Hamburguesa");
  104 |   const output = testInfo.outputPath("return-context.json");
  105 |   await writeFile(output, JSON.stringify({ returnTo, finalUrl: page.url(), selectedQuery: "Hamburguesa" }, null, 2));
  106 |   await testInfo.attach("return-context", { path: output, contentType: "application/json" });
  107 |   assertDemo();
  108 | });
  109 | 
  110 | test("V18: saving an entry with its category panel open delivers one click after the shorter header", async ({ page }, testInfo) => {
  111 |   const assertDemo = observeDemo(page);
  112 |   await page.setViewportSize({ width: 1280, height: 720 });
  113 |   await page.goto("/");
  114 |   await page.getByRole("link", { name: "Nueva entrada", exact: true }).click();
  115 |   await page.getByLabel("Nombre comercial").fill("Entrada con categorías abiertas");
  116 |   await page.getByLabel("Descripción", { exact: true }).fill("Conservar el primer intento de guardar.");
  117 |   const buffer = Buffer.from(await page.evaluate(() => {
  118 |     const canvas = document.createElement("canvas");
  119 |     canvas.width = 80;
  120 |     canvas.height = 60;
  121 |     canvas.getContext("2d")!.fillRect(0, 0, 80, 60);
  122 |     return canvas.toDataURL("image/png").split(",")[1];
  123 |   }), "base64");
  124 |   await page.getByLabel("Archivo de imagen").setInputFiles({ name: "open-category.png", mimeType: "image/png", buffer });
  125 |   await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  126 |   await page.getByRole("checkbox", { name: "Platos fuertes", exact: true }).check();
  127 |   await page.evaluate(() => {
  128 |     const events: unknown[] = [];
  129 |     (window as Window & { ux04ClickEvents?: unknown[] }).ux04ClickEvents = events;
  130 |     for (const name of ["pointerdown", "pointerup", "click", "submit"]) {
  131 |       document.addEventListener(name, event => {
  132 |         const button = document.querySelector<HTMLButtonElement>('.entry-form button[type="submit"]');
  133 |         const bounds = button?.getBoundingClientRect();
  134 |         events.push({ event: event.type, target: (event.target as HTMLElement).tagName, targetText: (event.target as HTMLElement).textContent?.trim(), saveTop: bounds?.top, saveBottom: bounds?.bottom, panelOpen: Boolean(document.querySelector("#entry-category-panel")) });
  135 |       }, { capture: true });
  136 |     }
  137 |   });
  138 |   try {
  139 |     await page.getByRole("button", { name: "Guardar entrada", exact: true }).click();
> 140 |     await expect(page.getByRole("heading", { name: "Entrada con categorías abiertas", exact: true })).toBeVisible();
      |                                                                                                       ^ Error: expect(locator).toBeVisible() failed
  141 |   } finally {
  142 |     const events = await page.evaluate(() => (window as Window & { ux04ClickEvents?: unknown[] }).ux04ClickEvents);
  143 |     const output = testInfo.outputPath("category-save-click.json");
  144 |     await writeFile(output, JSON.stringify(events, null, 2));
  145 |     await testInfo.attach("category-save-click", { path: output, contentType: "application/json" });
  146 |     await page.screenshot({ path: testInfo.outputPath("category-save-result.png"), fullPage: true });
  147 |   }
  148 |   assertDemo();
  149 | });
  150 | 
```