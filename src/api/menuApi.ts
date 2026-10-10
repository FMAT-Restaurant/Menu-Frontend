import type { AxiosInstance } from "axios";
import type { EntryQuery, EntryStatus, MenuCategory, MenuEntry, MenuRepository, Page } from "../application/catalog";

export function createMenuApi(client: AxiosInstance): MenuRepository {
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
      const categories: MenuCategory[] = [];
      let page = 1;
      let totalPages: number;
      do {
        const response = await client.get<Page<MenuCategory>>("/menu/categories", {
          params: { page, pageSize: 100 },
          signal,
        });
        categories.push(...response.data.data);
        totalPages = response.data.meta.totalPages;
        page += 1;
      } while (page <= totalPages);
      return categories;
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
  };
}
