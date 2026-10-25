# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operation-recovery.spec.ts >> Operation recovery across page reloads (e2e/operation-recovery.spec.ts) >> nested recipe creation recovery in offer form: uncertain POST, reload restores parent and nested picker, retry recovers recipe and assigns it to option
- Location: e2e\operation-recovery.spec.ts:101:3

# Error details

```
Error: locator.fill: Error: strict mode violation: getByRole('dialog', { name: 'Nueva receta' }).getByLabel('Nombre') resolved to 2 elements:
    1) <input type="text" value="Papas Rústicas" id="option-display-name" placeholder="Ej. Coca-Cola o Papas a la francesa"/> aka getByPlaceholder('Ej. Coca-Cola o Papas a la')
    2) <input value="" required="" maxlength="255" id="recipe-name" aria-invalid="false" placeholder="Ej. Hamburguesa Hawaiana"/> aka getByRole('textbox', { name: 'Nombre' })

Call log:
  - waiting for getByRole('dialog', { name: 'Nueva receta' }).getByLabel('Nombre')

```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver a ofertas" [ref=e7] [cursor=pointer]:
      - /url: /entries/entry-1/offers
    - generic [ref=e8]:
      - heading "Nueva oferta" [level=1] [ref=e9]
      - paragraph [ref=e10]:
        - text: "Entrada:"
        - strong [ref=e11]: Hamburguesa Gourmet
  - generic [ref=e12]:
    - region [ref=e13]:
      - heading "1. Información comercial" [level=2] [ref=e14]
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]: Etiqueta de presentación (opcional)
            - textbox "Etiqueta de presentación (opcional)" [ref=e19]:
              - /placeholder: Ej. Individual, Mediana o Combo
              - text: Combo Especial
            - paragraph [ref=e20]: La entrada ya identifica el producto; usa esta etiqueta para distinguir su presentación.
          - generic [ref=e21]:
            - generic [ref=e22]: Precio base
            - generic [ref=e23]:
              - generic [aria-hidden] [ref=e24]: $
              - spinbutton "Precio base" [ref=e25]: "195"
            - paragraph [ref=e26]: El precio base pertenece a la oferta y no suma automáticamente precios de componentes.
          - generic [ref=e27]:
            - generic [ref=e28]: Estado de la oferta
            - generic [ref=e29]:
              - generic [ref=e30]: Inactiva
              - paragraph [ref=e31]: Toda oferta se crea con estado inactivo (INACTIVE); la composición del borrador local no garantiza la aceptación del servidor ni activa la oferta automáticamente.
        - generic [ref=e33]:
          - generic [ref=e34]: Imagen de la oferta (obligatoria)
          - button "Seleccionar o arrastrar imagen de la oferta" [ref=e35] [cursor=pointer]:
            - generic [ref=e36]:
              - generic [ref=e41]: Arrastra una imagen aquí o haz clic para seleccionar
              - generic [ref=e42]: Seleccionar archivo
          - paragraph [ref=e43]: "Formatos aceptados: JPEG, PNG o WebP. Tamaño máximo: 10 MiB y 4096 × 4096 px."
    - region [ref=e44]:
      - generic [ref=e46]:
        - heading "2. Composición" [level=2] [ref=e47]
        - paragraph [ref=e48]: Cada grupo define su participación y cantidad; cada opción elige su propia fuente de contenido.
      - generic [ref=e49]:
        - article "Grupo Acompañamiento" [ref=e50]:
          - generic [ref=e51]:
            - generic [ref=e52]:
              - heading "Acompañamiento" [level=3] [ref=e53]
              - generic [ref=e54]:
                - generic [ref=e55]: 1 ronda
                - generic [ref=e56]: Inactivo
            - generic [ref=e57]:
              - button "Editar grupo Acompañamiento" [ref=e58] [cursor=pointer]: Editar
              - button "Eliminar grupo Acompañamiento" [ref=e59] [cursor=pointer]: Retirar grupo
          - generic [ref=e60]:
            - paragraph [ref=e61]: Retirar grupos u opciones modifica este borrador. Se aplica al guardar la oferta.
            - paragraph [ref=e62]: Este grupo aún no tiene opciones. Debe incluir al menos una opción para ser válido.
          - button "Agregar opción a Acompañamiento" [ref=e64] [cursor=pointer]: + Agregar opción
        - button "Agregar grupo" [ref=e65] [cursor=pointer]:
          - generic [aria-hidden] [ref=e66]: +
    - generic [ref=e68]:
      - link "Cancelar" [ref=e69] [cursor=pointer]:
        - /url: /entries/entry-1/offers
      - button "Guardar Oferta" [ref=e70] [cursor=pointer]
  - dialog [ref=e71]:
    - region [ref=e74]:
      - generic [ref=e75]:
        - heading "Nueva receta" [level=2] [ref=e76]
        - button "Volver a elegir receta" [ref=e77] [cursor=pointer]
      - generic [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e82]:
            - generic [ref=e83]: Nombre
            - textbox "Nombre" [active] [ref=e84]:
              - /placeholder: Ej. Hamburguesa Hawaiana
          - generic [ref=e85]:
            - generic [ref=e86]: Descripción
            - textbox "Descripción" [ref=e87]:
              - /placeholder: Descripción breve de la receta
          - generic [ref=e88]:
            - generic [ref=e89]: Instrucciones
            - textbox "Instrucciones" [ref=e90]:
              - /placeholder: Pasos de preparación
          - group "Insumos del inventario" [ref=e91]:
            - button "+ Agregar insumo" [ref=e94] [cursor=pointer]: Agregar insumo
            - generic [ref=e97]:
              - searchbox "Buscar insumos de inventario" [ref=e98]
              - button "Buscar insumos" [ref=e99] [cursor=pointer]
            - table [ref=e100]:
              - rowgroup [ref=e101]:
                - row [ref=e102]:
                  - columnheader "Insumo seleccionado" [ref=e103]
                  - columnheader "Cantidad" [ref=e104]
                  - columnheader "U. Medida" [ref=e105]
                  - columnheader "Acción" [ref=e106]
              - rowgroup [ref=e107]:
                - row [ref=e108]:
                  - cell "Seleccione insumo…" [ref=e109]:
                    - combobox "Insumo 1" [ref=e110]:
                      - option "Seleccione insumo…" [selected]
                      - option "Papas Criollas"
                  - cell [ref=e111]:
                    - spinbutton "Cantidad del insumo 1" [ref=e112]: "1"
                  - cell "--" [ref=e113]
                  - cell [ref=e114]:
                    - button "Eliminar insumo 1" [disabled] [ref=e115]
        - generic [ref=e118]:
          - button "Volver a elegir receta" [ref=e119] [cursor=pointer]
          - button "Guardar receta" [ref=e120] [cursor=pointer]
```

# Test source

```ts
  94  |     expect(postRequests[1].key).toBe(initialKey);
  95  |     expect(postRequests[1].body).toEqual({
  96  |       name: "Pastas Artesanales",
  97  |       description: "Hechas a mano cada mañana",
  98  |     });
  99  |   });
  100 | 
  101 |   test("nested recipe creation recovery in offer form: uncertain POST, reload restores parent and nested picker, retry recovers recipe and assigns it to option", async ({
  102 |     page,
  103 |   }) => {
  104 |     const postRecipeRequests: Array<{ key?: string; body?: unknown }> = [];
  105 |     let shouldFailRecipePost = true;
  106 | 
  107 |     await page.route("**/api/v1/menu/entries/entry-1", (route) =>
  108 |       route.fulfill({
  109 |         json: {
  110 |           data: {
  111 |             id: "entry-1",
  112 |             brandName: "Hamburguesa Gourmet",
  113 |             description: "Carne angus",
  114 |             status: "ACTIVE",
  115 |             categoryIds: [],
  116 |           },
  117 |         },
  118 |       }),
  119 |     );
  120 | 
  121 |     await page.route("**/api/v1/menu/recipes?*", (route) =>
  122 |       route.fulfill({
  123 |         json: { data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } },
  124 |       }),
  125 |     );
  126 | 
  127 |     await page.route("**/api/v1/inventory/items?*", (route) =>
  128 |       route.fulfill({
  129 |         json: {
  130 |           data: [{ id: "inv-papas", name: "Papas Criollas", unit: "kg" }],
  131 |           meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  132 |         },
  133 |       }),
  134 |     );
  135 | 
  136 |     await page.route("**/api/v1/menu/recipes", async (route) => {
  137 |       const key = route.request().headers()["idempotency-key"];
  138 |       const body = route.request().postDataJSON();
  139 |       postRecipeRequests.push({ key, body });
  140 | 
  141 |       if (shouldFailRecipePost) {
  142 |         shouldFailRecipePost = false;
  143 |         return route.abort("timedout");
  144 |       }
  145 | 
  146 |       const created = {
  147 |         id: "rec-papas-horno",
  148 |         name: "Papas al Horno",
  149 |         description: "Al romero y sal marina",
  150 |         instructions: "Hornear 30 minutos a 200C",
  151 |         supplies: [{ inventoryItemId: "inv-papas", quantity: 2 }],
  152 |       };
  153 |       return route.fulfill({
  154 |         status: 201,
  155 |         headers: { ETag: '"rev-rec-1"' },
  156 |         json: { data: created },
  157 |       });
  158 |     });
  159 | 
  160 |     // 1. Navigate to new offer page
  161 |     await page.goto("/entries/entry-1/offers/new");
  162 |     await expect(page.getByRole("heading", { name: "Nueva oferta", level: 1 })).toBeVisible();
  163 | 
  164 |     // 2. Fill commercial fields
  165 |     await page.getByLabel("Etiqueta de presentación (opcional)").fill("Combo Especial");
  166 |     await page.getByLabel("Precio base").fill("195");
  167 | 
  168 |     // 3. Create a slot
  169 |     await page.getByRole("button", { name: "Agregar grupo" }).click();
  170 |     const slotDialog = page.getByRole("dialog", { name: "Definir nuevo grupo" });
  171 |     await expect(slotDialog).toBeVisible();
  172 |     await slotDialog.getByLabel("Nombre del grupo").fill("Acompañamiento");
  173 |     await slotDialog.getByRole("button", { name: "Guardar grupo" }).click();
  174 |     await expect(slotDialog).not.toBeVisible();
  175 | 
  176 |     // 4. Open option modal
  177 |     await page.getByRole("button", { name: "Agregar opción a Acompañamiento" }).click();
  178 |     const optionModal = page.getByRole("dialog", { name: "Agregar opción · Acompañamiento" });
  179 |     await expect(optionModal).toBeVisible();
  180 | 
  181 |     // 5. Fill custom display name and open recipe picker
  182 |     await optionModal.getByLabel("Nombre mostrado (opcional)").fill("Papas Rústicas");
  183 |     await optionModal.getByRole("button", { name: /Elegir receta/ }).click();
  184 | 
  185 |     // 6. Inside recipe picker, open new recipe dialog
  186 |     const recipePicker = page.getByRole("dialog", { name: "Elegir receta · Acompañamiento" });
  187 |     await expect(recipePicker).toBeVisible();
  188 |     await recipePicker.getByRole("button", { name: "+ Nueva receta" }).click();
  189 | 
  190 |     const recipeDialog = page.getByRole("dialog", { name: "Nueva receta" });
  191 |     await expect(recipeDialog).toBeVisible();
  192 |     await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  193 | 
> 194 |     await recipeDialog.getByLabel("Nombre").fill("Papas al Horno");
      |                                             ^ Error: locator.fill: Error: strict mode violation: getByRole('dialog', { name: 'Nueva receta' }).getByLabel('Nombre') resolved to 2 elements:
  195 |     await recipeDialog.getByLabel("Descripción").fill("Al romero y sal marina");
  196 |     await recipeDialog.getByLabel("Instrucciones").fill("Hornear 30 minutos a 200C");
  197 |     await recipeDialog.getByLabel("Insumo 1", { exact: true }).selectOption("inv-papas");
  198 |     await recipeDialog.getByLabel("Cantidad del insumo 1").fill("2");
  199 | 
  200 |     // 7. Save recipe -> times out
  201 |     await recipeDialog.getByRole("button", { name: "Guardar receta" }).click();
  202 |     await expect(recipeDialog.getByRole("alert")).toBeVisible();
  203 |     await expect(recipeDialog.getByRole("button", { name: "Reintentar" })).toBeVisible();
  204 | 
  205 |     expect(postRecipeRequests).toHaveLength(1);
  206 |     const initialKey = postRecipeRequests[0].key;
  207 |     expect(initialKey).toBeTruthy();
  208 | 
  209 |     // 8. Real browser reload (F5)
  210 |     await page.reload();
  211 | 
  212 |     // 9. After reload, parent offer form retains commercial info, and nested recipe dialog reopens
  213 |     await expect(page.getByLabel("Etiqueta de presentación (opcional)")).toHaveValue("Combo Especial");
  214 |     await expect(page.getByLabel("Precio base")).toHaveValue("195");
  215 | 
  216 |     const restoredRecipeDialog = page.getByRole("dialog", { name: "Nueva receta" });
  217 |     await expect(restoredRecipeDialog).toBeVisible();
  218 |     await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
  219 |     await expect(restoredRecipeDialog.getByLabel("Nombre")).toHaveValue("Papas al Horno");
  220 |     await expect(restoredRecipeDialog.getByLabel("Descripción")).toHaveValue("Al romero y sal marina");
  221 |     await expect(restoredRecipeDialog.getByLabel("Instrucciones")).toHaveValue("Hornear 30 minutos a 200C");
  222 | 
  223 |     expect(postRecipeRequests).toHaveLength(1); // 0 POSTs upon reload
  224 | 
  225 |     // 10. Click manual retry
  226 |     const retryBtn = restoredRecipeDialog.getByRole("button", { name: "Reintentar" });
  227 |     await expect(retryBtn).toBeEnabled();
  228 |     await retryBtn.click();
  229 | 
  230 |     // 11. Recipe succeeds, recipe dialog closes, and option modal retains custom name and adopts created recipe
  231 |     await expect(restoredRecipeDialog).not.toBeVisible();
  232 |     const restoredOptionModal = page.getByRole("dialog", { name: "Agregar opción · Acompañamiento" });
  233 |     await expect(restoredOptionModal).toBeVisible();
  234 |     await expect(restoredOptionModal.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Papas Rústicas");
  235 |     await expect(restoredOptionModal.getByText("Receta asignada: Papas al Horno")).toBeVisible();
  236 | 
  237 |     // 12. Save option into slot
  238 |     await restoredOptionModal.getByRole("button", { name: "Guardar opción" }).click();
  239 |     await expect(restoredOptionModal).not.toBeVisible();
  240 |     await expect(page.locator("dialog[open]:modal")).toHaveCount(0);
  241 | 
  242 |     // Option is visible in composition
  243 |     await expect(page.getByText("Papas Rústicas")).toBeVisible();
  244 | 
  245 |     // Verify exactly 2 requests with identical Idempotency-Key
  246 |     expect(postRecipeRequests).toHaveLength(2);
  247 |     expect(postRecipeRequests[1].key).toBe(initialKey);
  248 |     expect(postRecipeRequests[1].body).toEqual(postRecipeRequests[0].body);
  249 |   });
  250 | 
  251 |   test("entry creation recovery: two-stage flow with image upload and entry create across real reload (F5)", async ({
  252 |     page,
  253 |   }) => {
  254 |     const uploadRequests: Array<{ key?: string }> = [];
  255 |     const entryRequests: Array<{ key?: string; body?: unknown }> = [];
  256 |     const shouldFailUpload = false;
  257 |     let shouldFailEntry = true;
  258 | 
  259 |     await page.route("**/api/v1/menu/entries?*", (route) =>
  260 |       route.fulfill({
  261 |         json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
  262 |       }),
  263 |     );
  264 | 
  265 |     await page.route("**/api/v1/menu/categories?*", (route) =>
  266 |       route.fulfill({
  267 |         json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
  268 |       }),
  269 |     );
  270 | 
  271 |     await page.route("**/api/v1/media/images", async (route) => {
  272 |       const key = route.request().headers()["idempotency-key"];
  273 |       uploadRequests.push({ key });
  274 | 
  275 |       if (shouldFailUpload) {
  276 |         return route.abort("timedout");
  277 |       }
  278 | 
  279 |       return route.fulfill({
  280 |         status: 201,
  281 |         json: {
  282 |           data: {
  283 |             id: "img-recovered-123",
  284 |             url: "https://example.com/images/burger.png",
  285 |             thumbnailUrl: "https://example.com/images/burger-thumb.png",
  286 |           },
  287 |         },
  288 |       });
  289 |     });
  290 | 
  291 |     await page.route("**/api/v1/menu/entries", async (route) => {
  292 |       const key = route.request().headers()["idempotency-key"];
  293 |       const body = route.request().postDataJSON();
  294 |       entryRequests.push({ key, body });
```