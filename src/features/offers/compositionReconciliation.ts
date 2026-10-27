import type {
  CompositionSlotDetail,
  OfferCourse,
  SlotOptionDetail,
} from "../../application/catalog";
import type { OptionDraft } from "./optionDraft";
import type { SlotDraft } from "./SlotCard";

export function generateLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const v = c === "x" ? Math.floor(Math.random() * 16) : Math.floor(Math.random() * 4) + 8;
    return v.toString(16);
  });
}

export function ensureOptionLocalId(option: OptionDraft): OptionDraft {
  if (option.localId) {
    return option;
  }
  return {
    ...option,
    localId: generateLocalId(),
  };
}

export function ensureSlotLocalIds(slots: SlotDraft[]): SlotDraft[] {
  return slots.map((slot) => {
    const slotLocalId = slot.localId || generateLocalId();
    const optionsWithLocalId = (slot.options || []).map(ensureOptionLocalId);
    return {
      ...slot,
      localId: slotLocalId,
      options: optionsWithLocalId,
    };
  });
}

/** A later selection of the same recipe is a new intent and must survive recovery. */
export function consumeConfirmedRecipeAssignments(current: SlotDraft[], sent: SlotDraft[]): SlotDraft[] {
  const sentOptions = new Map(sent.flatMap(slot => slot.options.map(option => [option.localId, option] as const)));
  return current.map(slot => ({ ...slot, options: slot.options.map(option => {
    const submitted = option.localId ? sentOptions.get(option.localId) : undefined;
    const consumed = submitted?.hasRecipeAssignmentIntent && submitted.recipeId === option.recipeId &&
      submitted.recipeAssignmentToken === option.recipeAssignmentToken;
    return { ...option, hasRecipeAssignmentIntent: consumed ? false : option.hasRecipeAssignmentIntent };
  }) }));
}

export interface ReconcileCompositionParams {
  readonly currentSlots: SlotDraft[];
  readonly sentSlots: SlotDraft[];
  readonly responseSlots: CompositionSlotDetail[];
}

export type ReconciliationResult =
  | {
      readonly status: "success";
      readonly slots: SlotDraft[];
    }
  | {
      readonly status: "ambiguous";
      readonly reason: string;
      readonly responseSlots: CompositionSlotDetail[];
    };

function matchesRecipeContract(sentOpt: OptionDraft, respOpt: SlotOptionDetail): boolean {
  if (respOpt.sourceType !== "RECIPE" || respOpt.recipeId !== sentOpt.recipeId) return false;
  const expectedName = sentOpt.displayName || sentOpt.recipeName || "Receta";
  return respOpt.displayName === expectedName || respOpt.displayName === sentOpt.displayName;
}

function matchesInventoryContract(sentOpt: OptionDraft, respOpt: SlotOptionDetail): boolean {
  if (respOpt.sourceType !== "INVENTORY_ITEM" || respOpt.inventoryItemId !== sentOpt.inventoryItemId) return false;
  if ((respOpt.quantity ?? 1) !== (sentOpt.quantity ?? 1)) return false;
  if ((respOpt.unit || "u") !== (sentOpt.unit || "u")) return false;
  const expectedName = sentOpt.displayName || sentOpt.inventoryItemName || "Insumo";
  return respOpt.displayName === expectedName || respOpt.displayName === sentOpt.displayName;
}

function matchOptionContract(sentOpt: OptionDraft, respOpt: SlotOptionDetail): boolean {
  if (sentOpt.sourceType === "RECIPE") return matchesRecipeContract(sentOpt, respOpt);
  if (sentOpt.sourceType === "INVENTORY_ITEM") return matchesInventoryContract(sentOpt, respOpt);
  return false;
}

function ambiguous(reason: string, responseSlots: CompositionSlotDetail[]): ReconciliationResult {
  return { status: "ambiguous", reason, responseSlots };
}

function matchExistingSlots(
  sentSlots: SlotDraft[],
  responseSlots: CompositionSlotDetail[],
  matchedSlots: Map<string, CompositionSlotDetail>,
  usedResponseSlotIds: Set<string>,
): ReconciliationResult | null {
  for (const sentSlot of sentSlots) {
    if (!sentSlot.slotId) continue;
    const responseSlot = responseSlots.find((item) => item.slotId === sentSlot.slotId);
    if (!responseSlot) {
      return ambiguous(
        `El grupo "${sentSlot.name}" (ID: ${sentSlot.slotId}) no fue encontrado en la respuesta del servidor.`,
        responseSlots,
      );
    }
    matchedSlots.set(sentSlot.localId || sentSlot.slotId, responseSlot);
    usedResponseSlotIds.add(responseSlot.slotId);
  }
  return null;
}

function matchesNewSlotContract(sentSlot: SlotDraft, responseSlot: CompositionSlotDetail): boolean {
  const responseCourse: OfferCourse | null = responseSlot.course ?? null;
  const sentCourse: OfferCourse | null = sentSlot.course ?? null;
  return responseSlot.name === sentSlot.name &&
    responseSlot.quantity === sentSlot.quantity &&
    responseCourse === sentCourse &&
    (responseSlot.options || []).length === sentSlot.options.length;
}

function newSlotAmbiguityReason(sentSlot: SlotDraft, candidateCount: number): string {
  if (candidateCount === 0) return `No se encontró correspondencia para el nuevo grupo "${sentSlot.name}".`;
  return `Se encontraron múltiples grupos coincidentes para "${sentSlot.name}".`;
}

function matchNewSlots(
  sentSlots: SlotDraft[],
  responseSlots: CompositionSlotDetail[],
  matchedSlots: Map<string, CompositionSlotDetail>,
  usedResponseSlotIds: Set<string>,
): ReconciliationResult | null {
  const availableResponseSlots = responseSlots.filter((item) => !usedResponseSlotIds.has(item.slotId));
  for (const sentSlot of sentSlots) {
    if (sentSlot.slotId) continue;
    const candidates = availableResponseSlots.filter((item) =>
      !usedResponseSlotIds.has(item.slotId) && matchesNewSlotContract(sentSlot, item),
    );
    if (candidates.length !== 1) {
      return ambiguous(newSlotAmbiguityReason(sentSlot, candidates.length), responseSlots);
    }
    const candidate = candidates[0];
    matchedSlots.set(sentSlot.localId || "", candidate);
    usedResponseSlotIds.add(candidate.slotId);
  }
  return null;
}

function matchExistingOptions(
  sentSlot: SlotDraft,
  responseSlot: CompositionSlotDetail,
  matchedOptions: Map<string, SlotOptionDetail>,
  usedOptionIds: Set<string>,
  responseSlots: CompositionSlotDetail[],
): ReconciliationResult | null {
  for (const sentOption of sentSlot.options) {
    if (!sentOption.optionId) continue;
    const responseOption = responseSlot.options.find((item) => item.optionId === sentOption.optionId);
    if (!responseOption) {
      return ambiguous(
        `La opción "${sentOption.displayName}" (ID: ${sentOption.optionId}) en el grupo "${sentSlot.name}" no fue encontrada en la respuesta.`,
        responseSlots,
      );
    }
    matchedOptions.set(sentOption.localId || sentOption.optionId, responseOption);
    usedOptionIds.add(responseOption.optionId);
  }
  return null;
}

function newOptionAmbiguityReason(sentSlot: SlotDraft, sentOption: OptionDraft, candidateCount: number): string {
  const name = sentOption.displayName || sentOption.recipeName || "sin nombre";
  if (candidateCount === 0) return `No se encontró correspondencia para la nueva opción "${name}" en el grupo "${sentSlot.name}".`;
  return `Se encontraron múltiples opciones coincidentes para "${name}" en el grupo "${sentSlot.name}".`;
}

function matchNewOptions(
  sentSlot: SlotDraft,
  responseSlot: CompositionSlotDetail,
  matchedOptions: Map<string, SlotOptionDetail>,
  usedOptionIds: Set<string>,
  responseSlots: CompositionSlotDetail[],
): ReconciliationResult | null {
  const availableOptions = responseSlot.options.filter((item) => !usedOptionIds.has(item.optionId));
  for (const sentOption of sentSlot.options) {
    if (sentOption.optionId) continue;
    const candidates = availableOptions.filter((item) =>
      !usedOptionIds.has(item.optionId) && matchOptionContract(sentOption, item),
    );
    if (candidates.length !== 1) {
      return ambiguous(newOptionAmbiguityReason(sentSlot, sentOption, candidates.length), responseSlots);
    }
    const candidate = candidates[0];
    matchedOptions.set(sentOption.localId || "", candidate);
    usedOptionIds.add(candidate.optionId);
  }
  return null;
}

function matchOptions(
  sentSlots: SlotDraft[],
  matchedSlots: Map<string, CompositionSlotDetail>,
  matchedOptions: Map<string, SlotOptionDetail>,
  responseSlots: CompositionSlotDetail[],
): ReconciliationResult | null {
  for (const sentSlot of sentSlots) {
    const responseSlot = matchedSlots.get(sentSlot.localId || sentSlot.slotId || "");
    if (!responseSlot) continue;
    const usedOptionIds = new Set<string>();
    const existingResult = matchExistingOptions(sentSlot, responseSlot, matchedOptions, usedOptionIds, responseSlots);
    if (existingResult) return existingResult;
    const newResult = matchNewOptions(sentSlot, responseSlot, matchedOptions, usedOptionIds, responseSlots);
    if (newResult) return newResult;
  }
  return null;
}

function applyMatchedOption(currentOption: OptionDraft, matchedOptions: Map<string, SlotOptionDetail>): OptionDraft {
  const matchedOption = matchedOptions.get(currentOption.localId || currentOption.optionId || "");
  return {
    ...currentOption,
    optionId: matchedOption ? matchedOption.optionId : currentOption.optionId,
    originalSourceType: matchedOption?.sourceType ?? currentOption.originalSourceType,
  };
}

function applyMatchedIds(
  currentSlots: SlotDraft[],
  matchedSlots: Map<string, CompositionSlotDetail>,
  matchedOptions: Map<string, SlotOptionDetail>,
): SlotDraft[] {
  return currentSlots.map((currentSlot) => {
    const matchedSlot = matchedSlots.get(currentSlot.localId || currentSlot.slotId || "");
    return {
      ...currentSlot,
      slotId: matchedSlot ? matchedSlot.slotId : currentSlot.slotId,
      options: currentSlot.options.map((option) => applyMatchedOption(option, matchedOptions)),
    };
  });
}

export function reconcileComposition({
  currentSlots,
  sentSlots,
  responseSlots,
}: ReconcileCompositionParams): ReconciliationResult {
  const matchedSlots = new Map<string, CompositionSlotDetail>();
  const matchedOptions = new Map<string, SlotOptionDetail>();
  const usedResponseSlotIds = new Set<string>();
  const existingSlotResult = matchExistingSlots(sentSlots, responseSlots, matchedSlots, usedResponseSlotIds);
  if (existingSlotResult) return existingSlotResult;
  const newSlotResult = matchNewSlots(sentSlots, responseSlots, matchedSlots, usedResponseSlotIds);
  if (newSlotResult) return newSlotResult;
  const optionResult = matchOptions(sentSlots, matchedSlots, matchedOptions, responseSlots);
  if (optionResult) return optionResult;
  return { status: "success", slots: applyMatchedIds(currentSlots, matchedSlots, matchedOptions) };
}
