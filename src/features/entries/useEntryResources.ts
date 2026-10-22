import { useEffect, useState } from "react";
import type { MenuCategory, MenuEntryDetail, MenuRepository } from "../../application/catalog";
import { cachedCategories, previousCategories } from "../../application/catalogCache";
import { loadEntryCategories } from "../../application/entryCategories";
import { entryFailure } from "./entryError";

export type EntryResourcesRepository = Pick<MenuRepository, "listCategories" | "getEntry">;

export function useEntryResources(repository: EntryResourcesRepository, entryId: string | undefined, onLoaded: (entry: MenuEntryDetail) => void) {
  const [entry, setEntry] = useState<MenuEntryDetail | null>(null);
  const [entryLoading, setEntryLoading] = useState(Boolean(entryId));
  const [entryError, setEntryError] = useState("");
  const [categories, setCategories] = useState<MenuCategory[]>(() => previousCategories(repository) ?? []);
  const [categoriesLoading, setCategoriesLoading] = useState(!cachedCategories(repository));
  const [categoriesError, setCategoriesError] = useState("");
  const [continuing, setContinuing] = useState(false);
  const [entryRetry, setEntryRetry] = useState(0);
  const [categoriesRetry, setCategoriesRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);
    setCategoriesError("");
    loadEntryCategories(repository, controller.signal, categoriesRetry > 0).then((items) => {
      if (!controller.signal.aborted) { setCategories(items); setContinuing(false); }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCategoriesError(entryFailure(error).message);
    }).finally(() => {
      if (!controller.signal.aborted) setCategoriesLoading(false);
    });
    return () => controller.abort();
  }, [repository, categoriesRetry]);

  useEffect(() => {
    if (!entryId) return;
    const controller = new AbortController();
    setEntryLoading(true);
    setEntryError("");
    repository.getEntry(entryId, controller.signal).then((current) => {
      if (controller.signal.aborted) return;
      setEntry(current);
      onLoaded(current);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setEntryError(entryFailure(error).message);
    }).finally(() => {
      if (!controller.signal.aborted) setEntryLoading(false);
    });
    return () => controller.abort();
  }, [repository, entryId, entryRetry, onLoaded]);

  return {
    entry, setEntry, entryLoading, entryError,
    categories, categoriesLoading, categoriesError, continuing,
    categoriesReady: continuing || (!categoriesLoading && !categoriesError),
    retryEntry: () => setEntryRetry((value) => value + 1),
    retryCategories: () => setCategoriesRetry((value) => value + 1),
    continueWithoutCategories: () => setContinuing(true),
  };
}
