export type EntryStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface MenuEntry {
  id: string;
  brandName: string;
  description: string;
  status: EntryStatus;
  image: { id: string; url: string; thumbnailUrl: string } | null;
  categories: { id: string; name: string }[];
  offerCount: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  entryCount: number;
  etag?: string;
}

export interface CategoryDraft {
  name: string;
  description: string;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface EntryQuery {
  q?: string;
  categoryId?: string;
  status?: EntryStatus;
  page: number;
  pageSize: number;
}

export interface MenuRepository {
  listEntries(query: EntryQuery, signal?: AbortSignal): Promise<Page<MenuEntry>>;
  listCategories(signal?: AbortSignal): Promise<MenuCategory[]>;
  createCategory(draft: CategoryDraft): Promise<MenuCategory>;
  updateCategory(id: string, draft: CategoryDraft, etag: string): Promise<MenuCategory>;
  setEntryStatus(id: string, status: EntryStatus): Promise<void>;
  deleteArchivedEntry(id: string): Promise<void>;
}
