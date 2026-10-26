# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-16.spec.ts >> UX16 /entries/ux16-entry/offers reserves local content at 1024px until its initial response arrives
- Location: e2e\ux-ui-16.spec.ts:42:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 2
Received:    4
```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver a entradas" [ref=e7] [cursor=pointer]:
      - /url: /
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "Ofertas de Entrada UX16" [active] [level=1] [ref=e10]
        - paragraph [ref=e11]: Presentaciones vendibles de la misma identidad comercial.
      - link "Nueva oferta" [ref=e12] [cursor=pointer]:
        - /url: /entries/ux16-entry/offers/new
  - paragraph [ref=e13]:
    - text: "Estado administrativo de la entrada:"
    - strong [ref=e14]: Inactiva
    - text: . Una oferta activa solo se publica si la entrada está activa y cumple las reglas de publicación.
  - paragraph [ref=e15]: Mostrando 1–1 de 1 ofertas
  - region "Ofertas de la entrada" [ref=e16]:
    - article [ref=e17]:
      - link "Abrir oferta Individual UX16 para editar" [ref=e18] [cursor=pointer]:
        - /url: /entries/ux16-entry/offers/ux16-offer/edit
        - generic [ref=e19]: Imagen de la oferta
        - heading "Individual UX16" [level=2] [ref=e21]
        - paragraph [ref=e22]: Entrada UX16
        - paragraph [ref=e23]: MXN 145.00
      - generic [ref=e24]:
        - generic [ref=e25]: Inactiva
        - 'button "Cambiar estado de oferta Individual UX16: Inactiva" [disabled] [ref=e26]': Activar oferta
        - paragraph [ref=e27]:
          - text: "Grupos de composición:"
          - strong [ref=e28]: "0"
      - button "Eliminar oferta Individual UX16" [ref=e30] [cursor=pointer]: Eliminar oferta
      - paragraph [ref=e31]: Agrega una composición válida para activar esta oferta.
```

# Test source

```ts
  1   | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  2   | import { writeFile } from "node:fs/promises";
  3   | 
  4   | const entry = { id: "ux16-entry", brandName: "Entrada UX16", description: "Contexto confirmado", status: "INACTIVE", categoryIds: [], image: null };
  5   | const category = { id: "ux16-category", name: "Categoría UX16", description: "Clasificación", entryCount: 1 };
  6   | const recipe = { id: "ux16-recipe", name: "Receta UX16", description: "Preparación confirmada", supplies: [] };
  7   | const offer = { id: "ux16-offer", entryId: entry.id, entryName: entry.brandName, presentationTag: "Individual UX16", basePrice: 145, status: "INACTIVE", image: null, slotCount: 0 };
  8   | function collection(data: unknown[], pageSize: number) { return { data, meta: { page: 1, pageSize, total: data.length, totalPages: data.length ? 1 : 0 } }; }
  9   | 
  10  | async function geometry(page: Page, info: TestInfo, name: string) {
  11  |   const measurements = await page.locator("[data-menu-module]").evaluate(module => {
  12  |     const rect = (element: Element) => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; };
  13  |     const collect = (selector: string) => [...module.querySelectorAll(selector)].filter(element => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && !element.closest("[hidden]"); }).map(rect);
  14  |     return { width: module.getBoundingClientRect().width, viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth > innerWidth,
  15  |       heading: collect("[data-route-heading]"), filters: collect('[aria-label="Filtros de entradas"], .recipe-toolbar, .recipe-inventory-controls'),
  16  |       reservation: collect("[data-loading-state]"), images: collect(" .menu-loading__image, .entry-card__image, .offer-card__image, .entry-image-field__preview, .image-dropzone"),
  17  |       content: collect(".menu-loading__item, .entry-form__layout, .entry-card, .offer-card, .category-row, .recipe-card, .offer-commercial-info"),
  18  |       imageZones: collect(".menu-loading__image-zone, .entry-image-field__zone"),
  19  |       actions: collect(".entry-form__actions, .offer-form__actions"),
  20  |       animation: [...module.querySelectorAll(".menu-loading, .menu-loading *")].map(element => getComputedStyle(element).animationName),
  21  |       focus: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName };
  22  |   });
  23  |   const json = info.outputPath(`${name}.json`);
  24  |   await writeFile(json, JSON.stringify(measurements, null, 2));
  25  |   await info.attach(name, { path: json, contentType: "application/json" });
  26  |   const png = info.outputPath(`${name}.png`);
  27  |   await page.screenshot({ path: png, fullPage: true });
  28  |   await info.attach(name, { path: png, contentType: "image/png" });
  29  |   expect(measurements.overflow).toBe(false);
  30  |   expect(measurements.animation.every(value => value === "none")).toBe(true);
  31  |   return measurements;
  32  | }
  33  | 
  34  | for (const width of [390, 1024]) for (const [path, delayed, variant, visible] of [
  35  |   ["/", "/menu/entries", "entries", "Entrada UX16"],
  36  |   ["/categories", "/menu/categories", "rows", "Categoría UX16"],
  37  |   ["/recipes", "/menu/recipes", "rows", "Receta UX16"],
  38  |   ["/entries/ux16-entry/offers", "/menu/offers", "offers", "Individual UX16"],
  39  |   ["/entries/ux16-entry/offers/new", "/menu/entries/ux16-entry", "offer-form", "Etiqueta de presentación (opcional)"],
  40  |   ["/entries/ux16-entry/edit", "/menu/entries/ux16-entry", "entry-form", "Nombre comercial"],
  41  | ] as const) {
  42  |   test(`UX16 ${path} reserves local content at ${width}px until its initial response arrives`, async ({ page }, info) => {
  43  |     let release!: () => void;
  44  |     const gate = new Promise<void>(resolve => { release = resolve; });
  45  |     const unexpected: string[] = []; const errors: string[] = []; const writes: string[] = [];
  46  |     page.on("pageerror", error => errors.push(error.message));
  47  |     await page.setViewportSize({ width, height: 844 });
  48  |     await page.emulateMedia({ reducedMotion: "reduce" });
  49  |     await page.route("**/api/v1/**", async route => {
  50  |       const request = route.request(); const apiPath = new URL(request.url()).pathname.replace("/api/v1", "");
  51  |       if (request.method() !== "GET") { writes.push(request.method()); await route.fulfill({ status: 500, json: {} }); return; }
  52  |       if (apiPath === delayed) await gate;
  53  |       let response: unknown;
  54  |       if (apiPath === "/menu/categories") response = collection([category], 100);
  55  |       else if (apiPath === "/menu/entries") response = collection([{ ...entry, categories: [], offerCount: 1 }], 12);
  56  |       else if (apiPath === "/menu/entries/ux16-entry") response = { data: entry };
  57  |       else if (apiPath === "/menu/offers") response = collection([offer], 12);
  58  |       else if (apiPath === "/menu/recipes") response = collection([recipe], 50);
  59  |       else { unexpected.push(apiPath); await route.fulfill({ status: 500, json: {} }); return; }
  60  |       await route.fulfill({ headers: { ETag: '"ux16-v1"' }, json: response });
  61  |     });
  62  |     try {
  63  |       await page.goto(path);
  64  |       await expect(page.locator(`[data-loading-state="${variant}"]`)).toBeVisible();
  65  |       await expect(page.locator("[data-route-heading]")).toBeVisible();
  66  |       const pending = await geometry(page, info, "pending");
  67  |       expect(pending.reservation.some(box => box.height >= 100)).toBe(true);
  68  |       release();
  69  |       if (variant.endsWith("form")) await expect(page.getByLabel(visible, { exact: true })).toBeEnabled();
  70  |       else await expect(page.getByRole("heading", { name: visible, exact: true })).toBeVisible();
  71  |       await expect(page.locator(`[data-loading-state="${variant}"]`)).toHaveCount(0);
  72  |       const resolved = await geometry(page, info, "resolved");
  73  |       expect(Math.abs(resolved.heading[0].y - pending.heading[0].y)).toBeLessThanOrEqual(1);
  74  |       expect(Math.abs(resolved.content[0].y - pending.content[0].y)).toBeLessThanOrEqual(4);
  75  |       expect(Math.abs(resolved.content[0].x - pending.content[0].x)).toBeLessThanOrEqual(1);
> 76  |       expect(Math.abs(resolved.content[0].width - pending.content[0].width)).toBeLessThanOrEqual(2);
      |                                                                              ^ Error: expect(received).toBeLessThanOrEqual(expected)
  77  |       if (variant === "entries" || variant === "entry-form") {
  78  |         expect(Math.abs(resolved.images[0].height - pending.images[0].height)).toBeLessThanOrEqual(1);
  79  |         expect(Math.abs(resolved.images[0].width - pending.images[0].width)).toBeLessThanOrEqual(2);
  80  |       }
  81  |       const comparison = info.outputPath("comparison.json");
  82  |       await writeFile(comparison, JSON.stringify({ environment: "controlled HTTP fixtures", pending, resolved, headingTopDelta: resolved.heading[0].y - pending.heading[0].y }, null, 2));
  83  |       await info.attach("comparison", { path: comparison, contentType: "application/json" });
  84  |       expect(unexpected).toEqual([]); expect(writes).toEqual([]); expect(errors).toEqual([]);
  85  |     } finally { release(); }
  86  |   });
  87  | }
  88  | 
  89  | test("UX16 a failed recipe refresh retains the confirmed cards and query context", async ({ page }, info) => {
  90  |   let reads = 0; let release!: () => void;
  91  |   const gate = new Promise<void>(resolve => { release = resolve; });
  92  |   const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  93  |   await page.route("**/api/v1/menu/recipes?*", async route => {
  94  |     reads += 1;
  95  |     if (reads === 1) return route.fulfill({ json: collection([recipe], 50) });
  96  |     await gate;
  97  |     return route.fulfill({ status: 503, json: { message: "Unavailable" } });
  98  |   });
  99  |   try {
  100 |     await page.goto("/recipes");
  101 |     await expect(page.getByRole("article", { name: recipe.name })).toBeVisible();
  102 |     const search = page.getByRole("searchbox", { name: "Buscar recetas", exact: true });
  103 |     await search.fill("Otra consulta"); await search.press("Enter");
  104 |     await expect(page.getByText("Actualizando recetas…", { exact: true })).toBeVisible();
  105 |     await expect(page.getByRole("article", { name: recipe.name })).toBeVisible();
  106 |     await expect(page.getByRole("button", { name: `Editar ${recipe.name}`, exact: true })).toBeDisabled();
  107 |     await expect(search).toBeFocused();
  108 |     await geometry(page, info, "refresh-pending");
  109 |     release();
  110 |     await expect(page.getByRole("alert")).toContainText("No se pudieron cargar las recetas.");
  111 |     await expect(page.getByRole("article", { name: recipe.name })).toBeVisible();
  112 |     await expect(page.getByText(/Resultados anteriores: todas las recetas, página 1/)).toBeVisible();
  113 |     await expect(search).toBeFocused();
  114 |     await expect(page.getByText("No hay recetas que coincidan con tu búsqueda.", { exact: true })).toHaveCount(0);
  115 |     await geometry(page, info, "refresh-failed");
  116 |     expect(reads).toBe(2); expect(errors).toEqual([]);
  117 |   } finally { release(); }
  118 | });
  119 | 
  120 | test("UX16 late categories reserve only their open panel and keep entry edits and the chosen file", async ({ page }, info) => {
  121 |   let release!: () => void;
  122 |   const gate = new Promise<void>(resolve => { release = resolve; });
  123 |   const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  124 |   await page.setViewportSize({ width: 390, height: 844 });
  125 |   await page.route("**/api/v1/menu/categories?*", async route => { await gate; await route.fulfill({ json: collection([category], 100) }); });
  126 |   try {
  127 |     await page.goto("/entries/new");
  128 |     const name = page.getByLabel("Nombre comercial", { exact: true });
  129 |     await name.fill("Nombre conservado");
  130 |     const bytes = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 60; return canvas.toDataURL("image/png").split(",")[1]; });
  131 |     await page.getByLabel("Archivo de imagen", { exact: true }).setInputFiles({ name: "ux16.png", mimeType: "image/png", buffer: Buffer.from(bytes, "base64") });
  132 |     await expect(page.getByText("ux16.png", { exact: true })).toBeVisible();
  133 |     const source = await page.getByRole("img", { name: "Vista previa de la imagen de la entrada", exact: true }).getAttribute("src");
  134 |     const categories = page.locator(".entry-category-selector");
  135 |     await expect(categories.locator("[data-loading-state]")).toHaveCount(0);
  136 |     await geometry(page, info, "categories-closed-pending");
  137 |     await page.getByRole("button", { name: "Seleccionar categorías", exact: true }).click();
  138 |     await expect(categories.locator('[data-loading-state="options"]')).toBeVisible();
  139 |     const search = page.getByRole("searchbox", { name: "Buscar categorías", exact: true });
  140 |     await expect(search).toBeFocused();
  141 |     await geometry(page, info, "categories-open-pending");
  142 |     release();
  143 |     await expect(page.getByRole("checkbox", { name: category.name, exact: true })).toBeVisible();
  144 |     await expect(categories.locator("[data-loading-state]")).toHaveCount(0);
  145 |     await expect(search).toBeFocused();
  146 |     await expect(name).toHaveValue("Nombre conservado");
  147 |     await expect(page.getByRole("img", { name: "Vista previa de la imagen de la entrada", exact: true })).toHaveAttribute("src", source!);
  148 |     await page.getByRole("checkbox", { name: category.name, exact: true }).check();
  149 |     await expect(page.getByRole("button", { name: "1 categoría seleccionada", exact: true })).toBeVisible();
  150 |     await geometry(page, info, "categories-resolved");
  151 |     expect(errors).toEqual([]);
  152 |   } finally { release(); }
  153 | });
  154 | 
```