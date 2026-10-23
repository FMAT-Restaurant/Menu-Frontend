import type { AxiosInstance } from "axios";
import type {
  CategoryDraft,
  EntryCreateRequest,
  EntryQuery,
  EntryStatus,
  EntryUpdateDraft,
  InventoryItem,
  InventoryQuery,
  MenuCategory,
  MenuEntry,
  MenuEntryDetail,
  MenuOffer,
  MenuOfferDetail,
  MenuRepository,
  OfferCreateDraft,
  OfferStatusDraft,
  OfferUpdateDraft,
  Page,
  RecipeDetail,
  RecipeDraft,
  RecipeQuery,
  RecipeSummary,
  VersionedResource,
} from "../application/catalog";
import {
  categoryPage,
  categoryResponse,
  entryDetailResponse,
  entryPage,
  inventoryPage,
  offerDetailResponse,
  offerPage,
  recipeDetailResponse,
  recipePage,
  uploadedImageResponse,
} from "./catalogResponse";
import { validateWriteSuccessResponse } from "./idempotencyResponse";
import { assertStrongEtag, isStrongEtag } from "../application/entryVersion";
import {
  assertValidIdempotencyKey,
  buildFormDataFromSealedFile,
  type SealedOperationAttempt,
} from "../application/operationAttempt";

export const READ_REQUEST_TIMEOUT_MS = 12000;
export const WRITE_REQUEST_TIMEOUT_MS = 20000;
export const IMAGE_UPLOAD_TIMEOUT_MS = 120000;
export const MAX_CATEGORY_PAGE_BATCH_SIZE = 4;

export interface IdempotentWriteCallOptions {
  readonly idempotencyKey?: string;
  readonly stage1IdempotencyKey?: string;
  readonly confirmedImageId?: string;
  readonly ifMatch?: string;
  readonly signal?: AbortSignal;
}

function sanitizeIdentifier(id: string): string {
  const cleanId = id.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    throw new Error("Identificador inválido.");
  }
  return encodeURIComponent(cleanId);
}

function recipePath(recipeId: string): string {
  return `/menu/recipes/${sanitizeIdentifier(recipeId)}`;
}

function entryPath(entryId?: string): string {
  const base = "/menu/entries";
  return entryId ? `${base}/${encodeURIComponent(entryId)}` : base;
}

function categoryPath(categoryId?: string): string {
  const base = "/menu/categories";
  return categoryId ? `${base}/${encodeURIComponent(categoryId)}` : base;
}

function sanitizeCategoryPayload(value: unknown): MenuCategory {
  const raw = categoryResponse(value);
  return {
    id: raw.id,
    name: raw.name,
    ...(raw.description !== undefined ? { description: raw.description } : {}),
    ...(raw.entryCount !== undefined ? { entryCount: raw.entryCount } : {}),
  };
}

function extractHeaderEtag(headers: unknown): string | undefined {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }
  const record = headers as Record<string, unknown>;
  if (typeof record.etag === "string") {
    return record.etag;
  }
  if (typeof record.ETag === "string") {
    return record.ETag;
  }
  return undefined;
}

function imageMultipart(image: File): FormData {
  const form = new FormData();
  form.append("file", image);
  return form;
}

function withWriteVersion<T extends object>(data: T, headers: unknown): T & { etag?: string } {
  const etag = extractHeaderEtag(headers);
  return isStrongEtag(etag) ? { ...data, etag } : data;
}

export async function collectCategoryPages(
  getPage: (page: number) => Promise<Page<MenuCategory>>,
  fromPage: number,
  totalPages: number,
  signal?: AbortSignal,
): Promise<MenuCategory[]> {
  if (fromPage > totalPages) {
    return [];
  }
  const collected: MenuCategory[] = [];
  for (
    let batchStart = fromPage;
    batchStart <= totalPages;
    batchStart += MAX_CATEGORY_PAGE_BATCH_SIZE
  ) {
    if (signal?.aborted) {
      break;
    }
    const batchCount = Math.min(
      MAX_CATEGORY_PAGE_BATCH_SIZE,
      totalPages - batchStart + 1,
    );
    const pageNumbers = Array.from(
      { length: batchCount },
      (_, offset) => batchStart + offset,
    );
    const batchResults = await Promise.all(
      pageNumbers.map((pageNumber) => getPage(pageNumber)),
    );
    for (const pageResult of batchResults) {
      collected.push(...pageResult.data);
    }
  }
  return collected;
}

export async function executeSealedAttemptWithClient(
  client: AxiosInstance,
  attempt: SealedOperationAttempt,
  signal?: AbortSignal,
): Promise<{ data: unknown; status: number; etag?: string }> {
  const idempotencyKey = assertValidIdempotencyKey(attempt.idempotencyKey);

  if (attempt.payload.kind === "multipart-file") {
    const formData = buildFormDataFromSealedFile(attempt.payload);
    const response = await client.post<unknown>(attempt.endpointPath, formData, {
      headers: { "Idempotency-Key": idempotencyKey },
      timeout: IMAGE_UPLOAD_TIMEOUT_MS,
      ...(signal ? { signal } : {}),
    });
    const etag =
      typeof response.headers?.etag === "string" ? response.headers.etag : undefined;
    return { data: response.data, status: response.status, etag };
  }

  const headers: Record<string, string> = {
    "Idempotency-Key": idempotencyKey,
    ...(attempt.payload.ifMatch ? { "If-Match": attempt.payload.ifMatch } : {}),
  };

  if (attempt.method === "PATCH") {
    const response = await client.patch<unknown>(
      attempt.endpointPath,
      attempt.payload.payloadSnapshot,
      {
        headers,
        timeout: WRITE_REQUEST_TIMEOUT_MS,
        ...(signal ? { signal } : {}),
      },
    );
    const etag =
      typeof response.headers?.etag === "string" ? response.headers.etag : undefined;
    return { data: response.data, status: response.status, etag };
  }

  const response = await client.post<unknown>(
    attempt.endpointPath,
    attempt.payload.payloadSnapshot,
    {
      headers,
      timeout: WRITE_REQUEST_TIMEOUT_MS,
      ...(signal ? { signal } : {}),
    },
  );
  const etag =
    typeof response.headers?.etag === "string" ? response.headers.etag : undefined;
  return { data: response.data, status: response.status, etag };
}

export function createMenuApi(
  client: AxiosInstance,
  inventoryClient: AxiosInstance = client,
): MenuRepository {
  async function uploadImage(
    image: File,
    idempotencyKey: string,
    options?: { signal?: AbortSignal },
  ): Promise<string> {
    const validatedKey = assertValidIdempotencyKey(idempotencyKey);
    const response = await client.post<unknown>(
      "/media/images",
      imageMultipart(image),
      {
        headers: { "Idempotency-Key": validatedKey },
        timeout: IMAGE_UPLOAD_TIMEOUT_MS,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    const uploaded = validateWriteSuccessResponse(
      response.data,
      uploadedImageResponse,
      response.status,
    );
    return uploaded.id;
  }

  async function currentEntry(id: string) {
    const path = entryPath(id);
    const response = await client.get<unknown>(path, {
      timeout: READ_REQUEST_TIMEOUT_MS,
    });
    const etag = assertStrongEtag(
      response.headers?.etag,
      "No se recibió una versión fuerte de la entrada. Recarga e inténtalo de nuevo.",
    );
    const detail = entryDetailResponse(response.data, etag);
    return { path, status: detail.status, data: detail, etag };
  }

  async function currentOffer(id: string) {
    const path = `/menu/offers/${encodeURIComponent(id)}`;
    const response = await client.get<unknown>(path, {
      timeout: READ_REQUEST_TIMEOUT_MS,
    });
    const etag = assertStrongEtag(
      response.headers?.etag,
      "No se recibió una versión fuerte de la oferta. Recarga e inténtalo de nuevo.",
    );
    const detail = offerDetailResponse(response.data);
    return { path, status: detail.status, data: detail, etag };
  }

  async function currentRecipe(id: string) {
    const path = recipePath(id);
    const response = await client.get<unknown>(path, {
      timeout: READ_REQUEST_TIMEOUT_MS,
    });
    const etag = assertStrongEtag(
      response.headers?.etag,
      "No se recibió la versión de la receta (se requiere una versión fuerte). Recarga e inténtalo de nuevo.",
    );
    const detail = recipeDetailResponse(response.data);
    return { path, data: detail, etag };
  }

  return {
    async listEntries(
      query: EntryQuery,
      signal?: AbortSignal,
    ): Promise<Page<MenuEntry>> {
      const response = await client.get<unknown>("/menu/entries", {
        params: {
          ...(query.q ? { q: query.q } : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.status ? { status: query.status } : {}),
          page: query.page,
          pageSize: query.pageSize,
        },
        signal,
        timeout: READ_REQUEST_TIMEOUT_MS,
      });
      return entryPage(response.data);
    },

    async listCategories(signal?: AbortSignal): Promise<MenuCategory[]> {
      const getPage = async (page: number) => {
        const response = await client.get<unknown>("/menu/categories", {
          params: { page, pageSize: 100 },
          signal,
          timeout: READ_REQUEST_TIMEOUT_MS,
        });
        return categoryPage(response.data);
      };
      const firstPage = await getPage(1);
      const rest = await collectCategoryPages(
        getPage,
        2,
        firstPage.meta.totalPages,
        signal,
      );
      return [...firstPage.data, ...rest];
    },

    async getCategory(
      id: string,
      signal?: AbortSignal,
    ): Promise<VersionedResource<MenuCategory>> {
      const response = await client.get<unknown>(categoryPath(id), {
        signal,
        timeout: READ_REQUEST_TIMEOUT_MS,
      });
      const data = sanitizeCategoryPayload(response.data);
      const etag = extractHeaderEtag(response.headers);
      return Object.freeze({
        data,
        ...(etag !== undefined ? { etag } : {}),
      });
    },

    async createCategory(
      draft: CategoryDraft,
      idempotencyKey: string,
    ): Promise<MenuCategory> {
      const validatedKey = assertValidIdempotencyKey(idempotencyKey);
      const response = await client.post<unknown>(categoryPath(), draft, {
        headers: { "Idempotency-Key": validatedKey },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
      return validateWriteSuccessResponse(
        response.data,
        sanitizeCategoryPayload,
        response.status,
      );
    },

    async updateCategory(
      id: string,
      draft: CategoryDraft,
      etag: string,
    ): Promise<MenuCategory> {
      const strongEtag = assertStrongEtag(
        etag,
        "No se recibió la versión de la categoría (se requiere una versión fuerte). Revisa los datos actuales antes de guardar.",
      );
      const response = await client.patch<unknown>(categoryPath(id), draft, {
        headers: { "If-Match": strongEtag },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
      return validateWriteSuccessResponse(
        response.data,
        sanitizeCategoryPayload,
        response.status,
      );
    },

    async setEntryStatus(id: string, status: EntryStatus): Promise<void> {
      const current = await currentEntry(id);
      if (current.status === status) return;
      const response = await client.patch<unknown>(
        current.path,
        { status },
        {
          headers: { "If-Match": current.etag },
          timeout: WRITE_REQUEST_TIMEOUT_MS,
        },
      );
      if (response?.data !== undefined) {
        validateWriteSuccessResponse(
          response.data,
          (raw) => entryDetailResponse(raw),
          response.status,
        );
      }
    },

    async deleteArchivedEntry(id: string): Promise<void> {
      const current = await currentEntry(id);
      if (current.status !== "ARCHIVED") {
        throw new Error("Solo se puede eliminar una entrada archivada.");
      }
      await client.delete(current.path, {
        headers: { "If-Match": current.etag },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
    },

    async getEntry(
      id: string,
      signal?: AbortSignal,
    ): Promise<MenuEntryDetail> {
      const response = await client.get<unknown>(entryPath(id), {
        signal,
        timeout: READ_REQUEST_TIMEOUT_MS,
      });
      return entryDetailResponse(response.data, response.headers?.etag);
    },

    uploadImage,
    uploadEntryImage: uploadImage,

    async createEntry(
      draft: EntryCreateRequest,
      idempotencyKey: string,
      options?: { signal?: AbortSignal },
    ): Promise<MenuEntryDetail> {
      const validatedKey = assertValidIdempotencyKey(idempotencyKey);
      const response = await client.post<unknown>(entryPath(), draft, {
        headers: { "Idempotency-Key": validatedKey },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
        ...(options?.signal ? { signal: options.signal } : {}),
      });
      return validateWriteSuccessResponse(
        response.data,
        (raw) => withWriteVersion(entryDetailResponse(raw), response.headers),
        response.status,
      );
    },

    async updateEntry(
      id: string,
      draft: EntryUpdateDraft,
      etag: string,
    ): Promise<MenuEntryDetail> {
      const strongEtag = assertStrongEtag(
        etag,
        "No se recibió una versión fuerte de la entrada. Revisa los datos actuales antes de guardar.",
      );
      const response = await client.patch<unknown>(entryPath(id), draft, {
        headers: { "If-Match": strongEtag },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
      return validateWriteSuccessResponse(
        response.data,
        (raw) => entryDetailResponse(raw),
        response.status,
      );
    },

    async listOffers(
      entryId: string,
      page: number,
      pageSize: number,
      signal?: AbortSignal,
    ): Promise<Page<MenuOffer>> {
      const response = await client.get<unknown>("/menu/offers", {
        params: { entryId, page, pageSize },
        signal,
        timeout: READ_REQUEST_TIMEOUT_MS,
      });
      return offerPage(response.data);
    },

    async getOffer(
      id: string,
      signal?: AbortSignal,
    ): Promise<VersionedResource<MenuOfferDetail>> {
      const response = await client.get<unknown>(
        `/menu/offers/${encodeURIComponent(id)}`,
        {
          signal,
          timeout: READ_REQUEST_TIMEOUT_MS,
        },
      );
      const etag = assertStrongEtag(
        extractHeaderEtag(response.headers),
        "No se recibió una versión fuerte de la oferta.",
      );
      return {
        data: offerDetailResponse(response.data),
        etag,
      };
    },

    async createOffer(
      entryId: string,
      draft: OfferCreateDraft,
      imageId: string,
      idempotencyKey: string,
      options?: { signal?: AbortSignal },
    ): Promise<MenuOfferDetail> {
      const validatedKey = assertValidIdempotencyKey(idempotencyKey);
      const response = await client.post<unknown>(
        `/menu/entries/${encodeURIComponent(entryId)}/offers`,
        { ...draft, imageId },
        {
          headers: { "Idempotency-Key": validatedKey },
          timeout: WRITE_REQUEST_TIMEOUT_MS,
          ...(options?.signal ? { signal: options.signal } : {}),
        },
      );
      return validateWriteSuccessResponse(
        response.data,
        (raw) => withWriteVersion(offerDetailResponse(raw), response.headers),
        response.status,
      );
    },

    async updateOffer(
      id: string,
      draft: OfferUpdateDraft,
      etag: string,
      idempotencyKey: string,
      imageId?: string,
      options?: { signal?: AbortSignal },
    ): Promise<MenuOfferDetail> {
      const path = `/menu/offers/${encodeURIComponent(id)}`;
      const validatedEtag = assertStrongEtag(
        etag,
        "No se recibió una versión fuerte de la oferta. Recarga e inténtalo de nuevo.",
      );
      const validatedKey = assertValidIdempotencyKey(idempotencyKey);
      const body = imageId ? { ...draft, imageId } : draft;
      const response = await client.patch<unknown>(path, body, {
        headers: {
          "If-Match": validatedEtag,
          "Idempotency-Key": validatedKey,
        },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
        ...(options?.signal ? { signal: options.signal } : {}),
      });
      return validateWriteSuccessResponse(
        response.data,
        (raw) => withWriteVersion(offerDetailResponse(raw), response.headers),
        response.status,
      );
    },

    async setOfferStatus(
      id: string,
      draft: OfferStatusDraft,
      etag: string,
      idempotencyKey: string,
      options?: { signal?: AbortSignal },
    ): Promise<MenuOfferDetail> {
      const path = `/menu/offers/${encodeURIComponent(id)}`;
      const validatedEtag = assertStrongEtag(
        etag,
        "No se recibió una versión fuerte de la oferta.",
      );
      const validatedKey = assertValidIdempotencyKey(idempotencyKey);
      const response = await client.patch<unknown>(
        path,
        { presentationTag: draft.presentationTag, status: draft.status },
        {
          headers: {
            "If-Match": validatedEtag,
            "Idempotency-Key": validatedKey,
          },
          timeout: WRITE_REQUEST_TIMEOUT_MS,
          ...(options?.signal ? { signal: options.signal } : {}),
        },
      );
      return validateWriteSuccessResponse(
        response.data,
        offerDetailResponse,
        response.status,
      );
    },

    async deleteInactiveOffer(id: string): Promise<void> {
      const current = await currentOffer(id);
      if (current.status !== "INACTIVE") {
        throw new Error("Solo se puede eliminar una oferta inactiva.");
      }
      await client.delete(current.path, {
        headers: { "If-Match": current.etag },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
    },

    async listRecipes(
      query: RecipeQuery,
      signal?: AbortSignal,
    ): Promise<Page<RecipeSummary>> {
      const response = await client.get<unknown>("/menu/recipes", {
        params: {
          ...(query.q ? { q: query.q } : {}),
          page: query.page,
          pageSize: query.pageSize,
        },
        signal,
        timeout: READ_REQUEST_TIMEOUT_MS,
      });
      return recipePage(response.data);
    },

    async getRecipe(
      id: string,
      signal?: AbortSignal,
    ): Promise<VersionedResource<RecipeDetail>> {
      const response = await client.get<unknown>(recipePath(id), {
        signal,
        timeout: READ_REQUEST_TIMEOUT_MS,
      });
      const data = recipeDetailResponse(response.data);
      const etag = extractHeaderEtag(response.headers);
      return Object.freeze({
        data,
        ...(etag !== undefined ? { etag } : {}),
      });
    },

    async createRecipe(
      draft: RecipeDraft,
      idempotencyKey: string,
    ): Promise<RecipeDetail> {
      const validatedKey = assertValidIdempotencyKey(idempotencyKey);
      const response = await client.post<unknown>("/menu/recipes", draft, {
        headers: { "Idempotency-Key": validatedKey },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
      return validateWriteSuccessResponse(
        response.data,
        (raw) => withWriteVersion(recipeDetailResponse(raw), response.headers),
        response.status,
      );
    },

    async updateRecipe(
      id: string,
      draft: RecipeDraft,
      etag: string,
    ): Promise<RecipeDetail> {
      const strongEtag = assertStrongEtag(
        etag,
        "No se recibió la versión de la receta (se requiere una versión fuerte). Revisa los datos actuales antes de guardar.",
      );
      const response = await client.patch<unknown>(recipePath(id), draft, {
        headers: { "If-Match": strongEtag },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
      return validateWriteSuccessResponse(
        response.data,
        recipeDetailResponse,
        response.status,
      );
    },

    async deleteRecipe(id: string): Promise<void> {
      const current = await currentRecipe(id);
      await client.delete(current.path, {
        headers: { "If-Match": current.etag },
        timeout: WRITE_REQUEST_TIMEOUT_MS,
      });
    },

    async listInventoryItems(
      query?: InventoryQuery,
      signal?: AbortSignal,
    ): Promise<Page<InventoryItem>> {
      const response = await inventoryClient.get<unknown>("/inventory/items", {
        params: {
          ...(query?.q ? { q: query.q } : {}),
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 50,
        },
        signal,
        timeout: READ_REQUEST_TIMEOUT_MS,
      });
      return inventoryPage(response.data);
    },
  };
}
