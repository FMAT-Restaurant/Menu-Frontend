# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: closure-review-regressions.spec.ts >> RC04: each Escape affects only the active step and restores focus within one dialog
- Location: e2e\closure-review-regressions.spec.ts:43:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('button', { name: 'Continuar editando', exact: true })
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" getByRole('button', { name: 'Continuar editando', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Continuar editando', exact: true })

```

```yaml
- main:
  - link "← Volver a ofertas":
    - /url: /entries/entry-1/offers
  - heading "Nueva oferta" [level=1]
  - paragraph:
    - text: "Entrada:"
    - strong: Entrada
  - region "1. Información comercial":
    - heading "1. Información comercial" [level=2]
    - text: Etiqueta de presentación (opcional)
    - textbox "Etiqueta de presentación (opcional)":
      - /placeholder: Ej. Individual, Mediana o Combo
      - text: Borrador conservado
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
    - /url: /entries/entry-1/offers
  - button "Guardar Oferta"
  - dialog "¿Descartar los cambios sin guardar?":
    - heading "¿Descartar los cambios sin guardar?" [level=2]
    - paragraph: Si sigues editando, se conservarán todos los datos de este formulario.
    - button "Seguir editando"
    - button "Descartar cambios"
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | 
  3   | const recipe = { id: "recipe-1", name: "Receta base", description: "Preparación", instructions: "Cocinar",
  4   |   supplies: [{ inventoryItemId: "item-1", quantity: 1, inventoryItem: { id: "item-1", name: "Insumo", unit: "kg" } }] };
  5   | 
  6   | test.beforeEach(async ({ page }) => {
  7   |   await page.route("**/api/v1/menu/entries/entry-1", route => route.fulfill({ json: { data: {
  8   |     id: "entry-1", brandName: "Entrada", description: "Descripción", status: "ACTIVE", categoryIds: [], image: null,
  9   |   } } }));
  10  |   await page.route("**/api/v1/menu/recipes?*", route => route.fulfill({ json: { data: [recipe],
  11  |     meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
  12  |   await page.route("**/api/v1/inventory/items?*", route => route.fulfill({ json: { data: [recipe.supplies[0].inventoryItem],
  13  |     meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 } } }));
  14  | });
  15  | 
  16  | async function openOption(page: Page, groupName = "Principal") {
  17  |   await page.goto("/entries/entry-1/offers/new");
  18  |   await page.getByLabel("Etiqueta de presentación (opcional)").fill("Borrador conservado");
  19  |   await page.getByRole("button", { name: "Agregar grupo", exact: true }).click();
  20  |   await page.getByLabel("Nombre del grupo").fill(groupName);
  21  |   await page.getByRole("button", { name: "Guardar grupo", exact: true }).click();
  22  |   const trigger = page.getByRole("button", { name: `Agregar opción a ${groupName}`, exact: true });
  23  |   await trigger.click();
  24  |   return trigger;
  25  | }
  26  | 
  27  | test("RC02: quoted group names preserve editor, draft and focus after option cancellation", async ({ page }) => {
  28  |   const errors: string[] = [];
  29  |   page.on("pageerror", error => errors.push(error.message));
  30  |   const trigger = await openOption(page, 'Menú "especial" \\ [casa]');
  31  |   const option = page.getByRole("dialog", { name: 'Agregar opción · Menú "especial" \\ [casa]', exact: true });
  32  |   await option.getByRole("button", { name: "Cancelar", exact: true }).click();
  33  |   await expect(page.getByRole("heading", { name: "Nueva oferta", exact: true })).toBeVisible();
  34  |   await expect(page.getByLabel("Etiqueta de presentación (opcional)")).toHaveValue("Borrador conservado");
  35  |   await expect(trigger).toBeFocused();
  36  |   await trigger.click();
  37  |   await page.keyboard.press("Escape");
  38  |   await expect(option).not.toBeVisible();
  39  |   await expect(trigger).toBeFocused();
  40  |   expect(errors).toEqual([]);
  41  | });
  42  | 
  43  | test("RC04: each Escape affects only the active step and restores focus within one dialog", async ({ page }) => {
  44  |   const trigger = await openOption(page);
  45  |   const option = page.getByRole("dialog", { name: "Agregar opción · Principal", exact: true });
  46  |   const node = await option.elementHandle();
  47  |   const chooseRecipe = option.getByRole("button", { name: /Elegir receta/ });
  48  |   await chooseRecipe.click();
  49  |   const picker = page.getByRole("dialog", { name: "Elegir receta · Principal", exact: true });
  50  |   const createRecipe = picker.getByRole("button", { name: "+ Nueva receta", exact: true });
  51  |   await createRecipe.click();
  52  |   const form = page.getByRole("dialog", { name: "Nueva receta", exact: true });
  53  |   await form.getByLabel("Nombre", { exact: true }).fill("Receta anidada");
  54  |   await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  55  |   await page.keyboard.press("Escape");
  56  |   await expect(form.getByRole("button", { name: "Seguir editando receta", exact: true })).toBeFocused();
  57  |   await expect(form.getByLabel("Nombre", { exact: true })).toHaveValue("Receta anidada");
  58  |   await form.getByRole("button", { name: "Conservar borrador y volver", exact: true }).click();
  59  |   await expect(form).not.toBeVisible();
  60  |   await expect(picker).toBeVisible();
  61  |   await expect(createRecipe).toBeFocused();
  62  |   await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  63  |   await page.keyboard.press("Escape");
  64  |   await expect(picker).not.toBeVisible();
  65  |   await expect(chooseRecipe).toBeFocused();
  66  |   expect(await node!.evaluate(el => el === document.querySelector("dialog[open]:modal"))).toBe(true);
  67  |   await page.keyboard.press("Escape");
> 68  |   await expect(page.getByRole("button", { name: "Continuar editando", exact: true })).toBeFocused();
      |                                                                                       ^ Error: expect(locator).toBeFocused() failed
  69  |   await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  70  |   await expect(option).not.toBeVisible();
  71  |   await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  72  |   await expect(trigger).toBeFocused();
  73  |   await expect(page.getByLabel("Etiqueta de presentación (opcional)")).toHaveValue("Borrador conservado");
  74  | });
  75  | 
  76  | test("RC04: Escape cannot dismiss a nested recipe while its POST is pending", async ({ page }) => {
  77  |   let release!: () => void;
  78  |   const pending = new Promise<void>(resolve => { release = resolve; });
  79  |   let writes = 0;
  80  |   await page.route("**/api/v1/menu/recipes", async route => {
  81  |     if (route.request().method() !== "POST") throw new Error("Expected recipe POST");
  82  |     writes += 1;
  83  |     await pending;
  84  |     await route.fulfill({ status: 201, headers: { ETag: '"recipe-v1"' }, json: { data: { ...recipe, name: "Receta guardada" } } });
  85  |   });
  86  |   await openOption(page);
  87  |   await page.getByRole("button", { name: /Elegir receta/ }).click();
  88  |   await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  89  |   const form = page.getByRole("dialog", { name: "Nueva receta", exact: true });
  90  |   await form.getByLabel("Nombre", { exact: true }).fill("Receta guardada");
  91  |   await form.getByLabel("Descripción", { exact: true }).fill("Preparación");
  92  |   await form.getByLabel("Instrucciones", { exact: true }).fill("Cocinar");
  93  |   await form.getByLabel("Insumo 1", { exact: true }).selectOption("item-1");
  94  |   await form.getByRole("button", { name: "Guardar receta", exact: true }).click();
  95  |   await expect.poll(() => writes).toBe(1);
  96  |   try {
  97  |     await page.keyboard.press("Escape");
  98  |     await expect(form).toBeVisible();
  99  |     await expect(form.getByLabel("Nombre", { exact: true })).toHaveValue("Receta guardada");
  100 |     const backActions = form.getByRole("button", { name: "Volver a elegir receta", exact: true });
  101 |     await expect(backActions).toHaveCount(2);
  102 |     for (const action of await backActions.all()) await expect(action).toBeDisabled();
  103 |     await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  104 |   } finally { release(); }
  105 |   await expect(form).not.toBeVisible();
  106 |   const option = page.getByRole("dialog", { name: "Agregar opción · Principal", exact: true });
  107 |   await expect(option).toBeVisible();
  108 |   await expect(option.getByText("Receta asignada: Receta guardada", { exact: true })).toBeVisible();
  109 |   expect(writes).toBe(1);
  110 |   await option.getByRole("button", { name: "Guardar opción", exact: true }).click();
  111 |   await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  112 | });
  113 | 
```