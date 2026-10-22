import type {
  CompositionSlotDetail,
  OfferCourse,
  SlotOptionDetail,
} from "../../application/catalog";
import type { OptionDraft } from "./OptionModal";
import type { SlotDraft } from "./SlotCard";

export function generateLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
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

function matchOptionContract(
  sentOpt: OptionDraft,
  respOpt: SlotOptionDetail,
): boolean {
  if (sentOpt.sourceType === "RECIPE") {
    if (respOpt.sourceType !== "RECIPE") return false;
    if (respOpt.recipeId !== sentOpt.recipeId) return false;
    const expectedName = sentOpt.displayName || sentOpt.recipeName || "Receta";
    if (respOpt.displayName !== expectedName && respOpt.displayName !== sentOpt.displayName) {
      return false;
    }
    return true;
  }
  if (sentOpt.sourceType === "INVENTORY_ITEM") {
    if (respOpt.sourceType !== "INVENTORY_ITEM") return false;
    if (respOpt.inventoryItemId !== sentOpt.inventoryItemId) return false;
    if ((respOpt.quantity ?? 1) !== (sentOpt.quantity ?? 1)) return false;
    if ((respOpt.unit || "u") !== (sentOpt.unit || "u")) return false;
    const expectedName = sentOpt.displayName || sentOpt.inventoryItemName || "Insumo";
    if (respOpt.displayName !== expectedName && respOpt.displayName !== sentOpt.displayName) {
      return false;
    }
    return true;
  }
  return false;
}

export function reconcileComposition({
  currentSlots,
  sentSlots,
  responseSlots,
}: ReconcileCompositionParams): ReconciliationResult {
  const matchedSlots = new Map<string, CompositionSlotDetail>();
  const usedResponseSlotIds = new Set<string>();

  // 1. Match existing slots (with slotId)
  for (const sentSlot of sentSlots) {
    if (sentSlot.slotId) {
      const respSlot = responseSlots.find((r) => r.slotId === sentSlot.slotId);
      if (!respSlot) {
        return {
          status: "ambiguous",
          reason: `El grupo "${sentSlot.name}" (ID: ${sentSlot.slotId}) no fue encontrado en la respuesta del servidor.`,
          responseSlots,
        };
      }
      matchedSlots.set(sentSlot.localId || sentSlot.slotId || "", respSlot);
      usedResponseSlotIds.add(respSlot.slotId);
    }
  }

  // 2. Match newly created slots (without slotId)
  const availableResponseSlots = responseSlots.filter(
    (r) => !usedResponseSlotIds.has(r.slotId),
  );

  for (const sentSlot of sentSlots) {
    if (!sentSlot.slotId) {
      const candidates = availableResponseSlots.filter((r) => {
        if (usedResponseSlotIds.has(r.slotId)) return false;
        if (r.name !== sentSlot.name) return false;
        if (r.quantity !== sentSlot.quantity) return false;
        const respCourse: OfferCourse | null = r.course ?? null;
        const sentCourse: OfferCourse | null = sentSlot.course ?? null;
        if (respCourse !== sentCourse) return false;
        if ((r.options || []).length !== sentSlot.options.length) return false;
        return true;
      });

      if (candidates.length === 1) {
        const candidate = candidates[0];
        matchedSlots.set(sentSlot.localId || "", candidate);
        usedResponseSlotIds.add(candidate.slotId);
      } else {
        return {
          status: "ambiguous",
          reason:
            candidates.length === 0
              ? `No se encontró correspondencia para el nuevo grupo "${sentSlot.name}".`
              : `Se encontraron múltiples grupos coincidentes para "${sentSlot.name}".`,
          responseSlots,
        };
      }
    }
  }

  // 3. Match options within each matched slot
  const matchedOptions = new Map<string, SlotOptionDetail>();

  for (const sentSlot of sentSlots) {
    const respSlot = matchedSlots.get(sentSlot.localId || sentSlot.slotId || "");
    if (!respSlot) continue;

    const usedOptionIds = new Set<string>();

    // 3a. Match existing options (with optionId)
    for (const sentOpt of sentSlot.options) {
      if (sentOpt.optionId) {
        const respOpt = respSlot.options.find((o) => o.optionId === sentOpt.optionId);
        if (!respOpt) {
          return {
            status: "ambiguous",
            reason: `La opción "${sentOpt.displayName}" (ID: ${sentOpt.optionId}) en el grupo "${sentSlot.name}" no fue encontrada en la respuesta.`,
            responseSlots,
          };
        }
        matchedOptions.set(sentOpt.localId || sentOpt.optionId, respOpt);
        usedOptionIds.add(respOpt.optionId);
      }
    }

    // 3b. Match newly created options (without optionId)
    const availableRespOptions = respSlot.options.filter(
      (o) => !usedOptionIds.has(o.optionId),
    );

    for (const sentOpt of sentSlot.options) {
      if (!sentOpt.optionId) {
        const candidates = availableRespOptions.filter((o) => {
          if (usedOptionIds.has(o.optionId)) return false;
          return matchOptionContract(sentOpt, o);
        });

        if (candidates.length === 1) {
          const candidate = candidates[0];
          matchedOptions.set(sentOpt.localId || "", candidate);
          usedOptionIds.add(candidate.optionId);
        } else {
          return {
            status: "ambiguous",
            reason:
              candidates.length === 0
                ? `No se encontró correspondencia para la nueva opción "${sentOpt.displayName || sentOpt.recipeName || "sin nombre"}" en el grupo "${sentSlot.name}".`
                : `Se encontraron múltiples opciones coincidentes para "${sentOpt.displayName || sentOpt.recipeName || "sin nombre"}" en el grupo "${sentSlot.name}".`,
            responseSlots,
          };
        }
      }
    }
  }

  // 4. Incorporate matched IDs into current draft, preserving current edits and not restoring deleted members
  const updatedSlots = currentSlots.map((currentSlot) => {
    const matchedSlot = matchedSlots.get(currentSlot.localId || currentSlot.slotId || "");
    const newSlotId = matchedSlot ? matchedSlot.slotId : currentSlot.slotId;

    const updatedOptions = currentSlot.options.map((currentOpt) => {
      const matchedOpt = matchedOptions.get(currentOpt.localId || currentOpt.optionId || "");
      const newOptionId = matchedOpt ? matchedOpt.optionId : currentOpt.optionId;
      return {
        ...currentOpt,
        optionId: newOptionId,
      };
    });

    return {
      ...currentSlot,
      slotId: newSlotId,
      options: updatedOptions,
    };
  });

  return {
    status: "success",
    slots: updatedSlots,
  };
}
