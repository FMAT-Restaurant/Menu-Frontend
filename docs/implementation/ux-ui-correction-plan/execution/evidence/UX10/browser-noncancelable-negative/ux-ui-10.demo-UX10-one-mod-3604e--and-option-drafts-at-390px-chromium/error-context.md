# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-10.demo.spec.ts >> UX10 one modal preserves query, recipe and option drafts at 390px
- Location: e2e\ux-ui-10.demo.spec.ts:27:3

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('button', { name: /^Elegir receta/ })
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" getByRole('button', { name: /^Elegir receta/ }) with timeout 5000ms
  - waiting for getByRole('button', { name: /^Elegir receta/ })

```

```yaml
- main:
  - link "← Volver a ofertas":
    - /url: /entries/demo-entry-burger/offers
  - heading "Nueva oferta" [level=1]
  - paragraph:
    - text: "Entrada:"
    - strong: Hamburguesa clásica
  - region "1. Información comercial":
    - heading "1. Información comercial" [level=2]
    - text: Etiqueta de presentación (opcional)
    - textbox "Etiqueta de presentación (opcional)":
      - /placeholder: Ej. Individual, Mediana o Combo
    - paragraph: La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
    - text: Precio base
    - spinbutton "Precio base"
    - paragraph: El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
    - text: Estado de la oferta Inactiva
    - paragraph: Toda oferta se crea con estado inactivo (INACTIVE); la composición del borrador local no garantiza la aceptación del servidor ni activa la oferta automáticamente.
    - text: Imagen de la oferta (obligatoria)
    - button "Seleccionar o arrastrar imagen de la oferta": Arrastra una imagen aquí o haz clic para seleccionar Seleccionar archivo
    - paragraph: "Formatos aceptados: JPEG, PNG o WebP. Tamaño máximo: 10 MiB y 4096 × 4096 px."
  - region "2. Composición":
    - heading "2. Composición" [level=2]
    - paragraph: Cada grupo define su participación y cantidad; cada opción elige su propia fuente de contenido.
    - article "Grupo Principal":
      - heading "Principal" [level=3]
      - text: 1 ronda Inactivo
      - button "Editar grupo Principal": Editar
      - button "Eliminar grupo Principal": Retirar grupo
      - paragraph: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
      - paragraph: Este grupo aún no tiene opciones. Debe incluir al menos una opción para ser válido.
      - button "Agregar opción a Principal": + Agregar opción
    - button "Agregar grupo"
  - link "Cancelar":
    - /url: /entries/demo-entry-burger/offers
  - button "Guardar Oferta"
```

# Test source

```ts
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
  71  |     expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(width);
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
> 105 |     await expect(page.getByRole("button", { name: /^Elegir receta/ })).toBeFocused();
      |                                                                        ^ Error: expect(locator).toBeFocused() failed
  106 |     expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  107 |     await page.keyboard.press("Escape");
  108 |     await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
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