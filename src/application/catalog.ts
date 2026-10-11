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
  entryCount?: number;
}

export interface MenuImage {
  id?: string;
  url?: string;
  thumbnailUrl?: string;
}

export interface MenuEntryDetail {
  id: string;
  brandName: string;
  description: string;
  status: EntryStatus;
  categoryIds: string[];
  imageRef?: string;
  image?: MenuImage | null;
}

export interface EntryCreateDraft {
  brandName: string;
  description: string;
  categoryIds: string[];
}

export interface EntryUpdateDraft extends EntryCreateDraft {
  status: EntryStatus;
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
  updateCategory(id: string, draft: CategoryDraft): Promise<MenuCategory>;
  setEntryStatus(id: string, status: EntryStatus): Promise<void>;
  deleteArchivedEntry(id: string): Promise<void>;
  getEntry(id: string, signal?: AbortSignal): Promise<MenuEntryDetail>;
  createEntry(draft: EntryCreateDraft, image: File): Promise<MenuEntryDetail>;
  updateEntry(id: string, draft: EntryUpdateDraft, image?: File): Promise<MenuEntryDetail>;
}
