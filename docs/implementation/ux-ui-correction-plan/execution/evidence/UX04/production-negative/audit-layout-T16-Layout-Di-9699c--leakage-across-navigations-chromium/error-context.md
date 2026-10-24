# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit-layout.spec.ts >> T16 Layout, Dimensions, and Accessibility Audit >> R07: area stylesheets load without style leakage across navigations
- Location: e2e\audit-layout.spec.ts:259:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Categorías del Menú' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Categorías del Menú' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Categorías del Menú' })

```

```yaml
- main:
  - link "← Volver al menú":
    - /url: /
  - heading "Catálogo de categorías" [level=1]
  - paragraph: Organiza las entradas del menú por categorías. Una entrada puede pertenecer a varias categorías.
  - button "Nueva categoría"
  - region "Catálogo de categorías":
    - list:
      - listitem:
        - heading "Hamburguesas" [level=3]
        - paragraph: Sin descripción
        - text: Cuenta de entradas no disponible
        - button "Editar Hamburguesas": Editar
      - listitem:
        - heading "Bebidas" [level=3]
        - paragraph: Sin descripción
        - text: Cuenta de entradas no disponible
        - button "Editar Bebidas": Editar
      - listitem:
        - heading "Postres" [level=3]
        - paragraph: Sin descripción
        - text: Cuenta de entradas no disponible
        - button "Editar Postres": Editar
```

# Test source

```ts
  170 |     const addOptionBtn = page.getByRole("button", { name: "Agregar opción a Guarnición" });
  171 |     await addOptionBtn.scrollIntoViewIfNeeded();
  172 |     await addOptionBtn.click();
  173 | 
  174 |     const optionDialog = page.getByRole("dialog", { name: /Agregar opción · Guarnición/ });
  175 |     await expect(optionDialog).toBeVisible();
  176 | 
  177 |     // Check height does not exceed 90% of viewport
  178 |     const optionDialogBox = await optionDialog.boundingBox();
  179 |     expect(optionDialogBox).not.toBeNull();
  180 |     expect(optionDialogBox!.height).toBeLessThanOrEqual(320 * 0.9 + 1);
  181 | 
  182 |     // Verify fields can be scrolled to and focused
  183 |     const optionNameInput = page.getByLabel("Nombre mostrado (opcional)");
  184 |     await expect(optionNameInput).toBeVisible();
  185 |     await optionNameInput.fill("Papas Fritas");
  186 | 
  187 |     const chooseRecipeBtn = page.getByRole("button", { name: "Elegir receta" });
  188 |     await chooseRecipeBtn.scrollIntoViewIfNeeded();
  189 |     await expect(chooseRecipeBtn).toBeVisible();
  190 | 
  191 |     const cancelOptionBtn = page.getByRole("button", { name: "Cancelar" });
  192 |     await cancelOptionBtn.scrollIntoViewIfNeeded();
  193 |     await expect(cancelOptionBtn).toBeVisible();
  194 | 
  195 |     const saveOptionBtn = page.getByRole("button", { name: "Guardar opción" });
  196 |     await saveOptionBtn.scrollIntoViewIfNeeded();
  197 |     await expect(saveOptionBtn).toBeVisible();
  198 | 
  199 |     await page.screenshot({ path: "test-results/t16-after/r06-option-modal-short-390x320.png" });
  200 | 
  201 |     // Cancel closes cleanly and returns focus
  202 |     await cancelOptionBtn.click();
  203 |     await expect(optionDialog).not.toBeVisible();
  204 |   });
  205 | 
  206 |   test("R06 additional checks: CSS zoom and reduced viewport keep dialog controls reachable", async ({ page }) => {
  207 |     await setupRoutes(page);
  208 |     // Desktop 1366x768 at 200% zoom simulates effective 683x384 viewport
  209 |     await page.setViewportSize({ width: 1366, height: 768 });
  210 |     await page.goto("/entries/entry-1/offers/new");
  211 | 
  212 |     // Add slot
  213 |     await page.getByRole("button", { name: "Agregar grupo" }).click();
  214 |     const slotDialog = page.getByRole("dialog", { name: /Definir nuevo grupo/ });
  215 |     await expect(slotDialog).toBeVisible();
  216 |     await page.getByLabel("Nombre del grupo").fill("Postre");
  217 |     await page.getByRole("button", { name: "Guardar grupo" }).click();
  218 |     await expect(slotDialog).not.toBeVisible();
  219 | 
  220 |     // Open option modal
  221 |     await page.getByRole("button", { name: "Agregar opción a Postre" }).click();
  222 |     const optionDialog = page.getByRole("dialog", { name: /Agregar opción · Postre/ });
  223 |     await expect(optionDialog).toBeVisible();
  224 | 
  225 |     // Apply 200% zoom (style.zoom additional verification)
  226 |     await page.evaluate(() => {
  227 |       document.documentElement.style.zoom = "200%";
  228 |     });
  229 | 
  230 |     // Check modal height in layout pixels does not exceed available height
  231 |     const dialogHeight = await optionDialog.evaluate((el) => el.clientHeight);
  232 |     const viewportHeight = await page.evaluate(() => window.innerHeight);
  233 |     expect(dialogHeight).toBeLessThanOrEqual(viewportHeight);
  234 | 
  235 |     // Save and cancel buttons remain reachable
  236 |     const cancelBtn = page.getByRole("button", { name: "Cancelar" });
  237 |     await cancelBtn.scrollIntoViewIfNeeded();
  238 |     await expect(cancelBtn).toBeVisible();
  239 | 
  240 |     await page.screenshot({ path: "test-results/t16-after/r06-option-modal-zoom-200.png" });
  241 | 
  242 |     await page.evaluate(() => {
  243 |       document.documentElement.style.zoom = "100%";
  244 |     });
  245 | 
  246 |     // True browser zoom 200% on 1366x768 desktop results in 683x384 effective viewport
  247 |     await page.setViewportSize({ width: 683, height: 384 });
  248 |     const modalHeightAt384 = await optionDialog.evaluate((el) => el.getBoundingClientRect().height);
  249 |     expect(modalHeightAt384).toBeLessThanOrEqual(384 * 0.9 + 1);
  250 | 
  251 |     const cancelBtn384 = page.getByRole("button", { name: "Cancelar" });
  252 |     await cancelBtn384.scrollIntoViewIfNeeded();
  253 |     await expect(cancelBtn384).toBeVisible();
  254 | 
  255 |     await cancelBtn384.click();
  256 |     await expect(optionDialog).not.toBeVisible();
  257 |   });
  258 | 
  259 |   test("R07: area stylesheets load without style leakage across navigations", async ({ page }) => {
  260 |     await setupRoutes(page);
  261 |     await page.setViewportSize({ width: 1366, height: 768 });
  262 | 
  263 |     // Direct navigation to Catalog
  264 |     await page.goto("/");
  265 |     await expect(page.getByRole("heading", { name: "Hamburguesa Clásica" })).toBeVisible();
  266 |     await page.screenshot({ path: "test-results/t16-after/01-catalog-desktop.png" });
  267 | 
  268 |     // Navigate to Categories
  269 |     await page.goto("/categories");
> 270 |     await expect(page.getByRole("heading", { name: "Categorías del Menú" })).toBeVisible();
      |                                                                              ^ Error: expect(locator).toBeVisible() failed
  271 |     await page.screenshot({ path: "test-results/t16-after/02-categories-desktop.png" });
  272 | 
  273 |     // Navigate to Entry Form
  274 |     await page.goto("/entries/new");
  275 |     await expect(page.getByRole("heading", { name: "Nueva entrada" })).toBeVisible();
  276 |     await page.screenshot({ path: "test-results/t16-after/03-entry-form-desktop.png" });
  277 | 
  278 |     // Navigate to Offers List
  279 |     await page.goto("/entries/entry-1/offers");
  280 |     await expect(page.getByRole("heading", { name: /Ofertas de/i })).toBeVisible();
  281 |     await page.screenshot({ path: "test-results/t16-after/04-offers-list-desktop.png" });
  282 | 
  283 |     // Navigate to Offer Form
  284 |     await page.goto("/entries/entry-1/offers/new");
  285 |     await expect(page.getByRole("heading", { name: "Nueva oferta" })).toBeVisible();
  286 |     await page.screenshot({ path: "test-results/t16-after/05-offer-form-desktop.png" });
  287 | 
  288 |     // Navigate to Recipes
  289 |     await page.goto("/recipes");
  290 |     await expect(page.getByRole("heading", { name: "Biblioteca de recetas" })).toBeVisible();
  291 |     await page.screenshot({ path: "test-results/t16-after/07-recipes-desktop.png" });
  292 | 
  293 |     // Verify all pages loaded without horizontal overflow
  294 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  295 |     expect(overflow).toBeLessThanOrEqual(1);
  296 |   });
  297 | });
  298 | 
```