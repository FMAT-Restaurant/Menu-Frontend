import type {
  CatalogImage,
  CompositionSlotDetail,
  EntryStatus,
  InventoryItem,
  MenuCategory,
  MenuCategoryReference,
  MenuEntry,
  MenuEntryDetail,
  MenuOffer,
  MenuOfferDetail,
  OfferCourse,
  OfferStatus,
  Page,
  RecipeDetail,
  RecipeSummary,
  RecipeSupply,
  SlotOptionDetail,
} from "../application/catalog";

export type CatalogResponseFamily =
  | "entries"
  | "categories"
  | "offers"
  | "recipes"
  | "inventory"
  | "images"
  | "error";

export class CatalogResponseError extends Error {
  readonly code = "INVALID_CATALOG_RESPONSE" as const;
  readonly family: CatalogResponseFamily;

  constructor(message: string, family: CatalogResponseFamily) {
    super(message);
    this.name = "CatalogResponseError";
    this.family = family;
  }
}

export interface ContractValidationViolation {
  path: string;
  message: string;
}

export interface ContractErrorDetails {
  code?: string;
  violations?: ContractValidationViolation[];
  offerIds?: string[];
  raw: Record<string, unknown>;
}

export interface ContractErrorPayload {
  message: string;
  details?: ContractErrorDetails;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function nonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function dataEnvelope<T>(
  value: unknown,
  validData: (data: unknown) => data is T,
): value is { data: T } {
  return record(value) && validData(value.data);
}

export function isPageMeta(value: unknown): value is Page<unknown>["meta"] {
  if (!record(value)) return false;
  return (
    nonNegativeSafeInteger(value.page) &&
    value.page >= 1 &&
    nonNegativeSafeInteger(value.pageSize) &&
    value.pageSize >= 1 &&
    nonNegativeSafeInteger(value.total) &&
    nonNegativeSafeInteger(value.totalPages)
  );
}

function page<T>(value: unknown, validItem: (item: unknown) => item is T): value is Page<T> {
  return record(value) && isPageMeta(value.meta) && Array.isArray(value.data) && value.data.every(validItem);
}

export function isCatalogImage(value: unknown): value is CatalogImage {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.url) &&
    nonEmptyString(value.thumbnailUrl)
  );
}

export function isCategoryReference(value: unknown): value is MenuCategoryReference {
  return record(value) && nonEmptyString(value.id) && nonEmptyString(value.name);
}

export function isCategory(value: unknown): value is MenuCategory {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.name) &&
    (value.description === undefined || typeof value.description === "string") &&
    (value.entryCount === undefined || nonNegativeSafeInteger(value.entryCount))
  );
}

export function isEntryStatus(value: unknown): value is EntryStatus {
  return value === "ACTIVE" || value === "INACTIVE" || value === "ARCHIVED";
}

export function isOfferStatus(value: unknown): value is OfferStatus {
  return value === "ACTIVE" || value === "INACTIVE";
}

export function isOfferCourse(value: unknown): value is OfferCourse {
  return (
    value === "entrada" ||
    value === "plato fuerte" ||
    value === "postre" ||
    value === "bebida"
  );
}

export function isEntry(value: unknown): value is MenuEntry {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    typeof value.brandName === "string" &&
    typeof value.description === "string" &&
    isEntryStatus(value.status) &&
    Array.isArray(value.categories) &&
    value.categories.every(isCategoryReference) &&
    nonNegativeSafeInteger(value.offerCount) &&
    (value.image === null || isCatalogImage(value.image))
  );
}

export function isEntryDetail(value: unknown): value is MenuEntryDetail {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    typeof value.brandName === "string" &&
    typeof value.description === "string" &&
    isEntryStatus(value.status) &&
    Array.isArray(value.categoryIds) &&
    value.categoryIds.every(nonEmptyString) &&
    (value.imageRef === undefined || typeof value.imageRef === "string") &&
    (value.image === undefined || value.image === null || isCatalogImage(value.image))
  );
}

export function isSlotOptionDetail(value: unknown): value is SlotOptionDetail {
  if (
    !record(value) ||
    !nonEmptyString(value.optionId) ||
    typeof value.displayName !== "string" ||
    (value.status !== undefined && !isOfferStatus(value.status))
  ) {
    return false;
  }

  if (value.sourceType === "RECIPE") {
    return (
      nonEmptyString(value.recipeId) &&
      (value.recipeRevision === undefined ||
        (nonNegativeSafeInteger(value.recipeRevision) && value.recipeRevision >= 1)) &&
      value.inventoryItemId === undefined &&
      value.quantity === undefined &&
      value.unit === undefined
    );
  }

  if (value.sourceType === "INVENTORY_ITEM") {
    return (
      nonEmptyString(value.inventoryItemId) &&
      positiveFiniteNumber(value.quantity) &&
      nonEmptyString(value.unit) &&
      value.recipeId === undefined &&
      value.recipeRevision === undefined
    );
  }

  return false;
}

export function isCompositionSlotDetail(value: unknown): value is CompositionSlotDetail {
  return (
    record(value) &&
    nonEmptyString(value.slotId) &&
    nonEmptyString(value.name) &&
    positiveFiniteNumber(value.quantity) &&
    (value.status === undefined || isOfferStatus(value.status)) &&
    (value.course === undefined || value.course === null || isOfferCourse(value.course)) &&
    Array.isArray(value.options) &&
    value.options.every(isSlotOptionDetail)
  );
}

export function isOfferSummary(value: unknown): value is MenuOffer {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.entryId) &&
    typeof value.entryName === "string" &&
    typeof value.presentationTag === "string" &&
    nonNegativeFiniteNumber(value.basePrice) &&
    isOfferStatus(value.status) &&
    (value.image === null || isCatalogImage(value.image)) &&
    nonNegativeSafeInteger(value.slotCount)
  );
}

export function isOfferDetail(value: unknown): value is MenuOfferDetail {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.entryId) &&
    typeof value.presentationTag === "string" &&
    nonNegativeFiniteNumber(value.basePrice) &&
    isOfferStatus(value.status) &&
    (value.image === null || isCatalogImage(value.image)) &&
    record(value.composition) &&
    Array.isArray(value.composition.slots) &&
    value.composition.slots.every(isCompositionSlotDetail)
  );
}

export function isInventoryItem(value: unknown): value is InventoryItem {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.name) &&
    nonEmptyString(value.unit)
  );
}

export function isRecipeSupply(value: unknown): value is RecipeSupply {
  return (
    record(value) &&
    nonEmptyString(value.inventoryItemId) &&
    positiveFiniteNumber(value.quantity) &&
    (value.inventoryItem === undefined || isInventoryItem(value.inventoryItem))
  );
}

export function isRecipeSummary(value: unknown): value is RecipeSummary {
  return (
    record(value) &&
    nonEmptyString(value.id) &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.supplies) &&
    value.supplies.every(isRecipeSupply)
  );
}

export function isRecipeDetail(value: unknown): value is RecipeDetail {
  return record(value) && isRecipeSummary(value) && typeof value.instructions === "string";
}

export function entryPage(value: unknown): Page<MenuEntry> {
  if (!page(value, isEntry)) {
    throw new CatalogResponseError("Respuesta de entradas inválida.", "entries");
  }
  return value;
}

export function entryDetailResponse(value: unknown, etag?: unknown): MenuEntryDetail {
  if (!dataEnvelope(value, isEntryDetail)) {
    throw new CatalogResponseError("Respuesta de entrada inválida.", "entries");
  }
  const raw = value.data;
  const detail: MenuEntryDetail = {
    id: raw.id,
    brandName: raw.brandName,
    description: raw.description,
    status: raw.status,
    categoryIds: [...raw.categoryIds],
    ...(raw.imageRef !== undefined ? { imageRef: raw.imageRef } : {}),
    ...(raw.image !== undefined ? { image: raw.image } : {}),
    ...(typeof etag === "string" ? { etag } : {}),
  };
  return detail;
}

export function categoryPage(value: unknown): Page<MenuCategory> {
  if (!page(value, isCategory)) {
    throw new CatalogResponseError("Respuesta de categorías inválida.", "categories");
  }
  return value;
}

export function categoryResponse(value: unknown): MenuCategory {
  if (!dataEnvelope(value, isCategory)) {
    throw new CatalogResponseError("Respuesta de categoría inválida.", "categories");
  }
  return value.data;
}

export function uploadedImageResponse(value: unknown): CatalogImage {
  if (!dataEnvelope(value, isCatalogImage)) {
    throw new CatalogResponseError(
      "Respuesta de imagen inválida. No se recibió el identificador de la imagen. La entrada no se guardó.",
      "images",
    );
  }
  return value.data;
}

export function offerPage(value: unknown): Page<MenuOffer> {
  if (!page(value, isOfferSummary)) {
    throw new CatalogResponseError("Respuesta de ofertas inválida.", "offers");
  }
  return value;
}

export function offerDetailResponse(value: unknown): MenuOfferDetail {
  if (!dataEnvelope(value, isOfferDetail)) {
    throw new CatalogResponseError("Respuesta de oferta inválida.", "offers");
  }
  return value.data;
}

export function recipePage(value: unknown): Page<RecipeSummary> {
  if (!page(value, isRecipeSummary)) {
    throw new CatalogResponseError("Respuesta de recetas inválida.", "recipes");
  }
  return value;
}

export function recipeDetailResponse(value: unknown): RecipeDetail {
  if (!dataEnvelope(value, isRecipeDetail)) {
    throw new CatalogResponseError("Respuesta de receta inválida.", "recipes");
  }
  return value.data;
}

export function inventoryPage(value: unknown): Page<InventoryItem> {
  if (!page(value, isInventoryItem)) {
    throw new CatalogResponseError("Respuesta de inventario inválida.", "inventory");
  }
  return value;
}

export function inventoryItemResponse(value: unknown): InventoryItem {
  if (!dataEnvelope(value, isInventoryItem)) {
    throw new CatalogResponseError("Respuesta de inventario inválida.", "inventory");
  }
  return value.data;
}

function parseViolations(value: unknown): ContractValidationViolation[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed: ContractValidationViolation[] = [];
  for (const item of value) {
    if (!record(item) || !nonEmptyString(item.path) || !nonEmptyString(item.message)) {
      return undefined;
    }
    parsed.push({ path: item.path, message: item.message });
  }
  return parsed;
}

export function contractErrorResponse(value: unknown): ContractErrorPayload | null {
  if (!record(value) || !record(value.error)) {
    return null;
  }
  const errorObj = value.error;
  if (!nonEmptyString(errorObj.message)) {
    return null;
  }
  if (errorObj.details === undefined) {
    return { message: errorObj.message.trim() };
  }
  if (!record(errorObj.details)) {
    return null;
  }
  const rawDetails = errorObj.details;
  const details: ContractErrorDetails = { raw: rawDetails };

  if (rawDetails.code !== undefined) {
    if (!nonEmptyString(rawDetails.code)) return null;
    details.code = rawDetails.code;
  }
  if (rawDetails.violations !== undefined) {
    const violations = parseViolations(rawDetails.violations);
    if (!violations || violations.length === 0) return null;
    details.violations = violations;
  }
  if (rawDetails.offerIds !== undefined) {
    if (!Array.isArray(rawDetails.offerIds) || !rawDetails.offerIds.every(nonEmptyString)) {
      return null;
    }
    details.offerIds = [...rawDetails.offerIds];
  }
  return {
    message: errorObj.message.trim(),
    details,
  };
}
