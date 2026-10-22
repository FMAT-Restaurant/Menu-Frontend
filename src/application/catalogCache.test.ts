import type { EntryQuery, MenuCategory, MenuEntry, Page } from "./catalog";
import {
  cachedCategories,
  cachedEntries,
  categoryCacheRevision,
  entryQueryKey,
  invalidateCatalogCategories,
  invalidateCatalogEntries,
  previousCategories,
  rememberCategories,
  rememberEntries,
} from "./catalogCache";
import { loadEntryCategories } from "./entryCategories";

function makePage(pageNumber: number, label = `Entrada ${pageNumber}`): Page<MenuEntry> {
  return {
    data: [
      {
        id: `entry-${pageNumber}`,
        brandName: label,
        description: `Descripción ${pageNumber}`,
        status: "ACTIVE",
        image: {
          id: `image-${pageNumber}`,
          url: `https://images.example/${pageNumber}.jpg`,
          thumbnailUrl: `https://images.example/${pageNumber}-thumb.jpg`,
        },
        categories: [{ id: "category-1", name: "Principales" }],
        offerCount: 1,
      },
    ],
    meta: { page: pageNumber, pageSize: 12, total: 60, totalPages: 5 },
  };
}

const sampleCategories: MenuCategory[] = [
  { id: "category-1", name: "Principales", description: "Platos principales", entryCount: 3 },
];

describe("catalogCache", () => {
  let now = 1_000;
  let nowSpy: jest.SpiedFunction<typeof Date.now>;

  beforeEach(() => {
    now = 1_000;
    nowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  test("canonical query key ignores property insertion order and normalizes empty optional filters without colliding across real filter changes", () => {
    const repository = {};
    const firstOrder: EntryQuery = {
      page: 2,
      pageSize: 12,
      q: "piña",
      categoryId: "category-1",
      status: "ACTIVE",
    };
    const reversedOrder: EntryQuery = {
      status: "ACTIVE",
      categoryId: "category-1",
      q: "  piña  ",
      pageSize: 12,
      page: 2,
    };

    expect(entryQueryKey(firstOrder)).toBe(entryQueryKey(reversedOrder));

    const expectedPage = makePage(2, "Hamburguesa Hawaiana");
    rememberEntries(repository, firstOrder, expectedPage);
    expect(cachedEntries(repository, reversedOrder)).toBe(expectedPage);

    const minimalQuery: EntryQuery = { page: 1, pageSize: 12 };
    const blankOptionalFilters: EntryQuery = {
      q: "   ",
      categoryId: "",
      status: undefined,
      pageSize: 12,
      page: 1,
    };
    expect(entryQueryKey(minimalQuery)).toBe(entryQueryKey(blankOptionalFilters));

    const pageOneResult = makePage(1, "Bowl de pollo");
    rememberEntries(repository, minimalQuery, pageOneResult);
    expect(cachedEntries(repository, blankOptionalFilters)).toBe(pageOneResult);

    const distinctQueries: EntryQuery[] = [
      { page: 1, pageSize: 12, q: "piña", categoryId: "category-1", status: "ACTIVE" },
      { page: 2, pageSize: 12, q: "piña", categoryId: "category-1", status: "ACTIVE" },
      { page: 1, pageSize: 24, q: "piña", categoryId: "category-1", status: "ACTIVE" },
      { page: 1, pageSize: 12, q: "arroz", categoryId: "category-1", status: "ACTIVE" },
      { page: 1, pageSize: 12, q: "piña", categoryId: "category-2", status: "ACTIVE" },
      { page: 1, pageSize: 12, q: "piña", categoryId: "category-1", status: "INACTIVE" },
      { page: 1, pageSize: 12, q: "piña", categoryId: "category-1", status: "ARCHIVED" },
      { page: 1, pageSize: 12, q: "piña", categoryId: "category-1" },
      { page: 1, pageSize: 12, q: "piña:category-1" },
      { page: 1, pageSize: 12, q: "piña", categoryId: "1" },
    ];
    const keys = new Set(distinctQueries.map((query) => entryQueryKey(query)));
    expect(keys.size).toBe(distinctQueries.length);
    expect(cachedEntries(repository, { ...firstOrder, page: 3 })).toBeUndefined();
    expect(cachedEntries(repository, { ...firstOrder, status: "INACTIVE" })).toBeUndefined();
    expect(cachedEntries(repository, { ...firstOrder, categoryId: "category-2" })).toBeUndefined();
    expect(cachedEntries(repository, { ...firstOrder, q: "arroz" })).toBeUndefined();
  });

  test("caps entry queries at 50 per repository with LRU eviction, updates usage order on read, and expires at 30 seconds from storage without extending TTL", () => {
    const repository = {};

    for (let page = 1; page <= 51; page += 1) {
      rememberEntries(repository, { page, pageSize: 12 }, makePage(page));
    }

    expect(cachedEntries(repository, { page: 1, pageSize: 12 })).toBeUndefined();
    for (let page = 2; page <= 51; page += 1) {
      expect(cachedEntries(repository, { page, pageSize: 12 })?.meta.page).toBe(page);
    }

    // Read page 2 just before the 30-second TTL so it becomes the most recently used entry
    now = 30_999;
    expect(cachedEntries(repository, { page: 2, pageSize: 12 })?.meta.page).toBe(2);

    // Inserting page 52 must evict page 3 (now the least recently used), keeping page 2
    rememberEntries(repository, { page: 52, pageSize: 12 }, makePage(52));
    expect(cachedEntries(repository, { page: 3, pageSize: 12 })).toBeUndefined();
    expect(cachedEntries(repository, { page: 2, pageSize: 12 })?.meta.page).toBe(2);
    expect(cachedEntries(repository, { page: 52, pageSize: 12 })?.meta.page).toBe(52);

    // Updating an existing query refreshes its value and savedAt without evicting another entry
    rememberEntries(repository, { page: 4, pageSize: 12 }, makePage(4, "Actualizada 4"));
    expect(cachedEntries(repository, { page: 5, pageSize: 12 })?.meta.page).toBe(5);

    // Reading page 2 at t = 30_999 did NOT renew its savedAt (1_000): at t = 31_000 (30 s elapsed) it expires
    now = 31_000;
    expect(cachedEntries(repository, { page: 2, pageSize: 12 })).toBeUndefined();
    expect(cachedEntries(repository, { page: 51, pageSize: 12 })).toBeUndefined();
    // Entries saved at t = 30_999 remain fresh
    expect(cachedEntries(repository, { page: 52, pageSize: 12 })?.meta.page).toBe(52);
    expect(cachedEntries(repository, { page: 4, pageSize: 12 })?.data[0]?.brandName).toBe("Actualizada 4");
  });

  test("prunes expired entry queries during both reads and writes even when their keys are never queried again", () => {
    const repository = {};

    // Store query 1 at t = 1_000
    rememberEntries(repository, { page: 1, pageSize: 12 }, makePage(1));

    // Store queries 2..50 at t = 10_000
    now = 10_000;
    for (let page = 2; page <= 50; page += 1) {
      rememberEntries(repository, { page, pageSize: 12 }, makePage(page));
    }

    // Read query 1 at t = 15_000 so query 2 becomes the least recently used among all 50 entries
    now = 15_000;
    expect(cachedEntries(repository, { page: 1, pageSize: 12 })?.meta.page).toBe(1);

    // At t = 31_000, query 1 is expired (30 s since t = 1_000), while queries 2..50 are still fresh (21 s old).
    // Insert query 51 without ever reading query 1 again: pruning expired query 1 frees capacity so query 2 is NOT evicted.
    now = 31_000;
    rememberEntries(repository, { page: 51, pageSize: 12 }, makePage(51));
    expect(cachedEntries(repository, { page: 2, pageSize: 12 })?.meta.page).toBe(2);
    expect(cachedEntries(repository, { page: 51, pageSize: 12 })?.meta.page).toBe(51);

    // Verify that reading an unrelated key also physically removes expired entries from the Map
    const secondRepo = {};
    now = 1_000;
    rememberEntries(secondRepo, { page: 10, pageSize: 12 }, makePage(10));
    now = 31_000;
    expect(cachedEntries(secondRepo, { page: 99, pageSize: 12 })).toBeUndefined();
    now = 2_000;
    expect(cachedEntries(secondRepo, { page: 10, pageSize: 12 })).toBeUndefined();
  });

  test("isolates repository instances and keeps category cache, revisions, and entryCategories deduplication independent of entry cache limits and invalidation", async () => {
    const repoB = {};
    let resolveCategories!: (items: MenuCategory[]) => void;
    const pendingCategories = new Promise<MenuCategory[]>((resolve) => {
      resolveCategories = resolve;
    });
    const repoA = {
      listCategories: jest.fn().mockReturnValue(pendingCategories),
    };

    rememberCategories(repoA, sampleCategories);
    rememberEntries(repoB, { page: 1, pageSize: 12 }, makePage(1, "En repo B"));

    for (let page = 1; page <= 55; page += 1) {
      rememberEntries(repoA, { page, pageSize: 12 }, makePage(page, `En repo A ${page}`));
    }

    // Categories on repoA and entries on repoB remain untouched after exceeding 50 entry queries on repoA
    expect(cachedCategories(repoA)).toEqual(sampleCategories);
    expect(previousCategories(repoA)).toEqual(sampleCategories);
    expect(categoryCacheRevision(repoA)).toBe(0);
    expect(cachedEntries(repoB, { page: 1, pageSize: 12 })?.data[0]?.brandName).toBe("En repo B");

    // Invalidating entries on repoA clears only repoA's entries and preserves repoA categories & repoB entries
    invalidateCatalogEntries(repoA);
    expect(cachedEntries(repoA, { page: 55, pageSize: 12 })).toBeUndefined();
    expect(cachedCategories(repoA)).toEqual(sampleCategories);
    expect(previousCategories(repoA)).toEqual(sampleCategories);
    expect(categoryCacheRevision(repoA)).toBe(0);
    expect(cachedEntries(repoB, { page: 1, pageSize: 12 })?.data[0]?.brandName).toBe("En repo B");

    // Start deduplicated category loading on repoA (with force = true) and invalidate/populate entries mid-flight
    const firstSubscriber = loadEntryCategories(repoA, new AbortController().signal, true);
    const secondSubscriber = loadEntryCategories(repoA, new AbortController().signal, true);
    invalidateCatalogEntries(repoA);
    for (let page = 1; page <= 51; page += 1) {
      rememberEntries(repoA, { page, pageSize: 12 }, makePage(page));
    }
    const updatedCategories: MenuCategory[] = [{ id: "category-2", name: "Postres" }];
    resolveCategories(updatedCategories);

    await expect(Promise.all([firstSubscriber, secondSubscriber])).resolves.toEqual([
      updatedCategories,
      updatedCategories,
    ]);
    expect(repoA.listCategories).toHaveBeenCalledTimes(1);
    expect(cachedCategories(repoA)).toEqual(updatedCategories);

    // Invalidating categories increments category revision and clears cachedCategories without clearing repoA entries
    invalidateCatalogCategories(repoA);
    expect(cachedCategories(repoA)).toBeUndefined();
    expect(previousCategories(repoA)).toBeUndefined();
    expect(categoryCacheRevision(repoA)).toBe(1);
    expect(cachedEntries(repoA, { page: 51, pageSize: 12 })?.meta.page).toBe(51);
  });
});
