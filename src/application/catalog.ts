export type EntryStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type VersionedResource<T> = Readonly<{
  data: T;
  etag?: string;
}>;

export interface MenuCategoryReference {
  id: string;
  name: string;
}

export interface CatalogImage {
  id: string;
  url: string;
  thumbnailUrl: string;
}

export interface MenuEntry {
  id: string;
  brandName: string;
  description: string;
  status: EntryStatus;
  image: CatalogImage | null;
  categories: MenuCategoryReference[];
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
  etag?: string;
}

export type OfferStatus = "ACTIVE" | "INACTIVE";

export interface MenuOffer {
  id: string;
  entryId: string;
  entryName: string;
  presentationTag?: string | null;
  basePrice: number;
  status: OfferStatus;
  image: MenuImage | null;
  slotCount: number;
}

export type OfferCourse = "entrada" | "plato fuerte" | "postre" | "bebida";

export interface RecipeSlotOptionInput {
  sourceType: "RECIPE";
  recipeId: string;
  recipeRevision?: number;
  displayName: string;
}

export interface InventoryItemSlotOptionInput {
  sourceType: "INVENTORY_ITEM";
  inventoryItemId: string;
  quantity: number;
  unit: string;
  displayName: string;
}

export type SlotOptionInput = RecipeSlotOptionInput | InventoryItemSlotOptionInput;

export interface SlotOptionDetail {
  optionId: string;
  displayName: string;
  status: OfferStatus;
  sourceType: "RECIPE" | "INVENTORY_ITEM";
  recipeId?: string;
  recipeRevision?: number;
  inventoryItemId?: string;
  quantity?: number;
  unit?: string;
}

export interface CompositionSlotInput {
  name: string;
  quantity: number;
  course?: OfferCourse | null;
  options: SlotOptionInput[];
}

export interface CompositionSlotDetail {
  slotId: string;
  name: string;
  status?: OfferStatus;
  quantity: number;
  course?: OfferCourse | null;
  options: SlotOptionDetail[];
}

export interface CompositionDetail {
  slots: CompositionSlotDetail[];
}

export interface MenuOfferDetail {
  id: string;
  entryId: string;
  presentationTag: string;
  basePrice: number;
  status: OfferStatus;
  image: MenuImage | null;
  composition: CompositionDetail;
}

export interface OfferCreateDraft {
  presentationTag: string;
  basePrice: number;
  composition: {
    slots: CompositionSlotInput[];
  };
}

export interface OfferUpdateDraft {
  presentationTag: string;
  basePrice?: number;
  status?: OfferStatus;
  composition?: {
    slots: Array<{
      slotId?: string;
      name?: string;
      quantity?: number;
      course?: OfferCourse | null;
      options?: Array<{
        optionId?: string;
        displayName?: string;
        status?: OfferStatus;
        sourceType: "RECIPE" | "INVENTORY_ITEM";
        recipeId?: string;
        recipeRevision?: number;
        inventoryItemId?: string;
        quantity?: number;
        unit?: string;
      }>;
    }>;
  };
}

export interface EntryCreateDraft {
  brandName: string;
  description: string;
  categoryIds: string[];
}

export interface EntryUpdateDraft extends EntryCreateDraft {
  status: EntryStatus;
  imageId?: string;
}

export interface EntryCreateRequest extends EntryCreateDraft {
  imageId: string;
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

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
}

export interface RecipeSupply {
  inventoryItemId: string;
  quantity: number;
  inventoryItem?: InventoryItem;
}

export interface RecipeSummary {
  id: string;
  name: string;
  description: string;
  supplies: RecipeSupply[];
}

export interface RecipeDetail extends RecipeSummary {
  instructions: string;
}

export interface RecipeSupplyInput {
  inventoryItemId: string;
  quantity: number;
}

export interface RecipeDraft {
  name: string;
  description: string;
  instructions: string;
  supplies: RecipeSupplyInput[];
}

export interface RecipeQuery {
  q?: string;
  page: number;
  pageSize: number;
}

export interface InventoryQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface MenuRepository {
  listEntries(query: EntryQuery, signal?: AbortSignal): Promise<Page<MenuEntry>>;
  listCategories(signal?: AbortSignal): Promise<MenuCategory[]>;
  getCategory(id: string, signal?: AbortSignal): Promise<VersionedResource<MenuCategory>>;
  createCategory(draft: CategoryDraft, idempotencyKey: string): Promise<MenuCategory>;
  updateCategory(id: string, draft: CategoryDraft, etag: string): Promise<MenuCategory>;
  setEntryStatus(id: string, status: EntryStatus): Promise<void>;
  deleteArchivedEntry(id: string): Promise<void>;
  getEntry(id: string, signal?: AbortSignal): Promise<MenuEntryDetail>;
  uploadEntryImage(image: File): Promise<string>;
  createEntry(draft: EntryCreateRequest): Promise<MenuEntryDetail>;
  updateEntry(id: string, draft: EntryUpdateDraft, etag: string): Promise<MenuEntryDetail>;
  listOffers(entryId: string, page: number, pageSize: number, signal?: AbortSignal): Promise<Page<MenuOffer>>;
  getOffer(id: string, signal?: AbortSignal): Promise<MenuOfferDetail>;
  createOffer(entryId: string, draft: OfferCreateDraft, image: File): Promise<MenuOfferDetail>;
  updateOffer(id: string, draft: OfferUpdateDraft, image?: File): Promise<MenuOfferDetail>;
  setOfferStatus(id: string, status: OfferStatus): Promise<void>;
  deleteInactiveOffer(id: string): Promise<void>;
  listRecipes(query: RecipeQuery, signal?: AbortSignal): Promise<Page<RecipeSummary>>;
  getRecipe(id: string, signal?: AbortSignal): Promise<VersionedResource<RecipeDetail>>;
  createRecipe(draft: RecipeDraft, idempotencyKey: string): Promise<RecipeDetail>;
  updateRecipe(id: string, draft: RecipeDraft, etag: string): Promise<RecipeDetail>;
  deleteRecipe(id: string): Promise<void>;
  listInventoryItems(query?: InventoryQuery, signal?: AbortSignal): Promise<Page<InventoryItem>>;
}
