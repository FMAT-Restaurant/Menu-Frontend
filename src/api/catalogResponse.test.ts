import {
  CatalogResponseError,
  categoryPage,
  categoryResponse,
  contractErrorResponse,
  entryDetailResponse,
  entryPage,
  inventoryItemResponse,
  inventoryPage,
  isCatalogImage,
  isCategory,
  isCategoryReference,
  isCompositionSlotDetail,
  isEntry,
  isEntryDetail,
  isInventoryItem,
  isOfferDetail,
  isOfferSummary,
  isPageMeta,
  isRecipeDetail,
  isRecipeSummary,
  isSlotOptionDetail,
  offerDetailResponse,
  offerPage,
  recipeDetailResponse,
  recipePage,
  uploadedImageResponse,
} from "./catalogResponse";

const validImage = {
  id: "img-1",
  url: "/images/img-1.png",
  thumbnailUrl: "/images/img-1-thumb.png",
};

const entry = {
  id: "entry-1",
  brandName: "Bowl",
  description: "Con arroz",
  status: "INACTIVE",
  image: null,
  categories: [{ id: "category-1", name: "Platos" }],
  offerCount: 0,
};

const meta = { page: 1, pageSize: 12, total: 1, totalPages: 1 };

describe("catalogResponse runtime validators", () => {
  test("accepts complete entry and category pages", () => {
    expect(entryPage({ data: [entry], meta }).data[0].brandName).toBe("Bowl");
    expect(
      categoryPage({
        data: [{ id: "category-1", name: "Platos", description: "Principales", entryCount: 3 }],
        meta,
      }).data[0].name,
    ).toBe("Platos");
  });

  test.each([
    null,
    { data: {}, meta },
    { data: [entry], meta: { ...meta, page: 0 } },
    { data: [entry], meta: { ...meta, pageSize: 0 } },
    { data: [entry], meta: { ...meta, total: -1 } },
    { data: [entry], meta: { ...meta, totalPages: -1 } },
    { data: [{ ...entry, categories: null }], meta },
    { data: [{ ...entry, status: "PUBLISHED" }], meta },
    { data: [{ ...entry, image: { id: "img-1", url: "/x.png" } }], meta },
    { data: [{ ...entry, offerCount: -1 }], meta },
  ])("rejects malformed entry responses before rendering", (payload) => {
    expect(() => entryPage(payload)).toThrow("Respuesta de entradas inválida.");
  });

  test("validates CatalogImage requiring id, url and thumbnailUrl", () => {
    expect(isCatalogImage(validImage)).toBe(true);
    expect(isCatalogImage({ id: "img-1", url: "/img.png" })).toBe(false);
    expect(isCatalogImage({ id: "img-1", thumbnailUrl: "/thumb.png" })).toBe(false);
    expect(isCatalogImage({ url: "/img.png", thumbnailUrl: "/thumb.png" })).toBe(false);
    expect(uploadedImageResponse({ data: validImage })).toEqual(validImage);
    expect(() => uploadedImageResponse({ data: { id: "img-1" } })).toThrow(CatalogResponseError);
  });

  test("validates category references and full categories with optional description and entryCount", () => {
    expect(isCategoryReference({ id: "cat-1", name: "Postres" })).toBe(true);
    expect(isCategoryReference({ id: "cat-1" })).toBe(false);

    expect(isCategory({ id: "cat-1", name: "Postres" })).toBe(true);
    expect(isCategory({ id: "cat-1", name: "Postres", description: "Dulces", entryCount: 0 })).toBe(true);
    expect(isCategory({ id: "cat-1", name: "Postres", description: 123 })).toBe(false);
    expect(isCategory({ id: "cat-1", name: "Postres", entryCount: -1 })).toBe(false);

    expect(categoryResponse({ data: { id: "cat-1", name: "Postres" } }).name).toBe("Postres");
    expect(() => categoryPage({ data: [{ id: "category-1" }], meta })).toThrow(
      "Respuesta de categorías inválida.",
    );
    expect(() => categoryResponse({ data: { id: "cat-1", name: "Postres", entryCount: -3 } })).toThrow(
      "Respuesta de categoría inválida.",
    );
  });

  test("validates entryDetailResponse and only uses HTTP header etag over any body etag", () => {
    const rawDetail = {
      id: "entry-1",
      brandName: "Ramen",
      description: "Caldo intenso",
      status: "ACTIVE",
      categoryIds: ["cat-1"],
      imageRef: "img-1",
      image: validImage,
      etag: '"body-etag-must-be-ignored"',
    };
    const parsed = entryDetailResponse({ data: rawDetail }, '"header-etag"');
    expect(parsed).toEqual({
      id: "entry-1",
      brandName: "Ramen",
      description: "Caldo intenso",
      status: "ACTIVE",
      categoryIds: ["cat-1"],
      imageRef: "img-1",
      image: validImage,
      etag: '"header-etag"',
    });

    const parsedWithoutHeader = entryDetailResponse({
      data: {
        id: "entry-1",
        brandName: "Ramen",
        description: "Caldo intenso",
        status: "ACTIVE",
        categoryIds: ["cat-1"],
        etag: '"body-etag"',
      },
    });
    expect(parsedWithoutHeader.etag).toBeUndefined();
    expect(isEntryDetail({ ...rawDetail, categoryIds: [123] })).toBe(false);
    expect(() => entryDetailResponse({ data: { id: "entry-1" } })).toThrow(
      "Respuesta de entrada inválida.",
    );
  });

  test("validates offers, composition slots and slot options with optional recipeRevision", () => {
    const recipeOptionWithoutRevision = {
      optionId: "opt-1",
      displayName: "Sopa miso",
      sourceType: "RECIPE",
      recipeId: "rec-1",
    };
    const recipeOptionWithRevision = {
      optionId: "opt-2",
      displayName: "Tonkotsu",
      status: "ACTIVE",
      sourceType: "RECIPE",
      recipeId: "rec-2",
      recipeRevision: 2,
    };
    const inventoryOption = {
      optionId: "opt-3",
      displayName: "Té verde",
      status: "INACTIVE",
      sourceType: "INVENTORY_ITEM",
      inventoryItemId: "inv-1",
      quantity: 1,
      unit: "pieza",
    };

    expect(isSlotOptionDetail(recipeOptionWithoutRevision)).toBe(true);
    expect(isSlotOptionDetail(recipeOptionWithRevision)).toBe(true);
    expect(isSlotOptionDetail(inventoryOption)).toBe(true);
    expect(isSlotOptionDetail({ ...recipeOptionWithRevision, recipeRevision: 0 })).toBe(false);
    expect(isSlotOptionDetail({ ...recipeOptionWithoutRevision, inventoryItemId: "inv-1" })).toBe(false);
    expect(isSlotOptionDetail({ ...inventoryOption, recipeId: "rec-1" })).toBe(false);
    expect(isSlotOptionDetail({ ...inventoryOption, sourceType: "OTHER" })).toBe(false);
    expect(isSlotOptionDetail({ optionId: "", displayName: "X", sourceType: "RECIPE", recipeId: "r" })).toBe(
      false,
    );

    const slot = {
      slotId: "slot-1",
      name: "Entrada",
      quantity: 1,
      status: "ACTIVE",
      course: "entrada",
      options: [recipeOptionWithoutRevision, inventoryOption],
    };
    expect(isCompositionSlotDetail(slot)).toBe(true);
    expect(isCompositionSlotDetail({ ...slot, course: "invalido" })).toBe(false);

    const offerSummary = {
      id: "offer-1",
      entryId: "entry-1",
      entryName: "Bowl",
      presentationTag: "Ejecutivo",
      basePrice: 150,
      status: "ACTIVE",
      image: validImage,
      slotCount: 1,
    };
    expect(isOfferSummary(offerSummary)).toBe(true);
    expect(offerPage({ data: [offerSummary], meta }).data).toHaveLength(1);
    expect(() => offerPage({ data: [{ ...offerSummary, basePrice: -1 }], meta })).toThrow(
      "Respuesta de ofertas inválida.",
    );

    const offerDetail = {
      id: "offer-1",
      entryId: "entry-1",
      presentationTag: "Ejecutivo",
      basePrice: 150,
      status: "ACTIVE",
      image: null,
      composition: { slots: [slot] },
    };
    expect(isOfferDetail(offerDetail)).toBe(true);
    expect(offerDetailResponse({ data: offerDetail }).id).toBe("offer-1");
    expect(() => offerDetailResponse({ data: { ...offerDetail, composition: {} } })).toThrow(
      "Respuesta de oferta inválida.",
    );
  });

  test("validates recipes and inventory responses", () => {
    const item = { id: "inv-1", name: "Arroz", unit: "kg" };
    expect(isInventoryItem(item)).toBe(true);
    expect(inventoryPage({ data: [item], meta }).data[0]).toEqual(item);
    expect(inventoryItemResponse({ data: item })).toEqual(item);
    expect(() => inventoryPage({ data: [{ id: "inv-1" }], meta })).toThrow(
      "Respuesta de inventario inválida.",
    );
    expect(() => inventoryItemResponse({ data: { id: "inv-1" } })).toThrow(
      "Respuesta de inventario inválida.",
    );

    const recipeSummary = {
      id: "rec-1",
      name: "Arroz al vapor",
      description: "Base",
      supplies: [{ inventoryItemId: "inv-1", quantity: 0.25, inventoryItem: item }],
    };
    const recipeDetail = {
      ...recipeSummary,
      instructions: "Cocer 20 minutos",
    };

    expect(isRecipeSummary(recipeSummary)).toBe(true);
    expect(isRecipeDetail(recipeDetail)).toBe(true);
    expect(recipePage({ data: [recipeSummary], meta }).data[0].name).toBe("Arroz al vapor");
    expect(recipeDetailResponse({ data: recipeDetail }).instructions).toBe("Cocer 20 minutos");
    expect(() =>
      recipePage({
        data: [{ ...recipeSummary, supplies: [{ inventoryItemId: "inv-1", quantity: 0 }] }],
        meta,
      }),
    ).toThrow("Respuesta de recetas inválida.");
    expect(() => recipeDetailResponse({ data: recipeSummary })).toThrow("Respuesta de receta inválida.");
  });

  test("validates contractual error payloads and rejects malformed error shapes", () => {
    expect(contractErrorResponse(null)).toBeNull();
    expect(contractErrorResponse({ error: {} })).toBeNull();
    expect(contractErrorResponse({ error: { message: "Error simple" } })).toEqual({
      message: "Error simple",
    });

    const withDetails = contractErrorResponse({
      error: {
        message: "Conflicto de idempotencia",
        details: {
          code: "IDEMPOTENCY_IN_PROGRESS",
          offerIds: ["offer-1", "offer-2"],
          violations: [{ path: "composition.slots[0]", message: "Slot requerido" }],
        },
      },
    });
    expect(withDetails).toEqual({
      message: "Conflicto de idempotencia",
      details: {
        code: "IDEMPOTENCY_IN_PROGRESS",
        offerIds: ["offer-1", "offer-2"],
        violations: [{ path: "composition.slots[0]", message: "Slot requerido" }],
        raw: {
          code: "IDEMPOTENCY_IN_PROGRESS",
          offerIds: ["offer-1", "offer-2"],
          violations: [{ path: "composition.slots[0]", message: "Slot requerido" }],
        },
      },
    });

    expect(
      contractErrorResponse({
        error: { message: "Mal", details: "no-record" },
      }),
    ).toBeNull();
    expect(
      contractErrorResponse({
        error: { message: "Mal", details: { code: "" } },
      }),
    ).toBeNull();
    expect(
      contractErrorResponse({
        error: { message: "Mal", details: { violations: [] } },
      }),
    ).toBeNull();
    expect(
      contractErrorResponse({
        error: { message: "Mal", details: { violations: [{ path: "a" }] } },
      }),
    ).toBeNull();
    expect(
      contractErrorResponse({
        error: { message: "Mal", details: { offerIds: [123] } },
      }),
    ).toBeNull();
  });

  test("exposes helper predicates for entries and page metadata", () => {
    expect(isPageMeta(meta)).toBe(true);
    expect(isPageMeta(null)).toBe(false);
    expect(isEntry({ ...entry, image: validImage })).toBe(true);
  });
});
