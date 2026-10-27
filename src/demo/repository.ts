import type {
  CompositionSlotDetail,
  MenuEntry,
  MenuOffer,
  MenuRepository,
  OfferUpdateDraft,
  Page,
  RecipeDetail,
  SlotOptionDetail,
  SlotOptionUpdate,
} from "../application/catalog";
import { createDemoData } from "./data";

// Repository records contain JSON data only. Copies prevent callers from mutating
// the store or an idempotent response through a previously returned reference.
function copy<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return copyPlainData(value);
}

function copyPlainData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(copyPlainData) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, copyPlainData(item)]),
    ) as T;
  }
  return value;
}

function runDemoOperation<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (error) {
    return Promise.reject(error);
  }
}

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), {
    response: { status, data: { error: { message } } },
  });
}

function required<T>(records: Map<string, T>, id: string, label: string): T {
  const value = records.get(id);
  if (!value) fail(404, `${label} no existe en esta sesión demo.`);
  return value;
}

function pageOf<T>(items: T[], page: number, pageSize: number): Page<T> {
  return copy({ data: items.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total: items.length, totalPages: Math.ceil(items.length / pageSize) } });
}

function offerUsesRecipe(
  offer: { composition: { slots: Array<{ options: SlotOptionDetail[] }> } },
  recipeId: string,
): boolean {
  return offer.composition.slots.some(slot =>
    slot.options.some(option => option.sourceType === "RECIPE" && option.recipeId === recipeId),
  );
}

function matches(text: string, query = ""): boolean {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  return normalize(text).includes(normalize(query.trim()));
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("No se pudo leer la imagen del demo."));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen del demo."));
    reader.readAsDataURL(file);
  });
}

/** In-memory adapter for exploring the real UI. It never calls a remote service. */
export function createDemoRepository(): MenuRepository {
  const seed = createDemoData();
  const categories = new Map(seed.categories.map(item => [item.id, item]));
  const entries = new Map(seed.entries.map(item => [item.id, item]));
  const offers = new Map(seed.offers.map(item => [item.id, item]));
  const recipes = new Map(seed.recipes.map(item => [item.id, item]));
  const inventory = new Map(seed.inventoryItems.map(item => [item.id, item]));
  const images = new Map(seed.images.map(item => [item.id, item]));
  const versions = new Map<string, number>();
  const operations = new Map<string, { payload: string; result: Promise<unknown> }>();

  const newId = (kind: string) => `demo-${kind}-${crypto.randomUUID()}`;
  const version = (id: string) => `"${id}-v${versions.get(id) ?? 1}"`;
  const bump = (id: string) => versions.set(id, (versions.get(id) ?? 1) + 1);
  const snapshot = <T extends { id: string }>(item: T) => copy({ ...item, etag: version(item.id) });
  const checkVersion = (id: string, etag: string) => {
    if (etag !== version(id)) fail(412, "Los datos cambiaron. Revisa la versión actual antes de guardar.");
  };

  function once<T>(scope: string, key: string, payload: unknown, action: () => T | Promise<T>): Promise<T> {
    const operationKey = `${scope}:${key}`;
    const serialized = JSON.stringify(payload);
    const previous = operations.get(operationKey);
    if (previous) {
      if (previous.payload !== serialized) fail(409, "La operación ya se utilizó con otros datos.");
      return previous.result.then(result => copy(result as T));
    }
    const result = Promise.resolve().then(action).then(copy);
    operations.set(operationKey, { payload: serialized, result });
    void result.catch(() => operations.delete(operationKey));
    return result.then(copy);
  }

  function categoryWithCount(id: string) {
    return copy({ ...required(categories, id, "La categoría"),
      entryCount: [...entries.values()].filter(entry => entry.categoryIds.includes(id)).length });
  }

  function validateCategories(ids: string[]) {
    ids.forEach(id => required(categories, id, "La categoría"));
  }

  function recipeWithSupplies(recipe: RecipeDetail): RecipeDetail {
    return snapshot({ ...recipe, supplies: recipe.supplies.map(supply => ({ ...supply,
      inventoryItem: required(inventory, supply.inventoryItemId, "El insumo") })) });
  }

  function optionFrom(input: SlotOptionUpdate, previous?: SlotOptionDetail): SlotOptionDetail {
    const common = { optionId: previous?.optionId ?? newId("option"),
      displayName: input.displayName ?? previous?.displayName ?? "",
      status: input.status ?? previous?.status ?? "ACTIVE" };
    if (input.sourceType === "RECIPE") {
      const recipeId = input.recipeId ?? (previous?.sourceType === "RECIPE" ? previous.recipeId : undefined);
      if (!recipeId) fail(422, "La opción requiere una receta.");
      required(recipes, recipeId, "La receta");
      return { ...common, sourceType: "RECIPE", recipeId };
    }
    const old = previous?.sourceType === "INVENTORY_ITEM" ? previous : undefined;
    const inventoryItemId = input.inventoryItemId ?? old?.inventoryItemId;
    const quantity = input.quantity ?? old?.quantity;
    const unit = input.unit ?? old?.unit;
    if (!inventoryItemId || !quantity || quantity <= 0 || !unit) fail(422, "La opción requiere insumo, cantidad positiva y unidad.");
    required(inventory, inventoryItemId, "El insumo");
    return { ...common, sourceType: "INVENTORY_ITEM", inventoryItemId, quantity, unit };
  }

  function slotsFrom(
    inputs: NonNullable<OfferUpdateDraft["composition"]>["slots"],
    previous: CompositionSlotDetail[] = [],
  ): CompositionSlotDetail[] {
    return inputs.map(input => {
      const old = input.slotId ? previous.find(slot => slot.slotId === input.slotId) : undefined;
      if (input.slotId && !old) fail(422, "El grupo ya no existe en la oferta.");
      const options = input.options?.map(option => {
        const oldOption = option.optionId ? old?.options.find(item => item.optionId === option.optionId) : undefined;
        if (option.optionId && !oldOption) fail(422, "La opción ya no existe en el grupo.");
        return optionFrom(option, oldOption);
      }) ?? old?.options ?? [];
      const name = input.name ?? old?.name ?? "";
      const quantity = input.quantity ?? old?.quantity ?? 1;
      if (!name.trim() || !Number.isSafeInteger(quantity) || quantity < 1 || options.length === 0) {
        fail(422, "Cada grupo requiere nombre, cantidad positiva y opciones.");
      }
      return { slotId: old?.slotId ?? newId("slot"), name, quantity,
        course: input.course === undefined ? old?.course : input.course,
        status: options.some(option => option.status === "ACTIVE") ? "ACTIVE" : "INACTIVE", options };
    });
  }

  function patchOffer(id: string, draft: OfferUpdateDraft, etag: string, imageId?: string) {
    const current = required(offers, id, "La oferta");
    checkVersion(id, etag);
    const composition = draft.composition
      ? { slots: slotsFrom(draft.composition.slots, current.composition.slots) }
      : current.composition;
    const updated = { ...current, ...draft, composition,
      image: imageId ? required(images, imageId, "La imagen") : current.image };
    if (updated.status === "ACTIVE" && !composition.slots.some(slot => slot.status === "ACTIVE")) {
      fail(422, "La oferta necesita al menos una opción activa.");
    }
    offers.set(id, copy(updated));
    bump(id);
    return snapshot(updated);
  }

  const uploadImage: MenuRepository["uploadImage"] = async (file, key) => {
    const url = await readImage(file);
    return once("image.upload", key, { url }, () => {
      const id = newId("image");
      images.set(id, { id, url, thumbnailUrl: url });
      return id;
    });
  };

  return {
    listEntries(query, signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        const result = [...entries.values()].filter(entry =>
          matches(`${entry.brandName} ${entry.description}`, query.q) &&
          (!query.status || entry.status === query.status) &&
          (!query.categoryId || entry.categoryIds.includes(query.categoryId)),
        ).map((entry): MenuEntry => ({ ...entry, image: entry.image?.id ? required(images, entry.image.id, "La imagen") : null,
          categories: entry.categoryIds.map(id => categoryWithCount(id)),
          offerCount: [...offers.values()].filter(offer => offer.entryId === entry.id).length }));
        return pageOf(result, query.page, query.pageSize);
      });
    },
    listCategories(signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        return [...categories.keys()].map(categoryWithCount);
      });
    },
    getCategory(id, signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        return { data: categoryWithCount(id), etag: version(id) };
      });
    },
    async createCategory(draft, key) {
      return once("category.create", key, draft, () => {
        const item = { ...copy(draft), id: newId("category") };
        categories.set(item.id, item);
        return categoryWithCount(item.id);
      });
    },
    updateCategory(id, draft, etag) {
      return runDemoOperation(() => {
        required(categories, id, "La categoría");
        checkVersion(id, etag);
        categories.set(id, { ...copy(draft), id });
        bump(id);
        return categoryWithCount(id);
      });
    },
    getEntry(id, signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        return snapshot(required(entries, id, "La entrada"));
      });
    },
    uploadImage,
    uploadEntryImage: uploadImage,
    async createEntry(draft, key) {
      return once("entry.create", key, draft, () => {
        validateCategories(draft.categoryIds);
        const image = required(images, draft.imageId, "La imagen");
        const entry = { id: newId("entry"), brandName: draft.brandName, description: draft.description,
          categoryIds: copy(draft.categoryIds), image, status: "INACTIVE" as const };
        entries.set(entry.id, entry);
        return snapshot(entry);
      });
    },
    updateEntry(id, draft, etag) {
      return runDemoOperation(() => {
        const current = required(entries, id, "La entrada");
        checkVersion(id, etag);
        validateCategories(draft.categoryIds);
        const entry = { ...current, ...copy(draft), image: draft.imageId ? required(images, draft.imageId, "La imagen") : current.image };
        entries.set(id, entry);
        bump(id);
        return snapshot(entry);
      });
    },
    setEntryStatus(id, status) {
      return runDemoOperation(() => {
        const current = required(entries, id, "La entrada");
        entries.set(id, { ...current, status });
        bump(id);
      });
    },
    deleteArchivedEntry(id) {
      return runDemoOperation(() => {
        if (required(entries, id, "La entrada").status !== "ARCHIVED") fail(409, "Solo se puede eliminar una entrada archivada.");
        entries.delete(id);
        for (const offer of offers.values()) if (offer.entryId === id) offers.delete(offer.id);
      });
    },
    listOffers(entryId, page, pageSize, signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        const entry = required(entries, entryId, "La entrada");
        const result = [...offers.values()].filter(offer => offer.entryId === entryId).map((offer): MenuOffer => ({
          ...offer, entryName: entry.brandName, slotCount: offer.composition.slots.length,
        }));
        return pageOf(result, page, pageSize);
      });
    },
    getOffer(id, signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        return { data: snapshot(required(offers, id, "La oferta")), etag: version(id) };
      });
    },
    async createOffer(entryId, draft, imageId, key) {
      return once(`offer.create:${entryId}`, key, { draft, imageId }, () => {
        required(entries, entryId, "La entrada");
        const image = required(images, imageId, "La imagen");
        const slots = slotsFrom(draft.composition.slots.map(slot => ({ ...slot,
          options: slot.options.map(option => ({ ...option, status: "ACTIVE" as const })) })));
        const offer = { id: newId("offer"), entryId, presentationTag: draft.presentationTag,
          basePrice: draft.basePrice, status: "INACTIVE" as const, image, composition: { slots } };
        offers.set(offer.id, offer);
        return snapshot(offer);
      });
    },
    async updateOffer(id, draft, etag, key, imageId) {
      return once(`offer.update:${id}`, key, { draft, etag, imageId }, () => patchOffer(id, draft, etag, imageId));
    },
    async setOfferStatus(id, draft, etag, key) {
      return once(`offer.update:${id}`, key, { draft, etag }, () => patchOffer(id, draft, etag));
    },
    deleteInactiveOffer(id) {
      return runDemoOperation(() => {
        if (required(offers, id, "La oferta").status !== "INACTIVE") fail(409, "Solo se puede eliminar una oferta inactiva.");
        offers.delete(id);
      });
    },
    listRecipes(query, signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        return pageOf([...recipes.values()].filter(recipe => matches(`${recipe.name} ${recipe.description}`, query.q)).map(recipeWithSupplies), query.page, query.pageSize);
      });
    },
    getRecipe(id, signal) {
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        return { data: recipeWithSupplies(required(recipes, id, "La receta")), etag: version(id) };
      });
    },
    async createRecipe(draft, key) {
      return once("recipe.create", key, draft, () => {
        const recipe = { ...copy(draft), id: newId("recipe") };
        const result = recipeWithSupplies(recipe);
        recipes.set(recipe.id, recipe);
        return result;
      });
    },
    updateRecipe(id, draft, etag) {
      return runDemoOperation(() => {
        required(recipes, id, "La receta");
        checkVersion(id, etag);
        const recipe = { ...copy(draft), id };
        recipeWithSupplies(recipe);
        recipes.set(id, recipe);
        bump(id);
        return recipeWithSupplies(recipe);
      });
    },
    deleteRecipe(id) {
      return runDemoOperation(() => {
        required(recipes, id, "La receta");
        if ([...offers.values()].some(offer => offerUsesRecipe(offer, id))) {
          fail(409, "La receta está asociada a una oferta. Retira la asociación antes de eliminarla.");
        }
        recipes.delete(id);
      });
    },
    listInventoryItems(query, signal) {
      const requestedQuery = query ?? {};
      return runDemoOperation(() => {
        signal?.throwIfAborted();
        return pageOf([...inventory.values()].filter(item => matches(item.name, requestedQuery.q)), requestedQuery.page ?? 1, requestedQuery.pageSize ?? 100);
      });
    },
  };
}
