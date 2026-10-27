import type { EntryQuery, MenuCategory, MenuEntry, Page } from "./catalog";

const freshnessMs = 30_000;
const maxEntryQueries = 50;

interface CacheValue<T> {
  value: T;
  savedAt: number;
}

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
  const q = query.q?.trim();
  const categoryId = query.categoryId?.trim();
  return JSON.stringify({
    page: query.page,
    pageSize: query.pageSize,
    ...(q ? { q } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(query.status ? { status: query.status } : {}),
  });
}

function isFresh<T>(item: CacheValue<T> | undefined, now: number): item is CacheValue<T> {
  return item !== undefined && now - item.savedAt < freshnessMs;
}

function pruneExpiredEntries(entries: Map<string, CacheValue<Page<MenuEntry>>>, now: number) {
  for (const [key, item] of entries) {
    if (!isFresh(item, now)) {
      entries.delete(key);
    }
  }
}

export function cachedEntries(repository: object, query: EntryQuery): Page<MenuEntry> | undefined {
  const now = Date.now();
  const entries = store(repository).entries;
  pruneExpiredEntries(entries, now);
  const key = entryQueryKey(query);
  const item = entries.get(key);
  if (!item) return undefined;
  entries.delete(key);
  entries.set(key, item);
  return item.value;
}

export function rememberEntries(repository: object, query: EntryQuery, result: Page<MenuEntry>) {
  const now = Date.now();
  const entries = store(repository).entries;
  pruneExpiredEntries(entries, now);
  const key = entryQueryKey(query);
  entries.delete(key);
  entries.set(key, { value: result, savedAt: now });
  if (entries.size > maxEntryQueries) {
    const oldestEntry = entries.keys().next();
    if (!oldestEntry.done) entries.delete(oldestEntry.value);
  }
}

export function cachedCategories(repository: object): MenuCategory[] | undefined {
  const categories = store(repository).categories;
  return isFresh(categories, Date.now()) ? categories.value : undefined;
}

export function previousCategories(repository: object): MenuCategory[] | undefined {
  return store(repository).categories?.value;
}

export function categoryCacheRevision(repository: object): number {
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
