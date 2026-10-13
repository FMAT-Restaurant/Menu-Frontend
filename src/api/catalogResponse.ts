import type { MenuCategory, MenuEntry, Page } from "../application/catalog";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pageMeta(value: unknown): value is Page<unknown>["meta"] {
  if (!record(value)) return false;
  return ["page", "pageSize", "total", "totalPages"].every((key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0)
    && Number(value.page) >= 1 && Number(value.pageSize) >= 1;
}

function page<T>(value: unknown, validItem: (item: unknown) => item is T): value is Page<T> {
  return record(value) && pageMeta(value.meta) && Array.isArray(value.data) && value.data.every(validItem);
}

function category(value: unknown): value is MenuCategory {
  return record(value) && typeof value.id === "string" && typeof value.name === "string";
}

function entry(value: unknown): value is MenuEntry {
  return record(value) && typeof value.id === "string" && typeof value.brandName === "string"
    && typeof value.description === "string" && ["ACTIVE", "INACTIVE", "ARCHIVED"].includes(String(value.status))
    && Array.isArray(value.categories) && value.categories.every(category)
    && Number.isSafeInteger(value.offerCount) && Number(value.offerCount) >= 0
    && (value.image === null || (record(value.image) && typeof value.image.url === "string"));
}

export function entryPage(value: unknown): Page<MenuEntry> {
  if (!page(value, entry)) throw new Error("Respuesta de entradas inválida.");
  return value;
}

export function categoryPage(value: unknown): Page<MenuCategory> {
  if (!page(value, category)) throw new Error("Respuesta de categorías inválida.");
  return value;
}
