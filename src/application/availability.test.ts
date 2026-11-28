import {
  deriveEntryAvailability,
  deriveOfferAvailability,
  deriveSlotAvailability,
  evaluateEntryOrderability,
  evaluateOfferOrderability,
  optionUnavailableReason,
} from "./availability";

describe("availability rules (RF-DISP-01 to RF-DISP-05)", () => {
  test("provides source-specific unavailable reasons for options (RF-DISP-01.CA1, CA2)", () => {
    expect(optionUnavailableReason("RECIPE")).toBe("Receta sin disponibilidad en Inventario.");
    expect(optionUnavailableReason("INVENTORY_ITEM")).toBe("Insumo sin disponibilidad en Inventario.");
    expect(optionUnavailableReason(null)).toBe("Sin disponibilidad en Inventario.");
    expect(optionUnavailableReason(undefined)).toBe("Sin disponibilidad en Inventario.");
  });

  test("derives slot availability only from active available options (RF-DISP-02)", () => {
    expect(
      deriveSlotAvailability([
        { status: "INACTIVE", isAvailable: true },
        { status: "ACTIVE", isAvailable: false },
      ]),
    ).toBe(false);

    expect(
      deriveSlotAvailability([
        { status: "ACTIVE", isAvailable: false },
        { status: "ACTIVE", isAvailable: true },
      ]),
    ).toBe(true);

    expect(deriveSlotAvailability([{ isAvailable: true }])).toBe(true);
    expect(deriveSlotAvailability([{ status: "ACTIVE" }], true)).toBe(true);
    expect(deriveSlotAvailability([], false)).toBe(false);
  });

  test("derives offer availability when all slots are available (RF-DISP-03)", () => {
    expect(deriveOfferAvailability([{ isAvailable: true }, { isAvailable: true }])).toBe(true);
    expect(deriveOfferAvailability([{ isAvailable: true }, { isAvailable: false }])).toBe(false);
    expect(deriveOfferAvailability([], true)).toBe(false);
    expect(deriveOfferAvailability([{}], undefined)).toBeUndefined();
  });

  test("derives entry availability from active available offers (RF-DISP-04)", () => {
    expect(
      deriveEntryAvailability([
        { status: "INACTIVE", isAvailable: true },
        { status: "ACTIVE", isAvailable: false },
      ]),
    ).toBe(false);

    expect(
      deriveEntryAvailability([
        { status: "INACTIVE", isAvailable: false },
        { status: "ACTIVE", isAvailable: true },
      ]),
    ).toBe(true);

    expect(deriveEntryAvailability([{ status: "ACTIVE" }], false)).toBe(false);
  });

  test("evaluates offer and entry orderability with explicit reasons (RF-DISP-05)", () => {
    expect(evaluateOfferOrderability({ offerStatus: "ACTIVE" })).toBeUndefined();
    expect(
      evaluateOfferOrderability({
        offerStatus: "ACTIVE",
        offerAvailable: true,
        entryStatus: "ACTIVE",
        entryAvailable: true,
      }),
    ).toEqual({ orderable: true, label: "Ordenable" });
    expect(
      evaluateOfferOrderability({
        offerStatus: "ACTIVE",
        offerAvailable: true,
        entryStatus: "ARCHIVED",
      }),
    ).toEqual({ orderable: false, label: "No ordenable", reason: "Entrada archivada" });
    expect(
      evaluateOfferOrderability({
        offerStatus: "ACTIVE",
        offerAvailable: true,
        entryStatus: "INACTIVE",
      }),
    ).toEqual({ orderable: false, label: "No ordenable", reason: "Entrada inactiva" });
    expect(
      evaluateOfferOrderability({
        offerStatus: "INACTIVE",
        offerAvailable: true,
        entryStatus: "ACTIVE",
      }),
    ).toEqual({ orderable: false, label: "No ordenable", reason: "Oferta inactiva" });
    expect(
      evaluateOfferOrderability({
        offerStatus: "ACTIVE",
        offerAvailable: false,
        entryStatus: "ACTIVE",
      }),
    ).toEqual({ orderable: false, label: "No ordenable", reason: "Sin disponibilidad" });

    expect(evaluateEntryOrderability({ status: "ACTIVE" })).toBeUndefined();
    expect(evaluateEntryOrderability({ status: "ACTIVE", isAvailable: true })).toEqual({
      orderable: true,
      label: "Ordenable",
    });
    expect(evaluateEntryOrderability({ status: "ACTIVE", isAvailable: false })).toEqual({
      orderable: false,
      label: "No ordenable",
      reason: "Sin ofertas activas disponibles",
    });
    expect(evaluateEntryOrderability({ status: "INACTIVE", isAvailable: true })).toEqual({
      orderable: false,
      label: "No ordenable",
      reason: "Entrada inactiva",
    });
    expect(evaluateEntryOrderability({ status: "ARCHIVED", isAvailable: false })).toEqual({
      orderable: false,
      label: "No ordenable",
      reason: "Entrada archivada",
    });
  });
});
