import type { OfferStatus, SlotOptionInput, SlotOptionUpdate } from "../../application/catalog";

/** Editable and persisted state may be incomplete; it is never a request payload. */
export interface OptionDraft {
  localId?: string;
  optionId?: string;
  originalSourceType?: "RECIPE" | "INVENTORY_ITEM";
  displayName: string;
  status: OfferStatus;
  sourceType: "RECIPE" | "INVENTORY_ITEM" | null;
  recipeId?: string;
  recipeName?: string;
  hasRecipeAssignmentIntent?: boolean;
  recipeAssignmentToken?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  quantity?: number;
  unit?: string;
}

type OptionIdentity = Pick<OptionDraft, "localId" | "optionId" | "originalSourceType">;
type RecipeMetadata = Pick<OptionDraft, "recipeName" | "hasRecipeAssignmentIntent" | "recipeAssignmentToken">;
export type ValidatedOptionDraft = OptionIdentity & { displayName: string; status: OfferStatus } & (
  | ({ sourceType: "RECIPE"; recipeId: string; inventoryItemId?: never; quantity?: never; unit?: never } & RecipeMetadata)
  | ({ sourceType: "RECIPE"; optionId: string; recipeId?: string; inventoryItemId?: never; quantity?: never; unit?: never } & RecipeMetadata)
  | { sourceType: "INVENTORY_ITEM"; inventoryItemId: string; inventoryItemName?: string; quantity: number; unit: string; recipeId?: never }
  | { sourceType: "INVENTORY_ITEM"; optionId: string; inventoryItemId?: string; inventoryItemName?: string; quantity?: number; unit?: string; recipeId?: never }
);

type Validation = { valid: true; value: ValidatedOptionDraft } | { valid: false; message: string };
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function validateOptionDraft(draft: OptionDraft, mode: "create" | "update"): Validation {
  if (draft.sourceType !== "RECIPE" && draft.sourceType !== "INVENTORY_ITEM") {
    return { valid: false, message: "Debes seleccionar un origen de contenido (receta o artículo de inventario)." };
  }
  if (draft.optionId !== undefined && !hasText(draft.optionId)) {
    return { valid: false, message: "La identidad de la opción existente no es válida." };
  }
  const common = {
    localId: draft.localId, optionId: draft.optionId, originalSourceType: draft.originalSourceType,
    displayName: draft.displayName.trim(), status: mode === "create" ? "ACTIVE" as const : draft.status,
  };
  if (common.status !== "ACTIVE" && common.status !== "INACTIVE") {
    return { valid: false, message: "El estado de la opción no es válido." };
  }
  if (draft.sourceType === "RECIPE") {
    if (draft.inventoryItemId !== undefined || draft.quantity !== undefined || draft.unit !== undefined) {
      return { valid: false, message: "La opción de receta no puede incluir campos de inventario." };
    }
    const metadata = { recipeName: draft.recipeName, hasRecipeAssignmentIntent: draft.hasRecipeAssignmentIntent,
      recipeAssignmentToken: draft.recipeAssignmentToken };
    if (hasText(draft.recipeId)) {
      return { valid: true, value: { ...common, ...metadata, sourceType: "RECIPE", recipeId: draft.recipeId } };
    }
    if (mode === "update" && hasText(draft.optionId) && !draft.hasRecipeAssignmentIntent &&
      draft.originalSourceType !== "INVENTORY_ITEM" && draft.recipeId === undefined) {
      return { valid: true, value: { ...common, ...metadata, optionId: draft.optionId, sourceType: "RECIPE" } };
    }
    return { valid: false, message: "Debes elegir una receta de la biblioteca." };
  }
  if (draft.recipeId !== undefined || draft.hasRecipeAssignmentIntent || draft.recipeAssignmentToken !== undefined) {
    return { valid: false, message: "La opción de inventario no puede incluir campos de receta." };
  }
  if (mode === "update" && hasText(draft.optionId) && draft.originalSourceType !== "RECIPE") {
    if ((draft.inventoryItemId !== undefined && !hasText(draft.inventoryItemId)) ||
      (draft.quantity !== undefined && (typeof draft.quantity !== "number" || !Number.isFinite(draft.quantity) || draft.quantity <= 0))) {
      return { valid: false, message: "El artículo de inventario requiere una cantidad positiva." };
    }
    if (draft.unit !== undefined && !hasText(draft.unit)) {
      return { valid: false, message: "El artículo de inventario requiere una unidad autoritativa." };
    }
    return { valid: true, value: { ...common, optionId: draft.optionId, sourceType: "INVENTORY_ITEM",
      inventoryItemId: draft.inventoryItemId, inventoryItemName: draft.inventoryItemName, quantity: draft.quantity, unit: draft.unit?.trim() } };
  }
  if (!hasText(draft.inventoryItemId) || typeof draft.quantity !== "number" ||
    !Number.isFinite(draft.quantity) || draft.quantity <= 0) {
    return { valid: false, message: "El artículo de inventario requiere una cantidad positiva." };
  }
  if (!hasText(draft.unit)) {
    return { valid: false, message: "El artículo de inventario requiere una unidad autoritativa." };
  }
  return { valid: true, value: { ...common, sourceType: "INVENTORY_ITEM", inventoryItemId: draft.inventoryItemId,
    inventoryItemName: draft.inventoryItemName, quantity: draft.quantity, unit: draft.unit.trim() } };
}

/** Revalidate at the boundary, including restored drafts, before sealing any request. */
export function optionRequest(draft: OptionDraft, mode: "create"): SlotOptionInput;
export function optionRequest(draft: OptionDraft, mode: "update"): SlotOptionUpdate;
export function optionRequest(draft: OptionDraft, mode: "create" | "update"): SlotOptionInput | SlotOptionUpdate {
  const result = validateOptionDraft(draft, mode);
  if (!result.valid) throw new Error(result.message);
  const option = result.value;
  const displayName = option.displayName || (option.sourceType === "RECIPE" ? option.recipeName : option.inventoryItemName) ||
    (option.sourceType === "RECIPE" ? "Receta" : "Insumo");
  if (option.sourceType === "RECIPE") {
    const source = { sourceType: "RECIPE" as const, displayName };
    if (mode === "create") {
      if (!option.recipeId) throw new Error("Debes elegir una receta de la biblioteca.");
      return { ...source, recipeId: option.recipeId };
    }
    if (!option.optionId) {
      if (!option.recipeId) throw new Error("Debes elegir una receta de la biblioteca.");
      return { ...source, status: option.status, recipeId: option.recipeId };
    }
    return { ...source, optionId: option.optionId, status: option.status,
      ...(option.hasRecipeAssignmentIntent || option.originalSourceType === "INVENTORY_ITEM" ? { recipeId: option.recipeId } : {}) };
  }
  const source = { sourceType: "INVENTORY_ITEM" as const, displayName };
  if (mode === "update" && option.optionId) {
    return { ...source, optionId: option.optionId, status: option.status,
      ...(option.inventoryItemId !== undefined ? { inventoryItemId: option.inventoryItemId } : {}),
      ...(option.quantity !== undefined ? { quantity: option.quantity } : {}),
      ...(option.unit !== undefined ? { unit: option.unit } : {}) };
  }
  if (option.inventoryItemId === undefined || option.quantity === undefined || option.unit === undefined) {
    throw new Error("El nuevo origen de inventario requiere artículo, cantidad y unidad.");
  }
  const complete = { ...source, inventoryItemId: option.inventoryItemId, quantity: option.quantity, unit: option.unit };
  return mode === "create" ? complete : { ...complete, status: option.status };
}
