import type { AxiosInstance } from "axios";
import type { CategoryDraft, EntryCreateDraft, EntryQuery, EntryStatus, EntryUpdateDraft, MenuCategory, MenuEntry, MenuEntryDetail, MenuRepository, Page } from "../application/catalog";

function entryPath(menuId: string, entryId?: string) {
  const base = `/menus/${encodeURIComponent(menuId)}/entries`;
  return entryId ? `${base}/${encodeURIComponent(entryId)}` : base;
}

function entryMultipart(draft: EntryCreateDraft | EntryUpdateDraft, image: File) {
  const form = new FormData();
  form.append("entry", new Blob([JSON.stringify(draft)], { type: "application/json" }));
  form.append("image", image);
  return form;
}

function unwrap<T>(response: T | { data: T }): T {
  return response && typeof response === "object" && "data" in response
    ? response.data as T
    : response as T;
}

export function createMenuApi(client: AxiosInstance, menuId = "1"): MenuRepository {
  async function currentEntry(id: string) {
    const path = `/menu/entries/${encodeURIComponent(id)}`;
    const response = await client.get<{ data: { status: EntryStatus } }>(path);
    const etag = response.headers.etag as string | undefined;
    if (!etag) throw new Error("No se recibió la versión de la entrada. Recarga e inténtalo de nuevo.");
    return { path, status: response.data.data.status, etag };
  }

  return {
    async listEntries(query: EntryQuery, signal?: AbortSignal): Promise<Page<MenuEntry>> {
      const response = await client.get<Page<MenuEntry>>("/menu/entries", {
        params: {
          ...(query.q ? { q: query.q } : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.status ? { status: query.status } : {}),
          page: query.page,
          pageSize: query.pageSize,
        },
        signal,
      });
      return response.data;
    },

    async listCategories(signal?: AbortSignal): Promise<MenuCategory[]> {
      const getPage = (page: number) => client.get<{
        items?: MenuCategory[];
        pagination?: { totalPages: number };
        data?: MenuCategory[];
        meta?: { totalPages: number };
      }>(`/menus/${encodeURIComponent(menuId)}/categories`, {
        params: { page, pageSize: 100 },
        signal,
      });
      const firstPage = await getPage(1);
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, (firstPage.data.pagination?.totalPages ?? firstPage.data.meta?.totalPages ?? 1) - 1) }, (_, index) => getPage(index + 2)),
      );
      return [firstPage, ...remainingPages].flatMap((response) => {
        const categories = response.data.items ?? response.data.data ?? [];
        return categories;
      });
    },

    async createCategory(draft: CategoryDraft): Promise<MenuCategory> {
      const response = await client.post<MenuCategory>(`/menus/${encodeURIComponent(menuId)}/categories`, draft);
      return unwrap(response.data);
    },

    async updateCategory(id: string, draft: CategoryDraft): Promise<MenuCategory> {
      const response = await client.patch<MenuCategory>(`/menus/${encodeURIComponent(menuId)}/categories/${encodeURIComponent(id)}`, draft);
      return unwrap(response.data);
    },

    async setEntryStatus(id: string, status: EntryStatus): Promise<void> {
      // The backend does not yet verify a valid active offer, so activation must wait.
      if (status === "ACTIVE") throw new Error("La activación estará disponible cuando el servidor valide las ofertas activas.");
      const current = await currentEntry(id);
      if (current.status === status) return;
      await client.patch(current.path, { status }, { headers: { "If-Match": current.etag } });
    },

    async deleteArchivedEntry(id: string): Promise<void> {
      const current = await currentEntry(id);
      if (current.status !== "ARCHIVED") throw new Error("Solo se puede eliminar una entrada archivada.");
      await client.delete(current.path, { headers: { "If-Match": current.etag } });
    },

    async getEntry(id: string, signal?: AbortSignal): Promise<MenuEntryDetail> {
      const response = await client.get<MenuEntryDetail>(entryPath(menuId, id), { signal });
      return unwrap(response.data);
    },

    async createEntry(draft: EntryCreateDraft, image: File): Promise<MenuEntryDetail> {
      const response = await client.post<MenuEntryDetail>(entryPath(menuId), entryMultipart(draft, image));
      return unwrap(response.data);
    },

    async updateEntry(id: string, draft: EntryUpdateDraft, image?: File): Promise<MenuEntryDetail> {
      const body = image ? entryMultipart(draft, image) : draft;
      const response = await client.patch<MenuEntryDetail>(entryPath(menuId, id), body);
      return unwrap(response.data);
    },
  };
}
