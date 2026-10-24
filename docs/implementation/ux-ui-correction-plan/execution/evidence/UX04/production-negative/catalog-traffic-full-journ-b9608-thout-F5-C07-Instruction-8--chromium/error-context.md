# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog-traffic.spec.ts >> full journey: catalog -> create category -> new entry with category -> catalog reflects updates within TTL without F5 (C07, Instruction 8)
- Location: e2e\catalog-traffic.spec.ts:40:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Matcher error: received value must not be null nor undefined

Received has value: undefined

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=e5]:
  - generic [ref=e6]:
    - link "← Volver a entradas" [ref=e7] [cursor=pointer]:
      - /url: /
    - generic [ref=e8]:
      - heading "Nueva entrada" [level=1] [ref=e9]
      - paragraph [ref=e10]: Nombre, descripción, categorías e imagen de referencia.
  - generic [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]:
        - region [ref=e14]:
          - heading "Identidad de la entrada" [level=2] [ref=e15]
          - generic [ref=e16]:
            - generic [ref=e17]: Nombre comercial
            - textbox "Nombre comercial" [ref=e18]: Taco al Pastor
          - generic [ref=e19]:
            - generic [ref=e20]: Descripción
            - textbox "Descripción" [ref=e21]: Tacos con piña y cilantro
        - group "Categorías" [ref=e22]:
          - paragraph [ref=e24]: Puedes asignar varias o guardar sin clasificación.
          - button "1 categoría seleccionada" [ref=e25] [cursor=pointer]:
            - generic [aria-hidden] [ref=e27]: ⌄
          - list "Categorías seleccionadas" [ref=e28]:
            - listitem [ref=e29]:
              - generic [ref=e30]: Tacos Gourmet
              - button "Retirar categoría Tacos Gourmet" [ref=e31] [cursor=pointer]: ×
      - complementary [ref=e32]:
        - region [ref=e33]:
          - heading "Imagen de referencia" [level=2] [ref=e34]
          - button "Cambiar imagen" [ref=e35] [cursor=pointer]:
            - img "Vista previa de la imagen de la entrada" [ref=e37]
          - button "Archivo de imagen" [ref=e39]
          - paragraph [ref=e40]: tacos.png
          - paragraph [ref=e41]: JPEG, PNG o WebP · hasta aprox. 10,49 MB y 4096 × 4096 px.
    - generic [ref=e42]:
      - button "Cancelar" [ref=e43] [cursor=pointer]
      - button "Guardar entrada" [active] [ref=e44] [cursor=pointer]
```

# Test source

```ts
  115 | 
  116 |   await page.route("**/api/v1/menu/entries*", async (route) => {
  117 |     const request = route.request();
  118 |     if (request.method() === "GET") {
  119 |       return route.fulfill({
  120 |         json: {
  121 |           data: mutableEntries,
  122 |           meta: { page: 1, pageSize: 12, total: mutableEntries.length, totalPages: 1 },
  123 |         },
  124 |       });
  125 |     }
  126 |     if (request.method() === "POST") {
  127 |       const body = request.postDataJSON() as { brandName: string; description: string; categoryIds: string[] };
  128 |       postEntryPayload = body;
  129 |       const assignedCategories = mutableCategories
  130 |         .filter((c) => body.categoryIds.includes(c.id))
  131 |         .map((c) => ({ id: c.id, name: c.name }));
  132 | 
  133 |       const newEntryForList: MockEntry = {
  134 |         id: "ent-tacos",
  135 |         brandName: body.brandName.trim(),
  136 |         description: body.description.trim(),
  137 |         status: "ACTIVE",
  138 |         image: null,
  139 |         categories: assignedCategories,
  140 |         offerCount: 0,
  141 |       };
  142 |       mutableEntries.push(newEntryForList);
  143 | 
  144 |       const createdDetail = {
  145 |         id: "ent-tacos",
  146 |         brandName: body.brandName.trim(),
  147 |         description: body.description.trim(),
  148 |         status: "ACTIVE",
  149 |         categoryIds: body.categoryIds,
  150 |         image: {
  151 |           id: "img-tacos-1",
  152 |           url: "https://images.example/tacos.png",
  153 |           thumbnailUrl: "https://images.example/tacos-thumb.png",
  154 |         },
  155 |       };
  156 | 
  157 |       return route.fulfill({
  158 |         status: 201,
  159 |         headers: { ETag: '"ent-rev-1"' },
  160 |         json: { data: createdDetail },
  161 |       });
  162 |     }
  163 |     return route.continue();
  164 |   });
  165 | 
  166 |   // 1. Load catalog to populate cache
  167 |   await page.goto("/");
  168 |   await expect(page.getByRole("heading", { name: "Limonada Casera" })).toBeVisible();
  169 | 
  170 |   // 2. Navigate to Categories via in-app link
  171 |   await page.getByRole("link", { name: "Categorías" }).click();
  172 |   await expect(page.getByRole("heading", { name: "Catálogo de categorías", level: 1 })).toBeVisible();
  173 | 
  174 |   // Open category creation dialog
  175 |   await page.getByRole("button", { name: /Nueva categoría|Crear categoría/ }).click();
  176 |   const catDialog = page.getByRole("dialog", { name: "Crear categoría" });
  177 |   await expect(catDialog).toBeVisible();
  178 | 
  179 |   await catDialog.getByRole("textbox", { name: "Nombre" }).fill("Tacos Gourmet");
  180 |   await catDialog.getByRole("button", { name: "Guardar categoría" }).click();
  181 |   await expect(catDialog).not.toBeVisible();
  182 | 
  183 |   // Verify created category is in the categories list
  184 |   await expect(page.getByRole("heading", { name: "Tacos Gourmet" })).toBeVisible();
  185 | 
  186 |   // 3. Navigate to New Entry via in-app link
  187 |   await page.getByRole("link", { name: /Volver al menú/ }).click();
  188 |   await expect(page.getByRole("heading", { name: "Limonada Casera" })).toBeVisible();
  189 | 
  190 |   await page.getByRole("link", { name: "Nueva entrada" }).click();
  191 |   await expect(page.getByRole("heading", { name: "Nueva entrada" })).toBeVisible();
  192 | 
  193 |   // Fill entry form
  194 |   await page.getByLabel("Nombre comercial").fill("Taco al Pastor");
  195 |   await page.getByLabel("Descripción").fill("Tacos con piña y cilantro");
  196 | 
  197 |   // Attach valid image
  198 |   const png1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  199 |   await page.locator("#entry-image-file").setInputFiles({
  200 |     name: "tacos.png",
  201 |     mimeType: "image/png",
  202 |     buffer: png1x1,
  203 |   });
  204 | 
  205 |   // Select the newly created category
  206 |   await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  207 |   const categoryOption = page.locator(".entry-category-selector__option").filter({ hasText: "Tacos Gourmet" });
  208 |   await expect(categoryOption).toBeVisible();
  209 |   await categoryOption.locator("input[type='checkbox']").check();
  210 | 
  211 |   // Submit entry form
  212 |   await page.getByRole("button", { name: "Guardar entrada" }).click();
  213 | 
  214 |   // 4. Verify categoryId was correctly sent in POST payload
> 215 |   await expect.poll(() => (postEntryPayload as { categoryIds?: string[] } | null)?.categoryIds).toContain("cat-tacos");
      |                                                                                                 ^ Error: expect(received).toContain(expected) // indexOf
  216 | 
  217 |   // 5. Returned to catalog without F5 reload, demonstrating cache invalidation within TTL
  218 |   await expect(page.getByRole("heading", { name: "Entradas del menú" })).toBeVisible();
  219 |   await expect(page.getByRole("heading", { name: "Taco al Pastor" })).toBeVisible();
  220 | 
  221 |   // Verify the category chip "Tacos Gourmet" is visible in the new card
  222 |   const tacoCard = page.locator(".entry-card").filter({ hasText: "Taco al Pastor" });
  223 |   await expect(tacoCard.locator(".category-chip", { hasText: "Tacos Gourmet" })).toBeVisible();
  224 | });
  225 | 
```