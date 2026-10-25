import { expect, test } from "@playwright/test";

test.describe("Operation recovery across page reloads (e2e/operation-recovery.spec.ts)", () => {
  test("category creation recovery: uncertain POST, real browser reload (F5) restores dialog without POST, manual retry sends same Idempotency-Key and recovers category", async ({
    page,
  }) => {
    const categories: Array<{ id: string; name: string; description?: string; entryCount?: number }> = [];
    const postRequests: Array<{ key?: string; body?: unknown }> = [];
    let shouldFailPostWithTimeout = true;

    await page.route("**/api/v1/menu/entries?*", (route) =>
      route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
      }),
    );

    await page.route("**/api/v1/menu/categories?*", (route) =>
      route.fulfill({
        json: {
          data: categories,
          meta: { page: 1, pageSize: 100, total: categories.length, totalPages: 1 },
        },
      }),
    );

    await page.route("**/api/v1/menu/categories", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const body = route.request().postDataJSON();
      postRequests.push({ key, body });

      if (shouldFailPostWithTimeout) {
        shouldFailPostWithTimeout = false;
        // Simulate network timeout or abrupt disconnection without response
        return route.abort("timedout");
      }

      // 2nd attempt with same key succeeds and returns the created category
      const created = { id: "cat-recovered-1", ...body, entryCount: 0 };
      categories.push(created);
      return route.fulfill({
        status: 201,
        headers: { ETag: '"rev-cat-1"' },
        json: { data: created },
      });
    });

    // 1. Navigate to categories page
    await page.goto("/categories");
    await expect(page.getByText("Aún no hay categorías.")).toBeVisible();

    // 2. Open new category dialog and type draft
    await page.getByRole("button", { name: "Crear categoría" }).click();
    const dialog = page.getByRole("dialog", { name: "Crear categoría" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Nombre" }).fill("Pastas Artesanales");
    await dialog.getByRole("textbox", { name: "Descripción" }).fill("Hechas a mano cada mañana");

    // 3. Submit - first attempt will time out
    await dialog.getByRole("button", { name: "Guardar categoría" }).click();

    // 4. Verification of error and manual retry button
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(postRequests).toHaveLength(1);
    const initialKey = postRequests[0].key;
    expect(initialKey).toBeTruthy();

    // 5. Real browser reload (F5 / page.reload())
    await page.reload();

    // 6. After reload, dialog restores automatically from IndexedDB with draft intact, WITHOUT any automatic POST
    const restoredDialog = page.getByRole("dialog", { name: "Crear categoría" });
    await expect(restoredDialog).toBeVisible();
    await expect(restoredDialog.getByRole("textbox", { name: "Nombre" })).toHaveValue("Pastas Artesanales");
    await expect(restoredDialog.getByRole("textbox", { name: "Descripción" })).toHaveValue("Hechas a mano cada mañana");
    expect(postRequests).toHaveLength(1); // 0 automatic POSTs upon mount/reload!

    // 7. Manual retry button is available
    const retryButton = restoredDialog.getByRole("button", { name: "Reintentar" });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();

    // 8. Click Reintentar: resends exact same Idempotency-Key and payload
    await retryButton.click();

    // 9. Succeeds, closes dialog, and displays the created category in the list
    await expect(restoredDialog).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Pastas Artesanales" })).toBeVisible();
    await expect(page.getByText("Hechas a mano cada mañana")).toBeVisible();
    await expect(page.getByText("Categoría creada.")).toBeVisible();

    // Verify exactly 2 requests with identical Idempotency-Key and identical payload
    expect(postRequests).toHaveLength(2);
    expect(postRequests[1].key).toBe(initialKey);
    expect(postRequests[1].body).toEqual({
      name: "Pastas Artesanales",
      description: "Hechas a mano cada mañana",
    });
  });

  test("nested recipe creation recovery in offer form: uncertain POST, reload restores parent and nested picker, retry recovers recipe and assigns it to option", async ({
    page,
  }) => {
    const postRecipeRequests: Array<{ key?: string; body?: unknown }> = [];
    let shouldFailRecipePost = true;

    await page.route("**/api/v1/menu/entries/entry-1", (route) =>
      route.fulfill({
        json: {
          data: {
            id: "entry-1",
            brandName: "Hamburguesa Gourmet",
            description: "Carne angus",
            status: "ACTIVE",
            categoryIds: [],
          },
        },
      }),
    );

    await page.route("**/api/v1/menu/recipes?*", (route) =>
      route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } },
      }),
    );

    await page.route("**/api/v1/inventory/items?*", (route) =>
      route.fulfill({
        json: {
          data: [{ id: "inv-papas", name: "Papas Criollas", unit: "kg" }],
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        },
      }),
    );

    await page.route("**/api/v1/menu/recipes", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const body = route.request().postDataJSON();
      postRecipeRequests.push({ key, body });

      if (shouldFailRecipePost) {
        shouldFailRecipePost = false;
        return route.abort("timedout");
      }

      const created = {
        id: "rec-papas-horno",
        name: "Papas al Horno",
        description: "Al romero y sal marina",
        instructions: "Hornear 30 minutos a 200C",
        supplies: [{ inventoryItemId: "inv-papas", quantity: 2 }],
      };
      return route.fulfill({
        status: 201,
        headers: { ETag: '"rev-rec-1"' },
        json: { data: created },
      });
    });

    // 1. Navigate to new offer page
    await page.goto("/entries/entry-1/offers/new");
    await expect(page.getByRole("heading", { name: "Nueva oferta", level: 1 })).toBeVisible();

    // 2. Fill commercial fields
    await page.getByLabel("Etiqueta de presentación (opcional)").fill("Combo Especial");
    await page.getByLabel("Precio base").fill("195");

    // 3. Create a slot
    await page.getByRole("button", { name: "Agregar grupo" }).click();
    const slotDialog = page.getByRole("dialog", { name: "Definir nuevo grupo" });
    await expect(slotDialog).toBeVisible();
    await slotDialog.getByLabel("Nombre del grupo").fill("Acompañamiento");
    await slotDialog.getByRole("button", { name: "Guardar grupo" }).click();
    await expect(slotDialog).not.toBeVisible();

    // 4. Open option modal
    await page.getByRole("button", { name: "Agregar opción a Acompañamiento" }).click();
    const optionModal = page.getByRole("dialog", { name: "Agregar opción · Acompañamiento" });
    await expect(optionModal).toBeVisible();

    // 5. Fill custom display name and open recipe picker
    await optionModal.getByLabel("Nombre mostrado (opcional)").fill("Papas Rústicas");
    await optionModal.getByRole("button", { name: /Elegir receta/ }).click();

    // 6. Inside recipe picker, open new recipe dialog
    const recipePicker = page.getByRole("dialog", { name: "Elegir receta · Acompañamiento" });
    await expect(recipePicker).toBeVisible();
    await recipePicker.getByRole("button", { name: "+ Nueva receta" }).click();

    const recipeDialog = page.getByRole("dialog", { name: "Nueva receta" });
    await expect(recipeDialog).toBeVisible();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(1);

    await recipeDialog.getByLabel("Nombre", { exact: true }).fill("Papas al Horno");
    await recipeDialog.getByLabel("Descripción").fill("Al romero y sal marina");
    await recipeDialog.getByLabel("Instrucciones").fill("Hornear 30 minutos a 200C");
    await recipeDialog.getByLabel("Insumo 1", { exact: true }).selectOption("inv-papas");
    await recipeDialog.getByLabel("Cantidad del insumo 1").fill("2");

    // 7. Save recipe -> times out
    await recipeDialog.getByRole("button", { name: "Guardar receta" }).click();
    await expect(recipeDialog.getByRole("alert")).toBeVisible();
    await expect(recipeDialog.getByRole("button", { name: "Reintentar" })).toBeVisible();

    expect(postRecipeRequests).toHaveLength(1);
    const initialKey = postRecipeRequests[0].key;
    expect(initialKey).toBeTruthy();

    // 8. Real browser reload (F5)
    await page.reload();

    // 9. After reload, parent offer form retains commercial info, and nested recipe dialog reopens
    await expect(page.getByLabel("Etiqueta de presentación (opcional)")).toHaveValue("Combo Especial");
    await expect(page.getByLabel("Precio base")).toHaveValue("195");

    const restoredRecipeDialog = page.getByRole("dialog", { name: "Nueva receta" });
    await expect(restoredRecipeDialog).toBeVisible();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(1);
    await expect(restoredRecipeDialog.getByLabel("Nombre", { exact: true })).toHaveValue("Papas al Horno");
    await expect(restoredRecipeDialog.getByLabel("Descripción")).toHaveValue("Al romero y sal marina");
    await expect(restoredRecipeDialog.getByLabel("Instrucciones")).toHaveValue("Hornear 30 minutos a 200C");

    expect(postRecipeRequests).toHaveLength(1); // 0 POSTs upon reload

    // 10. Click manual retry
    const retryBtn = restoredRecipeDialog.getByRole("button", { name: "Reintentar" });
    await expect(retryBtn).toBeEnabled();
    await retryBtn.click();

    // 11. Recipe succeeds, recipe dialog closes, and option modal retains custom name and adopts created recipe
    await expect(restoredRecipeDialog).not.toBeVisible();
    const restoredOptionModal = page.getByRole("dialog", { name: "Agregar opción · Acompañamiento" });
    await expect(restoredOptionModal).toBeVisible();
    await expect(restoredOptionModal.getByLabel("Nombre mostrado (opcional)")).toHaveValue("Papas Rústicas");
    await expect(restoredOptionModal.getByText("Receta asignada: Papas al Horno")).toBeVisible();

    // 12. Save option into slot
    await restoredOptionModal.getByRole("button", { name: "Guardar opción" }).click();
    await expect(restoredOptionModal).not.toBeVisible();
    await expect(page.locator("dialog[open]:modal")).toHaveCount(0);

    // Option is visible in composition
    await expect(page.getByText("Papas Rústicas")).toBeVisible();

    // Verify exactly 2 requests with identical Idempotency-Key
    expect(postRecipeRequests).toHaveLength(2);
    expect(postRecipeRequests[1].key).toBe(initialKey);
    expect(postRecipeRequests[1].body).toEqual(postRecipeRequests[0].body);
  });

  test("entry creation recovery: two-stage flow with image upload and entry create across real reload (F5)", async ({
    page,
  }) => {
    const uploadRequests: Array<{ key?: string }> = [];
    const entryRequests: Array<{ key?: string; body?: unknown }> = [];
    const shouldFailUpload = false;
    let shouldFailEntry = true;

    await page.route("**/api/v1/menu/entries?*", (route) =>
      route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
      }),
    );

    await page.route("**/api/v1/menu/categories?*", (route) =>
      route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
      }),
    );

    await page.route("**/api/v1/media/images", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      uploadRequests.push({ key });

      if (shouldFailUpload) {
        return route.abort("timedout");
      }

      return route.fulfill({
        status: 201,
        json: {
          data: {
            id: "img-recovered-123",
            url: "https://example.com/images/burger.png",
            thumbnailUrl: "https://example.com/images/burger-thumb.png",
          },
        },
      });
    });

    await page.route("**/api/v1/menu/entries", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const body = route.request().postDataJSON();
      entryRequests.push({ key, body });

      if (shouldFailEntry) {
        shouldFailEntry = false;
        return route.abort("timedout");
      }

      const created = {
        id: "entry-recovered-1",
        ...body,
        status: "INACTIVE",
        etag: '"rev-entry-1"',
      };
      return route.fulfill({
        status: 201,
        headers: { ETag: '"rev-entry-1"' },
        json: { data: created },
      });
    });

    // 1. Navigate to new entry page
    await page.goto("/entries/new");
    await expect(page.getByRole("heading", { name: "Nueva entrada", level: 1 })).toBeVisible();

    // 2. Fill identity
    await page.getByLabel("Nombre comercial").fill("Hamburguesa Clásica");
    await page.getByLabel("Descripción").fill("Carne de res, lechuga y tomate");

    // 3. Attach valid 1x1 PNG image
    const validPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.locator("input#entry-image-file").setInputFiles({
      name: "burger.png",
      mimeType: "image/png",
      buffer: validPngBuffer,
    });
    await expect(page.getByRole("img", { name: "Vista previa de la imagen de la entrada" })).toBeVisible();

    // 4. Submit form: Stage 1 upload succeeds, Stage 2 entry.create times out
    await page.getByRole("button", { name: "Guardar entrada" }).click();

    // 5. Verification of error feedback and manual retry
    await expect(page.getByRole("alert")).toBeVisible();
    expect(uploadRequests).toHaveLength(1);
    expect(entryRequests).toHaveLength(1);
    const initialUploadKey = uploadRequests[0].key;
    const initialEntryKey = entryRequests[0].key;
    expect(initialUploadKey).toBeTruthy();
    expect(initialEntryKey).toBeTruthy();

    // 6. Real browser reload (F5)
    await page.reload();

    // 7. After reload, form restores with draft, confirmed image is remembered, NO automatic POSTs
    await expect(page.getByLabel("Nombre comercial")).toHaveValue("Hamburguesa Clásica");
    await expect(page.getByLabel("Descripción")).toHaveValue("Carne de res, lechuga y tomate");
    expect(uploadRequests).toHaveLength(1); // 0 POSTs upon reload
    expect(entryRequests).toHaveLength(1);

    // 8. User acknowledges or retries
    const ackButton = page.getByRole("button", { name: /He verificado el resultado/ });
    if (await ackButton.isVisible()) {
      await ackButton.click();
    }
    const saveButton = page.getByRole("button", { name: "Guardar entrada" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 9. Recovered! Entry creation succeeds with same entry idempotency key, WITHOUT re-uploading image!
    await expect(page).toHaveURL("/");
    expect(uploadRequests).toHaveLength(1); // Image was NOT re-uploaded!
    expect(entryRequests).toHaveLength(2);
    expect(entryRequests[1].key).toBe(initialEntryKey);
    expect(entryRequests[1].body).toEqual({
      brandName: "Hamburguesa Clásica",
      description: "Carne de res, lechuga y tomate",
      categoryIds: [],
      imageId: "img-recovered-123",
    });
  });

  test("offer creation recovery: uncertain POST, real browser reload (F5) restores form without POST, manual retry sends same Idempotency-Key (A01, A08)", async ({
    page,
  }) => {
    const uploadRequests: Array<{ key?: string }> = [];
    const offerRequests: Array<{ key?: string; body?: unknown }> = [];
    let shouldFailOfferWithTimeout = true;

    await page.route("**/api/v1/menu/entries/entry-1", (route) =>
      route.fulfill({
        json: {
          data: {
            id: "entry-1",
            brandName: "Hamburguesa Gourmet",
            description: "Carne angus",
            status: "ACTIVE",
            categoryIds: [],
          },
        },
      }),
    );

    await page.route("**/api/v1/menu/entries/entry-1/offers?*", (route) =>
      route.fulfill({
        json: {
          data: [],
          meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        },
      }),
    );

    await page.route("**/api/v1/menu/recipes*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: {
            data: [
              {
                id: "rec-1",
                name: "Receta Hamburguesa",
                description: "Carne angus sazonada",
                supplies: [],
              },
            ],
            meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
          },
        });
      }
      return route.fallback();
    });

    await page.route("**/api/v1/media/images", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      uploadRequests.push({ key });
      return route.fulfill({
        status: 201,
        json: {
          data: {
            id: "img-offer-rec-1",
            url: "/images/offer.png",
            thumbnailUrl: "/images/offer-thumb.png",
          },
        },
      });
    });

    await page.route("**/api/v1/menu/entries/entry-1/offers", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const body = route.request().postDataJSON();
      offerRequests.push({ key, body });

      if (shouldFailOfferWithTimeout) {
        shouldFailOfferWithTimeout = false;
        return route.abort("timedout");
      }

      const created = {
        id: "offer-rec-1",
        entryId: "entry-1",
        presentationTag: body.presentationTag,
        basePrice: body.basePrice,
        status: "INACTIVE",
        image: { id: "img-offer-rec-1", url: "/images/offer.png", thumbnailUrl: "/images/offer-thumb.png" },
        composition: {
          slots: [
            {
              slotId: "srv-slot-1",
              name: "Principal",
              quantity: 1,
              course: null,
              status: "ACTIVE",
              options: [
                {
                  optionId: "srv-opt-1",
                  displayName: "Receta Hamburguesa",
                  status: "ACTIVE",
                  sourceType: "RECIPE",
                  recipeId: "rec-1",
                },
              ],
            },
          ],
        },
      };

      return route.fulfill({
        status: 201,
        headers: { ETag: '"rev-offer-1"' },
        json: { data: created },
      });
    });

    // 1. Navigate to new offer page
    await page.goto("/entries/entry-1/offers/new");
    await expect(page.getByRole("heading", { name: "Nueva oferta", level: 1 })).toBeVisible();

    // 2. Fill commercial fields
    await page.getByLabel(/Etiqueta de presentación/).fill("Combo Doble");
    await page.getByLabel(/Precio base/).fill("280");

    // 3. Attach image
    const validPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.locator("input#offer-image-input").setInputFiles({
      name: "offer.png",
      mimeType: "image/png",
      buffer: validPngBuffer,
    });

    // 4. Add slot and option
    await page.getByRole("button", { name: "Agregar grupo" }).click();
    await page.getByLabel("Nombre del grupo").fill("Principal");
    await page.getByRole("button", { name: "Guardar grupo" }).click();

    await page.getByRole("button", { name: "Agregar opción a Principal" }).click();
    await page.getByRole("button", { name: /Elegir receta/ }).click();
    const recipeArticle = page.getByRole("article", { name: "Receta Hamburguesa" });
    await expect(recipeArticle).toBeVisible();
    await recipeArticle.getByRole("button", { name: "Asignar" }).click();
    await page.getByRole("button", { name: "Guardar opción" }).click();

    // 5. Submit form: Stage 1 upload succeeds, Stage 2 offer creation times out
    await page.getByRole("button", { name: "Guardar Oferta" }).click();

    // 6. Verify error feedback and manual retry
    await expect(page.getByRole("alert").first()).toBeVisible();
    expect(uploadRequests).toHaveLength(1);
    expect(offerRequests).toHaveLength(1);
    const initialUploadKey = uploadRequests[0].key;
    const initialOfferKey = offerRequests[0].key;
    expect(initialUploadKey).toBeTruthy();
    expect(initialOfferKey).toBeTruthy();

    // 7. Real browser reload (F5)
    await page.reload();

    // 8. Form restores without automatic submission
    await expect(page.getByLabel(/Etiqueta de presentación/)).toHaveValue("Combo Doble");
    await expect(page.getByLabel(/Precio base/)).toHaveValue("280");
    expect(uploadRequests).toHaveLength(1);
    expect(offerRequests).toHaveLength(1);

    // 9. Retry button is available
    const retryButton = page.getByRole("button", { name: "Reintentar" });
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // 10. Navigates to offers list, reusing original idempotency key and image without re-uploading
    await expect(page).toHaveURL("/entries/entry-1/offers");
    expect(uploadRequests).toHaveLength(1);
    expect(offerRequests).toHaveLength(2);
    expect(offerRequests[1].key).toBe(initialOfferKey);
  });

  test("offer update recovery: uncertain PATCH, real browser reload (F5) restores form with opening If-Match, manual retry sends same Idempotency-Key and If-Match (A01, A08)", async ({
    page,
  }) => {
    const patchRequests: Array<{ key?: string; ifMatch?: string; body?: unknown }> = [];
    let shouldFailPatchWithTimeout = true;

    const existingOffer = {
      id: "offer-update-1",
      entryId: "entry-1",
      presentationTag: "Familiar Original",
      basePrice: 300,
      status: "ACTIVE",
      image: { id: "img-exist", url: "/images/exist.png", thumbnailUrl: "/images/exist-thumb.png" },
      composition: {
        slots: [
          {
            slotId: "srv-slot-1",
            name: "Plato Principal",
            quantity: 1,
            course: null,
            status: "ACTIVE",
            options: [
              {
                optionId: "srv-opt-1",
                displayName: "Hamburguesa Doble",
                status: "ACTIVE",
                sourceType: "RECIPE",
                recipeId: "rec-1",
              },
            ],
          },
        ],
      },
    };

    await page.route("**/api/v1/menu/entries/entry-1", (route) =>
      route.fulfill({
        json: {
          data: {
            id: "entry-1",
            brandName: "Hamburguesa Gourmet",
            description: "Carne angus",
            status: "ACTIVE",
            categoryIds: [],
          },
        },
      }),
    );

    await page.route("**/api/v1/menu/entries/entry-1/offers?*", (route) =>
      route.fulfill({
        json: {
          data: [existingOffer],
          meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
        },
      }),
    );

    await page.route("**/api/v1/menu/offers/offer-update-1", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          headers: { ETag: '"rev-offer-orig"' },
          json: { data: existingOffer },
        });
      }

      if (route.request().method() === "PATCH") {
        const key = route.request().headers()["idempotency-key"];
        const ifMatch = route.request().headers()["if-match"];
        const body = route.request().postDataJSON();
        patchRequests.push({ key, ifMatch, body });

        if (shouldFailPatchWithTimeout) {
          shouldFailPatchWithTimeout = false;
          return route.abort("timedout");
        }

        const updated = {
          ...existingOffer,
          presentationTag: body.presentationTag,
          basePrice: body.basePrice,
        };

        return route.fulfill({
          status: 200,
          headers: { ETag: '"rev-offer-next"' },
          json: { data: updated },
        });
      }

      return route.fallback();
    });

    // 1. Navigate to edit offer page
    await page.goto("/entries/entry-1/offers/offer-update-1/edit");
    await expect(page.getByRole("heading", { name: "Editar oferta", level: 1 })).toBeVisible();
    await expect(page.getByLabel(/Etiqueta de presentación/)).toHaveValue("Familiar Original");

    // 2. Edit price
    await page.getByLabel(/Precio base/).fill("350");

    // 3. Save offer: times out
    await page.getByRole("button", { name: "Guardar Oferta" }).click();

    // 4. Verification of error and retry
    await expect(page.getByRole("alert").first()).toBeVisible();
    expect(patchRequests).toHaveLength(1);
    const initialKey = patchRequests[0].key;
    const initialIfMatch = patchRequests[0].ifMatch;
    expect(initialKey).toBeTruthy();
    expect(initialIfMatch).toBe('"rev-offer-orig"');

    // 5. Reload (F5)
    await page.reload();

    // 6. Restores draft without automatic PATCH
    await expect(page.getByLabel(/Etiqueta de presentación/)).toHaveValue("Familiar Original");
    await expect(page.getByLabel(/Precio base/)).toHaveValue("350");
    expect(patchRequests).toHaveLength(1);

    // 7. Click Reintentar: sends same key and same If-Match
    const retryButton = page.getByRole("button", { name: "Reintentar" });
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // 8. Navigates to offers list
    await expect(page).toHaveURL("/entries/entry-1/offers");
    expect(patchRequests).toHaveLength(2);
    expect(patchRequests[1].key).toBe(initialKey);
    expect(patchRequests[1].ifMatch).toBe('"rev-offer-orig"');
  });
});
