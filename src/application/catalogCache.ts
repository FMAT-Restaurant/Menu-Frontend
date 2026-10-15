import type { EntryQuery, MenuCategory, MenuEntry, Page } from "./catalog";

const freshnessMs = 30_000;
interface CacheValue<T> { value: T; savedAt: number }
interface CatalogCache {
  entries: Map<string, CacheValue<Page<MenuEntry>>>;
  categories?: CacheValue<MenuCategory[]>;
  categoriesRevision: number;
}

const stores = new WeakMap<object, CatalogCache>();

function store(repository: object): CatalogCache {
  let current = stores.get(repository);
  if (!current) {
    current = { entries: new Map(), categoriesRevision: 0 };
    stores.set(repository, current);
  }
  return current;
}

export function entryQueryKey(query: EntryQuery): string {
  return JSON.stringify(query);
}

function fresh<T>(item: CacheValue<T> | undefined): T | undefined {
  return item && Date.now() - item.savedAt < freshnessMs ? item.value : undefined;
}

export function cachedEntries(repository: object, query: EntryQuery) {
  return fresh(store(repository).entries.get(entryQueryKey(query)));
}

export function rememberEntries(repository: object, query: EntryQuery, result: Page<MenuEntry>) {
  store(repository).entries.set(entryQueryKey(query), { value: result, savedAt: Date.now() });
}

export function cachedCategories(repository: object) {
  return fresh(store(repository).categories);
}

export function previousCategories(repository: object) {
  return store(repository).categories?.value;
}

export function categoryCacheRevision(repository: object) {
  return store(repository).categoriesRevision;
}

export function rememberCategories(repository: object, categories: MenuCategory[]) {
  store(repository).categories = { value: categories, savedAt: Date.now() };
}

export function invalidateCatalogEntries(repository: object) {
  store(repository).entries.clear();
}

export function invalidateCatalogCategories(repository: object) {
  store(repository).categories = undefined;
  store(repository).categoriesRevision += 1;
}
