import { createDemoRepository } from "./repository";

test("filters and paginates the demo catalog with consistent counts and local images", async () => {
  const repository = createDemoRepository();
  const result = await repository.listEntries({ q: "clasica", status: "ACTIVE", page: 1, pageSize: 1 });
  expect(result.meta).toEqual({ page: 1, pageSize: 1, total: 1, totalPages: 1 });
  expect(result.data[0]).toMatchObject({ id: "demo-entry-burger", offerCount: 2,
    image: { url: expect.stringContaining("data:image/svg+xml,") } });
  const category = result.data[0].categories[0];
  expect((await repository.listCategories()).find(item => item.id === category.id)?.entryCount).toBe(2);
  expect((await repository.listEntries({ categoryId: "demo-category-drinks", page: 1, pageSize: 10 })).data.map(item => item.id))
    .toEqual(["demo-entry-lemonade"]);
  expect((await repository.listEntries({ page: 2, pageSize: 2 })).data).toHaveLength(2);
});

test("category creation replays concurrent requests without duplicates and rejects key reuse with different data", async () => {
  const repository = createDemoRepository();
  const draft = { name: "Desayunos", description: "Opciones de la mañana" };
  const [first, replay] = await Promise.all([
    repository.createCategory(draft, "create-category"), repository.createCategory(draft, "create-category"),
  ]);
  expect(replay).toEqual(first);
  expect((await repository.listCategories()).filter(item => item.name === draft.name)).toHaveLength(1);
  await expect(repository.createCategory({ ...draft, name: "Cenas" }, "create-category"))
    .rejects.toMatchObject({ response: { status: 409 } });
  const opening = await repository.getCategory(first.id);
  await repository.updateCategory(first.id, { ...draft, name: "Desayunos nuevos" }, opening.etag!);
  await expect(repository.updateCategory(first.id, draft, opening.etag!)).rejects.toMatchObject({ response: { status: 412 } });
  expect(await repository.createCategory(draft, "create-category")).toEqual(first);
});

test("an uploaded image can create an entry that remains editable and updates category counts", async () => {
  const repository = createDemoRepository();
  const file = new File(["demo image bytes"], "example.png", { type: "image/png" });
  const imageId = await repository.uploadEntryImage(file, "upload");
  expect(await repository.uploadImage(file, "upload")).toBe(imageId);
  const draft = { brandName: "Nueva bebida", description: "Bebida de prueba",
    categoryIds: ["demo-category-drinks"], imageId };
  const created = await repository.createEntry(draft, "create-entry");
  expect(created).toMatchObject({ status: "INACTIVE", image: { id: imageId, url: expect.stringContaining("data:image/png;base64,") } });
  expect(await repository.createEntry(draft, "create-entry")).toEqual(created);
  const updated = await repository.updateEntry(created.id, { ...draft, brandName: "Bebida editada", status: "ACTIVE" }, created.etag!);
  expect(updated.etag).not.toBe(created.etag);
  expect((await repository.getEntry(created.id)).brandName).toBe("Bebida editada");
  expect((await repository.getCategory("demo-category-drinks")).data.entryCount).toBe(2);
  await expect(repository.deleteArchivedEntry(created.id)).rejects.toMatchObject({ response: { status: 409 } });
  await repository.setEntryStatus(created.id, "ARCHIVED");
  await repository.deleteArchivedEntry(created.id);
  await expect(repository.getEntry(created.id)).rejects.toMatchObject({ response: { status: 404 } });
  expect((await repository.getCategory("demo-category-drinks")).data.entryCount).toBe(1);
});

test("recipe creation and editing preserve inventory details and prevent deletion while referenced", async () => {
  const repository = createDemoRepository();
  const draft = { name: "Agua con limón", description: "Bebida fría", instructions: "Mezclar y servir.",
    supplies: [{ inventoryItemId: "demo-inventory-water", quantity: 250 }] };
  const created = await repository.createRecipe(draft, "create-recipe");
  expect(created.supplies[0].inventoryItem).toEqual({ id: "demo-inventory-water", name: "Agua mineral", unit: "ml" });
  const opening = await repository.getRecipe(created.id);
  await repository.updateRecipe(created.id, { ...draft, instructions: "Servir con hielo." }, opening.etag!);
  await expect(repository.updateRecipe(created.id, draft, opening.etag!)).rejects.toMatchObject({ response: { status: 412 } });
  expect((await repository.listRecipes({ q: "agua con", page: 1, pageSize: 10 })).data[0].id).toBe(created.id);
  expect((await repository.getRecipe(created.id)).data.instructions).toBe("Servir con hielo.");
  await repository.deleteRecipe(created.id);
  await expect(repository.getRecipe(created.id)).rejects.toMatchObject({ response: { status: 404 } });
  await expect(repository.deleteRecipe("demo-recipe-burger")).rejects.toMatchObject({ response: { status: 409 } });
});

test("offer editing preserves identities and omitted source fields and replays the confirmed write", async () => {
  const repository = createDemoRepository();
  const opening = await repository.getOffer("demo-offer-combo");
  const [main, drink] = opening.data.composition.slots;
  const draft = { presentationTag: "Combo editado", basePrice: 195, composition: { slots: [
    { slotId: main.slotId, options: [{ optionId: main.options[0].optionId, sourceType: "RECIPE" as const, displayName: "Hamburguesa especial" }] },
    { slotId: drink.slotId, options: [{ optionId: drink.options[0].optionId, sourceType: "INVENTORY_ITEM" as const, quantity: 500 }] },
  ] } };
  const result = await repository.updateOffer(opening.data.id, draft, opening.etag!, "edit-offer");
  expect(result.composition.slots[0]).toMatchObject({ slotId: main.slotId, name: main.name, options: [
    { optionId: main.options[0].optionId, recipeId: "demo-recipe-burger", displayName: "Hamburguesa especial" },
  ] });
  expect(result.composition.slots[1].options[0]).toMatchObject({ inventoryItemId: "demo-inventory-water", quantity: 500, unit: "ml" });
  expect(await repository.updateOffer(opening.data.id, draft, opening.etag!, "edit-offer")).toEqual(result);
  await expect(repository.updateOffer(opening.data.id, draft, opening.etag!, "another-edit"))
    .rejects.toMatchObject({ response: { status: 412 } });
});

test("offer creation assigns stable composition IDs and supports activation, deactivation and deletion", async () => {
  const repository = createDemoRepository();
  const draft = { presentationTag: "Nueva presentación", basePrice: 100, composition: { slots: [
    { name: "Principal", quantity: 1, options: [{ sourceType: "RECIPE" as const, recipeId: "demo-recipe-burger", displayName: "Hamburguesa" }] },
  ] } };
  const created = await repository.createOffer("demo-entry-burger", draft, "demo-image-burger", "create-offer");
  expect(created.status).toBe("INACTIVE");
  expect(created.composition.slots[0]).toMatchObject({ slotId: expect.any(String), options: [{ optionId: expect.any(String) }] });
  expect((await repository.listOffers("demo-entry-burger", 1, 10)).meta.total).toBe(3);
  const active = await repository.setOfferStatus(created.id, { presentationTag: created.presentationTag, status: "ACTIVE" }, created.etag!, "activate");
  await expect(repository.deleteInactiveOffer(created.id)).rejects.toMatchObject({ response: { status: 409 } });
  await repository.setOfferStatus(created.id, { presentationTag: created.presentationTag, status: "INACTIVE" }, active.etag!, "deactivate");
  await repository.deleteInactiveOffer(created.id);
  expect((await repository.listEntries({ q: "Hamburguesa", page: 1, pageSize: 10 })).data[0].offerCount).toBe(2);
});

test("demo instances and returned records are isolated, and aborted reads are rejected", async () => {
  const repository = createDemoRepository();
  const entry = await repository.getEntry("demo-entry-burger");
  entry.categoryIds.length = 0;
  expect((await repository.getEntry(entry.id)).categoryIds).toEqual(["demo-category-main"]);
  await repository.setEntryStatus(entry.id, "INACTIVE");
  expect((await createDemoRepository().getEntry(entry.id)).status).toBe("ACTIVE");
  const controller = new AbortController();
  controller.abort();
  await expect(repository.listInventoryItems({}, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
});
