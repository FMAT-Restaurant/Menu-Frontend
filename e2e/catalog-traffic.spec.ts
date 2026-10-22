import { expect, test } from "@playwright/test";

test("filters and pagination request only entries and returning to V1 reuses fresh data", async ({ page }) => {
  const completed: string[] = [];
  page.on("response", (response) => {
    if (response.ok() && response.url().includes("/api/v1/menu/")) completed.push(response.url());
  });
  await page.route("**/api/v1/menu/categories?*", (route) => route.fulfill({
    json: { data: [{ id: "category-1", name: "Principales", description: "" }], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } },
  }));
  await page.route("**/api/v1/menu/entries?*", (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get("page"));
    const status = url.searchParams.get("status") || "INACTIVE";
    const data = Array.from({ length: pageNumber === 3 ? 1 : 6 }, (_, index) => ({
      id: `entry-${pageNumber}-${index}`, brandName: `Entrada ${pageNumber}-${index}`,
      description: "Datos de prueba", status, image: null, categories: [], offerCount: 0,
    }));
    return route.fulfill({ json: { data, meta: { page: pageNumber, pageSize: 6, total: 13, totalPages: 3 } } });
  });

  await page.goto("/?pageSize=6");
  await expect(page.getByRole("heading", { name: "Entrada 1-0" })).toBeVisible();
  const categoryCount = completed.filter((url) => url.includes("/menu/categories")).length;
  const entryCount = completed.filter((url) => url.includes("/menu/entries")).length;
  await page.getByRole("combobox", { name: "Estado administrativo" }).selectOption("INACTIVE");
  await expect(page).toHaveURL(/status=INACTIVE/);
  await expect.poll(() => completed.filter((url) => url.includes("/menu/entries")).length).toBeGreaterThan(entryCount);
  await page.getByRole("button", { name: "Siguiente página" }).click();
  await expect(page.getByRole("heading", { name: "Entrada 2-0" })).toBeVisible();
  expect(completed.filter((url) => url.includes("/menu/categories"))).toHaveLength(categoryCount);

  const beforeReturn = completed.filter((url) => url.includes("/menu/entries")).length;
  await page.getByRole("link", { name: "Categorías" }).click();
  await page.getByRole("link", { name: /Volver al menú/ }).click();
  await expect(page.getByRole("heading", { name: "Entrada 2-0" })).toBeVisible();
  expect(completed.filter((url) => url.includes("/menu/entries"))).toHaveLength(beforeReturn);
});

test("full journey: catalog -> create category -> new entry with category -> catalog reflects updates within TTL without F5 (C07, Instruction 8)", async ({ page }) => {
  interface MockCategory {
    id: string;
    name: string;
    description: string;
    entryCount: number;
  }
  interface MockEntry {
    id: string;
    brandName: string;
    description: string;
    status: string;
    image: null;
    categories: { id: string; name: string }[];
    offerCount: number;
  }

  const mutableCategories: MockCategory[] = [
    { id: "cat-init", name: "Bebidas", description: "Refrescos y jugos", entryCount: 1 },
  ];

  const mutableEntries: MockEntry[] = [
    {
      id: "ent-init",
      brandName: "Limonada Casera",
      description: "Limonada fresca",
      status: "ACTIVE",
      image: null,
      categories: [{ id: "cat-init", name: "Bebidas" }],
      offerCount: 0,
    },
  ];

  let postEntryPayload: unknown = null;

  await page.route("**/api/v1/media/images*", (route) => {
    return route.fulfill({
      status: 201,
      json: {
        data: {
          id: "img-tacos-1",
          url: "https://images.example/tacos.png",
          thumbnailUrl: "https://images.example/tacos-thumb.png",
        },
      },
    });
  });

  await page.route("**/api/v1/menu/categories*", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({
        json: {
          data: mutableCategories,
          meta: { page: 1, pageSize: 100, total: mutableCategories.length, totalPages: 1 },
        },
      });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON() as { name: string; description?: string };
      const newCat: MockCategory = {
        id: "cat-tacos",
        name: body.name.trim(),
        description: body.description ?? "",
        entryCount: 0,
      };
      mutableCategories.push(newCat);
      return route.fulfill({
        status: 201,
        headers: { ETag: '"cat-rev-1"' },
        json: { data: newCat },
      });
    }
    return route.continue();
  });

  await page.route("**/api/v1/menu/entries*", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({
        json: {
          data: mutableEntries,
          meta: { page: 1, pageSize: 12, total: mutableEntries.length, totalPages: 1 },
        },
      });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON() as { brandName: string; description: string; categoryIds: string[] };
      postEntryPayload = body;
      const assignedCategories = mutableCategories
        .filter((c) => body.categoryIds.includes(c.id))
        .map((c) => ({ id: c.id, name: c.name }));

      const newEntryForList: MockEntry = {
        id: "ent-tacos",
        brandName: body.brandName.trim(),
        description: body.description.trim(),
        status: "ACTIVE",
        image: null,
        categories: assignedCategories,
        offerCount: 0,
      };
      mutableEntries.push(newEntryForList);

      const createdDetail = {
        id: "ent-tacos",
        brandName: body.brandName.trim(),
        description: body.description.trim(),
        status: "ACTIVE",
        categoryIds: body.categoryIds,
        image: {
          id: "img-tacos-1",
          url: "https://images.example/tacos.png",
          thumbnailUrl: "https://images.example/tacos-thumb.png",
        },
      };

      return route.fulfill({
        status: 201,
        headers: { ETag: '"ent-rev-1"' },
        json: { data: createdDetail },
      });
    }
    return route.continue();
  });

  // 1. Load catalog to populate cache
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Limonada Casera" })).toBeVisible();

  // 2. Navigate to Categories via in-app link
  await page.getByRole("link", { name: "Categorías" }).click();
  await expect(page.getByRole("heading", { name: "Categorías del menú" })).toBeVisible();

  // Open category creation dialog
  await page.getByRole("button", { name: /Nueva categoría|Crear categoría/ }).click();
  const catDialog = page.getByRole("dialog", { name: "Crear categoría" });
  await expect(catDialog).toBeVisible();

  await catDialog.getByRole("textbox", { name: "Nombre" }).fill("Tacos Gourmet");
  await catDialog.getByRole("button", { name: "Guardar categoría" }).click();
  await expect(catDialog).not.toBeVisible();

  // Verify created category is in the categories list
  await expect(page.getByRole("heading", { name: "Tacos Gourmet" })).toBeVisible();

  // 3. Navigate to New Entry via in-app link
  await page.getByRole("link", { name: /Volver al menú/ }).click();
  await expect(page.getByRole("heading", { name: "Limonada Casera" })).toBeVisible();

  await page.getByRole("link", { name: "Nueva entrada" }).click();
  await expect(page.getByRole("heading", { name: "Nueva entrada" })).toBeVisible();

  // Fill entry form
  await page.getByLabel("Nombre comercial").fill("Taco al Pastor");
  await page.getByLabel("Descripción").fill("Tacos con piña y cilantro");

  // Attach valid image
  const png1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  await page.locator("#entry-image-file").setInputFiles({
    name: "tacos.png",
    mimeType: "image/png",
    buffer: png1x1,
  });

  // Select the newly created category
  await page.getByRole("button", { name: "Seleccionar categorías" }).click();
  const categoryOption = page.locator(".entry-category-selector__option").filter({ hasText: "Tacos Gourmet" });
  await expect(categoryOption).toBeVisible();
  await categoryOption.locator("input[type='checkbox']").check();

  // Submit entry form
  await page.getByRole("button", { name: "Guardar entrada" }).click();

  // 4. Verify categoryId was correctly sent in POST payload
  await expect.poll(() => (postEntryPayload as { categoryIds?: string[] } | null)?.categoryIds).toContain("cat-tacos");

  // 5. Returned to catalog without F5 reload, demonstrating cache invalidation within TTL
  await expect(page.getByRole("heading", { name: "Entradas del menú" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Taco al Pastor" })).toBeVisible();

  // Verify the category chip "Tacos Gourmet" is visible in the new card
  const tacoCard = page.locator(".entry-card").filter({ hasText: "Taco al Pastor" });
  await expect(tacoCard.locator(".category-chip", { hasText: "Tacos Gourmet" })).toBeVisible();
});
