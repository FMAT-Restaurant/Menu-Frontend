# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-15.spec.ts >> UX15 a suspended editor does not steal focus after another interaction
- Location: e2e\ux-ui-15.spec.ts:24:1

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('link', { name: 'Nueva entrada', exact: true }) resolved to 2 elements:
    1) <a href="/entries/new" data-discover="true" class="button button--primary">Nueva entrada</a> aka locator('header').getByRole('link', { name: 'Nueva entrada' })
    2) <a href="/entries/new" data-discover="true" class="button button--primary">Nueva entrada</a> aka getByRole('link', { name: 'Nueva entrada' }).nth(1)

Call log:
  - waiting for getByRole('link', { name: 'Nueva entrada', exact: true })

```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e7]:
    - heading "Entradas del menú" [active] [level=1] [ref=e9]
    - generic [ref=e10]:
      - link "Biblioteca de recetas" [ref=e11] [cursor=pointer]:
        - /url: /recipes
      - link "Categorías" [ref=e12] [cursor=pointer]:
        - /url: /categories
      - link "Nueva entrada" [ref=e13] [cursor=pointer]:
        - /url: /entries/new
  - region "Filtros de entradas" [ref=e14]:
    - search [ref=e15]:
      - generic [ref=e16]: Buscar entradas
      - generic [ref=e17]:
        - searchbox "Buscar entradas" [ref=e22]
        - button "Buscar ahora" [ref=e23] [cursor=pointer]: Buscar
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]: Categoría
        - combobox "Categoría" [ref=e27]:
          - option "Todas las categorías" [selected]
          - option "Sin categoría"
      - generic [ref=e28]:
        - generic [ref=e29]: Estado administrativo
        - combobox "Estado administrativo" [ref=e30]:
          - option "Todos los estados" [selected]
          - option "Activa"
          - option "Inactiva"
          - option "Archivada"
    - button "Limpiar filtros" [disabled] [ref=e31]
  - generic [ref=e32]:
    - paragraph [ref=e34]: Mostrando 0–0 de 0 entradas
    - generic [ref=e35]:
      - generic [ref=e36]: Entradas por página
      - combobox "Entradas por página" [ref=e37]:
        - option "6"
        - option "12" [selected]
        - option "24"
  - generic [ref=e39]:
    - heading "Aún no hay entradas." [level=2] [ref=e44]
    - paragraph [ref=e45]: Crea la primera entrada para comenzar a administrar el menú.
    - link "Nueva entrada" [ref=e46] [cursor=pointer]:
      - /url: /entries/new
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { routeEvidence } from "./ux-ui-15-evidence";
  3  | 
  4  | test("UX15 delayed entry context updates the task title without moving the user's focus", async ({ page }, info) => {
  5  |   let release!: () => void;
  6  |   const gate = new Promise<void>(resolve => { release = resolve; });
  7  |   const entry = { id: "entry-1", brandName: "Bowl tardío", description: "Arroz", status: "INACTIVE", categoryIds: [], image: null };
  8  |   await page.route("**/api/v1/menu/entries/entry-1", async route => { await gate; await route.fulfill({ json: { data: entry } }); });
  9  |   await page.route("**/api/v1/menu/offers?*", route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  10 |   const errors: string[] = [];
  11 |   page.on("pageerror", error => errors.push(error.message));
  12 |   await page.goto("/entries/entry-1/offers");
  13 |   await expect(page.getByRole("heading", { name: "Ofertas de la entrada", exact: true })).toBeFocused();
  14 |   const back = page.getByRole("link", { name: /Volver a entradas/ });
  15 |   await back.focus();
  16 |   await page.keyboard.press("Shift");
  17 |   release();
  18 |   await expect(page).toHaveTitle("Ofertas de Bowl tardío | FMAT Restaurant");
  19 |   await expect(back).toBeFocused();
  20 |   await routeEvidence(page, info, "late-context");
  21 |   expect(errors).toEqual([]);
  22 | });
  23 | 
  24 | test("UX15 a suspended editor does not steal focus after another interaction", async ({ page }, info) => {
  25 |   let release!: () => void;
  26 |   const gate = new Promise<void>(resolve => { release = resolve; });
  27 |   let requested!: () => void;
  28 |   const requestedChunk = new Promise<void>(resolve => { requested = resolve; });
  29 |   await page.route("**/assets/EntryFormPage-*.js", async route => { requested(); await gate; await route.continue(); });
  30 |   await page.route("**/api/v1/menu/categories?*", route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } }));
  31 |   await page.route("**/api/v1/menu/entries?*", route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } } }));
  32 |   await page.goto("/");
  33 |   await expect(page.getByRole("heading", { name: "Entradas del menú", exact: true })).toBeFocused();
> 34 |   await page.getByRole("link", { name: "Nueva entrada", exact: true }).click();
     |                                                                        ^ Error: locator.click: Error: strict mode violation: getByRole('link', { name: 'Nueva entrada', exact: true }) resolved to 2 elements:
  35 |   await requestedChunk;
  36 |   await expect(page.getByText("Cargando página…", { exact: true })).toBeVisible();
  37 |   await page.keyboard.press("Tab");
  38 |   release();
  39 |   await expect(page.getByRole("heading", { name: "Nueva entrada", exact: true })).toBeVisible();
  40 |   await expect(page).toHaveTitle("Nueva entrada | FMAT Restaurant");
  41 |   await expect(page.getByRole("heading", { name: "Nueva entrada", exact: true })).not.toBeFocused();
  42 |   await routeEvidence(page, info, "suspended-route");
  43 | });
  44 | 
```