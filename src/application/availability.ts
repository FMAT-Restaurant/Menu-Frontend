import type { EntryStatus, OfferStatus } from "./catalog";

export interface OrderabilityState {
  readonly orderable: boolean;
  readonly label: "Ordenable" | "No ordenable";
  readonly reason?: string;
}

export function optionUnavailableReason(
  sourceType: "RECIPE" | "INVENTORY_ITEM" | null | undefined,
): string {
  if (sourceType === "RECIPE") {
    return "Receta sin disponibilidad en Inventario.";
  }
  if (sourceType === "INVENTORY_ITEM") {
    return "Insumo sin disponibilidad en Inventario.";
  }
  return "Sin disponibilidad en Inventario.";
}

/** RF-DISP-02: A selection group is available iff at least one ACTIVE option is available. */
export function deriveSlotAvailability(
  options: ReadonlyArray<{ status?: OfferStatus; isAvailable?: boolean }>,
  fallback?: boolean,
): boolean | undefined {
  if (options.length > 0 && options.every((option) => typeof option.isAvailable === "boolean")) {
    return options.some((option) => (option.status ?? "ACTIVE") === "ACTIVE" && option.isAvailable === true);
  }
  return fallback;
}

/** RF-DISP-03: An offer is available iff all of its selection groups are available. */
export function deriveOfferAvailability(
  slots: ReadonlyArray<{ isAvailable?: boolean }>,
  fallback?: boolean,
): boolean | undefined {
  if (slots.length > 0 && slots.every((slot) => typeof slot.isAvailable === "boolean")) {
    return slots.every((slot) => slot.isAvailable === true);
  }
  if (slots.length === 0 && fallback !== undefined) {
    return false;
  }
  return fallback;
}

/** RF-DISP-04: An entry is available iff at least one of its ACTIVE offers is available. */
export function deriveEntryAvailability(
  offers: ReadonlyArray<{ status: OfferStatus; isAvailable?: boolean }>,
  fallback?: boolean,
): boolean | undefined {
  if (offers.every((offer) => typeof offer.isAvailable === "boolean")) {
    return offers.some((offer) => offer.status === "ACTIVE" && offer.isAvailable === true);
  }
  return fallback;
}

/** RF-DISP-05: An offer is orderable iff both the offer and its entry are ACTIVE and available. */
export function evaluateOfferOrderability(params: {
  readonly offerStatus: OfferStatus;
  readonly offerAvailable?: boolean;
  readonly entryStatus?: EntryStatus;
  readonly entryAvailable?: boolean;
}): OrderabilityState | undefined {
  if (params.offerAvailable === undefined) return undefined;
  if (params.entryStatus === "ARCHIVED") {
    return { orderable: false, label: "No ordenable", reason: "Entrada archivada" };
  }
  if (params.entryStatus === "INACTIVE") {
    return { orderable: false, label: "No ordenable", reason: "Entrada inactiva" };
  }
  if (params.offerStatus !== "ACTIVE") {
    return { orderable: false, label: "No ordenable", reason: "Oferta inactiva" };
  }
  if (!params.offerAvailable || params.entryAvailable === false) {
    return { orderable: false, label: "No ordenable", reason: "Sin disponibilidad" };
  }
  return { orderable: true, label: "Ordenable" };
}

/** RF-DISP-05: An entry is orderable iff it is ACTIVE and has at least one available ACTIVE offer. */
export function evaluateEntryOrderability(params: {
  readonly status: EntryStatus;
  readonly isAvailable?: boolean;
}): OrderabilityState | undefined {
  if (params.isAvailable === undefined) return undefined;
  if (params.status === "ARCHIVED") {
    return { orderable: false, label: "No ordenable", reason: "Entrada archivada" };
  }
  if (params.status === "INACTIVE") {
    return { orderable: false, label: "No ordenable", reason: "Entrada inactiva" };
  }
  if (!params.isAvailable) {
    return { orderable: false, label: "No ordenable", reason: "Sin ofertas activas disponibles" };
  }
  return { orderable: true, label: "Ordenable" };
}
