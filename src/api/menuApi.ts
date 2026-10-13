import type { AxiosInstance } from "axios";
import type { CategoryDraft, EntryCreateDraft, EntryQuery, EntryStatus, EntryUpdateDraft, MenuCategory, MenuEntry, MenuEntryDetail, MenuOffer, MenuRepository, OfferStatus, Page } from "../application/catalog";
import { categoryPage, entryPage } from "./catalogResponse";

function entryPath(entryId?: string) {
  const base = "/menu/entries";
  return entryId ? `${base}/${encodeURIComponent(entryId)}` : base;
}

function imageMultipart(image: File) {
  const form = new FormData();
  form.append("file", image);
  return form;
}

export function createMenuApi(client: AxiosInstance): MenuRepository {
  async function categoryPages(getPage: (page: number) => Promise<Page<MenuCategory>>, from: number, to: number): Promise<MenuCategory[]> {
    if (from > to) return [];
    const batch = await Promise.all(Array.from({ length: Math.min(4, to - from + 1) }, (_, index) => getPage(from + index)));
    const rest = await categoryPages(getPage, from + batch.length, to);
    return [...batch.flatMap((result) => result.data), ...rest];
  }
  async function uploadImage(image: File): Promise<string> {
    const response = await client.post<{ data: { id: string } }>("/media/images", imageMultipart(image));
    const id = response.data?.data?.id;
    if (typeof id !== "string" || !id) throw new Error("No se recibió el identificador de la imagen. La entrada no se guardó.");
    return id;
  }

  async function currentEntry(id: string) {
    const path = entryPath(id);
    const response = await client.get<{ data: { status: EntryStatus } }>(path);
    const etag = response.headers.etag as string | undefined;
    if (!etag || etag.startsWith("W/")) throw new Error("No se recibió una versión fuerte de la entrada. Recarga e inténtalo de nuevo.");
    const status = response.data?.data?.status;
    if (status !== "ACTIVE" && status !== "INACTIVE" && status !== "ARCHIVED") throw new Error("Respuesta de entrada inválida.");
    return { path, status, etag };
  }

  async function currentOffer(id: string) {
    const path = `/menu/offers/${encodeURIComponent(id)}`;
    const response = await client.get<{ data: { status: OfferStatus } }>(path);
    const etag = response.headers.etag as string | undefined;
    if (!etag || etag.startsWith("W/")) throw new Error("No se recibió una versión fuerte de la oferta. Recarga e inténtalo de nuevo.");
    const status = response.data?.data?.status;
    if (status !== "ACTIVE" && status !== "INACTIVE" && status !== "ARCHIVED") throw new Error("Respuesta de oferta inválida.");
    return { path, status, etag };
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
      return entryPage(response.data);
    },

    async listCategories(signal?: AbortSignal): Promise<MenuCategory[]> {
      const getPage = async (page: number) => {
        const response = await client.get<unknown>("/menu/categories", { params: { page, pageSize: 100 }, signal });
        return categoryPage(response.data);
      };
      const firstPage = await getPage(1);
      const rest = await categoryPages(getPage, 2, firstPage.meta.totalPages);
      return [...firstPage.data, ...rest];
    },

    async createCategory(draft: CategoryDraft): Promise<MenuCategory> {
      const response = await client.post<{ data: MenuCategory }>("/menu/categories", draft);
      return response.data.data;
    },

    async updateCategory(id: string, draft: CategoryDraft): Promise<MenuCategory> {
      const path = `/menu/categories/${encodeURIComponent(id)}`;
      const current = await client.get(path);
      const etag = current.headers.etag as string | undefined;
      if (!etag) throw new Error("No se recibió la versión de la categoría. Recarga e inténtalo de nuevo.");
      const response = await client.patch<{ data: MenuCategory }>(path, draft, { headers: { "If-Match": etag } });
      return response.data.data;
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
      const response = await client.get<{ data: MenuEntryDetail }>(entryPath(id), { signal });
      return response.data.data;
    },

    async createEntry(draft: EntryCreateDraft, image: File): Promise<MenuEntryDetail> {
      const imageId = await uploadImage(image);
      const response = await client.post<{ data: MenuEntryDetail }>(entryPath(), { ...draft, imageId });
      return response.data.data;
    },

    async updateEntry(id: string, draft: EntryUpdateDraft, image?: File): Promise<MenuEntryDetail> {
      const imageId = image ? await uploadImage(image) : undefined;
      const current = await currentEntry(id);
      const body = imageId ? { ...draft, imageId } : draft;
      const response = await client.patch<{ data: MenuEntryDetail }>(current.path, body, { headers: { "If-Match": current.etag } });
      return response.data.data;
    },

    async listOffers(entryId: string, page: number, pageSize: number, signal?: AbortSignal): Promise<Page<MenuOffer>> {
      const response = await client.get<Page<MenuOffer>>("/menu/offers", {
        params: { entryId, page, pageSize },
        signal,
      });
      return response.data;
    },

    async setOfferStatus(id: string, status: OfferStatus): Promise<void> {
      const current = await currentOffer(id);
      if (current.status === status) return;
      await client.patch(current.path, { status }, { headers: { "If-Match": current.etag } });
    },

    async deleteInactiveOffer(id: string): Promise<void> {
      const current = await currentOffer(id);
      if (current.status !== "INACTIVE") throw new Error("Solo se puede eliminar una oferta inactiva.");
      await client.delete(current.path, { headers: { "If-Match": current.etag } });
    },
  };
}
