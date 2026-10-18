import { loadEntryCategories } from "./entryCategories";
import { cachedCategories, invalidateCatalogCategories, previousCategories } from "./catalogCache";
import type { MenuCategory } from "./catalog";

const categories = [{ id: "category-1", name: "Principales" }];
function deferred() {
  let resolve!: (items: MenuCategory[]) => void;
  const promise = new Promise<MenuCategory[]>((done) => { resolve = done; });
  return { promise, resolve };
}

test("reuses fresh categories for 30 seconds and keeps expired data during refresh", async () => {
  let now = 1000;
  const time = jest.spyOn(Date, "now").mockImplementation(() => now);
  const repository = { listCategories: jest.fn().mockResolvedValue(categories) };
  try {
    await loadEntryCategories(repository, new AbortController().signal);
    await loadEntryCategories(repository, new AbortController().signal);
    expect(repository.listCategories).toHaveBeenCalledTimes(1);
    now += 30001;
    expect(previousCategories(repository)).toEqual(categories);
    await loadEntryCategories(repository, new AbortController().signal);
    expect(repository.listCategories).toHaveBeenCalledTimes(2);
    await loadEntryCategories(repository, new AbortController().signal, true);
    expect(repository.listCategories).toHaveBeenCalledTimes(3);
  } finally { time.mockRestore(); }
});

test("deduplicates equivalent subscribers and one consumer can cancel independently", async () => {
  const pending = deferred();
  const repository = { listCategories: jest.fn().mockReturnValue(pending.promise) };
  const first = new AbortController();
  const a = loadEntryCategories(repository, first.signal);
  const b = loadEntryCategories(repository, new AbortController().signal);
  first.abort();
  await expect(a).rejects.toHaveProperty("name", "AbortError");
  pending.resolve(categories);
  await expect(b).resolves.toEqual(categories);
  expect(repository.listCategories).toHaveBeenCalledTimes(1);
  expect(repository.listCategories.mock.calls[0][0].aborted).toBe(false);
});

test("StrictMode cleanup and immediate remount share one completed request", async () => {
  const repository = { listCategories: jest.fn().mockResolvedValue(categories) };
  const first = new AbortController();
  const a = loadEntryCategories(repository, first.signal);
  first.abort();
  const b = loadEntryCategories(repository, new AbortController().signal);
  await expect(a).rejects.toHaveProperty("name", "AbortError");
  await expect(b).resolves.toEqual(categories);
  expect(repository.listCategories).toHaveBeenCalledTimes(1);
});

test("aborts abandoned work, does not cache its late response, and retries cleanly", async () => {
  const pending = deferred();
  const repository = { listCategories: jest.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(categories) };
  const controller = new AbortController();
  const abandoned = loadEntryCategories(repository, controller.signal);
  await Promise.resolve();
  controller.abort();
  await expect(abandoned).rejects.toHaveProperty("name", "AbortError");
  expect(repository.listCategories.mock.calls[0][0].aborted).toBe(true);
  const next = loadEntryCategories(repository, new AbortController().signal);
  pending.resolve([{ id: "old", name: "Respuesta obsoleta" }]);
  await expect(next).resolves.toEqual(categories);
  expect(cachedCategories(repository)).toEqual(categories);
  await expect(loadEntryCategories(repository, controller.signal)).rejects.toHaveProperty("name", "AbortError");
});

test("catalog invalidation prevents an earlier request from restoring stale cache", async () => {
  const pending = deferred();
  const repository = { listCategories: jest.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(categories) };
  const a = loadEntryCategories(repository, new AbortController().signal);
  invalidateCatalogCategories(repository);
  const b = loadEntryCategories(repository, new AbortController().signal);
  pending.resolve([{ id: "old", name: "Antigua" }]);
  await a; await b;
  expect(cachedCategories(repository)).toEqual(categories);
  expect(repository.listCategories).toHaveBeenCalledTimes(2);
});

test("a failed category request can be retried without caching the failure", async () => {
  const repository = { listCategories: jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(categories) };
  await expect(loadEntryCategories(repository, new AbortController().signal)).rejects.toThrow("offline");
  expect(cachedCategories(repository)).toBeUndefined();
  await expect(loadEntryCategories(repository, new AbortController().signal)).resolves.toEqual(categories);
});
