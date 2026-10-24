# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-ui-03-modal-pending.spec.ts >> pending DELETE keeps Tab and Shift+Tab inside the modal without closing or submitting twice
- Location: e2e\ux-ui-03-modal-pending.spec.ts:4:1

# Error details

```
Error: Tab must keep focus inside the pending modal

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Shift+Tab must keep focus inside the pending modal

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - generic [ref=e6]:
      - paragraph [ref=e7]: Administración del menú
      - heading "Biblioteca de recetas" [level=1] [ref=e8]
      - paragraph [ref=e9]: Consulta y administra las recetas base y sus insumos.
    - link "← Volver al menú" [ref=e10] [cursor=pointer]:
      - /url: /
  - main [ref=e11]:
    - region [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - heading "Recetas de la biblioteca" [level=2] [ref=e15]
          - paragraph [ref=e16]: Las recetas definen los insumos de inventario y preparación.
        - button "+ Nueva receta" [ref=e17] [cursor=pointer]
      - search [ref=e19]:
        - generic [ref=e20]: Buscar recetas
        - generic [ref=e21]:
          - searchbox "Buscar recetas" [ref=e26]
          - button "Buscar ahora" [ref=e27] [cursor=pointer]: Buscar
      - status [ref=e28]: Receta "Receta pendiente UX03" eliminada.
      - generic [ref=e29]:
        - generic [aria-hidden] [ref=e30]: ⌕
        - heading "Aún no hay recetas registradas." [level=3] [ref=e31]
        - paragraph [ref=e32]: Crea una receta para asociar insumos y pasos de preparación.
        - button "Crear receta" [ref=e33] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { writeFile } from "node:fs/promises";
  3  | 
  4  | test("pending DELETE keeps Tab and Shift+Tab inside the modal without closing or submitting twice", async ({ page }, info) => {
  5  |   let releaseDelete: () => void = () => {};
  6  |   const pending = new Promise<void>(resolve => { releaseDelete = resolve; });
  7  |   let writes = 0;
  8  |   let deleted = false;
  9  |   const errors: string[] = [];
  10 |   page.on("pageerror", error => errors.push(error.message));
  11 |   const recipe = { id: "ux03-pending-recipe", name: "Receta pendiente UX03", description: "Caso HTTP controlado", instructions: "Conservar foco durante eliminación", supplies: [] };
  12 | 
  13 |   await page.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: {
  14 |     data: deleted ? [] : [recipe],
  15 |     meta: { page: 1, pageSize: 50, total: deleted ? 0 : 1, totalPages: deleted ? 0 : 1 },
  16 |   } }));
  17 |   await page.route("**/api/v1/menu/recipes/ux03-pending-recipe", async route => {
  18 |     if (route.request().method() === "GET") {
  19 |       return route.fulfill({ headers: { etag: '"ux03-pending-v1"' }, json: { data: recipe } });
  20 |     }
  21 |     if (route.request().method() === "DELETE") {
  22 |       writes += 1;
  23 |       await pending;
  24 |       deleted = true;
  25 |       return route.fulfill({ status: 204 });
  26 |     }
  27 |     return route.continue();
  28 |   });
  29 | 
  30 |   await page.goto("/recipes");
  31 |   await page.getByRole("button", { name: "Eliminar Receta pendiente UX03", exact: true }).click();
  32 |   const dialog = page.getByRole("dialog", { name: "¿Eliminar receta?", exact: true });
  33 |   await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  34 |   await dialog.getByRole("button", { name: "Eliminar receta", exact: true }).click();
  35 | 
  36 |   try {
  37 |     await expect.poll(() => writes).toBe(1);
  38 |     const buttons = dialog.getByRole("button");
  39 |     await expect(buttons).toHaveCount(2);
  40 |     for (const button of await buttons.all()) await expect(button).toBeDisabled();
  41 |     const states: unknown[] = [];
  42 |     const measure = async (step: string) => dialog.evaluate((el, step) => ({
  43 |       step,
  44 |       activeTag: document.activeElement?.tagName,
  45 |       activeName: document.activeElement?.textContent?.trim(),
  46 |       focusWithin: el.contains(document.activeElement),
  47 |       modalOpen: (el as HTMLDialogElement).open,
  48 |     }), step);
  49 |     states.push(await measure("all controls disabled after DELETE"));
  50 |     for (const key of ["Tab", "Shift+Tab"]) {
  51 |       await page.keyboard.press(key);
  52 |       const state = await measure(key);
  53 |       states.push(state);
> 54 |       expect.soft(state.focusWithin, `${key} must keep focus inside the pending modal`).toBe(true);
     |                                                                                         ^ Error: Shift+Tab must keep focus inside the pending modal
  55 |     }
  56 |     await page.keyboard.press("Escape");
  57 |     await expect(dialog).toBeVisible();
  58 |     await page.keyboard.press("Enter");
  59 |     expect(writes, "An in-flight DELETE must never be submitted twice").toBe(1);
  60 |     expect(errors).toEqual([]);
  61 |     const path = info.outputPath("pending-modal-focus.json");
  62 |     await writeFile(path, JSON.stringify({ environment: "production preview with retained HTTP fixture, not demo", writes, states, errors }, null, 2));
  63 |     await info.attach("pending-modal-focus.json", { path, contentType: "application/json" });
  64 |     await page.screenshot({ path: info.outputPath("pending-modal-focus.png") });
  65 |   } finally {
  66 |     releaseDelete();
  67 |   }
  68 |   await expect(dialog).toBeHidden();
  69 |   expect(writes).toBe(1);
  70 | });
  71 | 
```