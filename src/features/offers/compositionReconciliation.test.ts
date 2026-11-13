import type { CompositionSlotDetail } from "../../application/catalog";
import {
  cloneSlotsForDraft,
  ensureSlotLocalIds,
  generateLocalId,
  reconcileComposition,
} from "./compositionReconciliation";
import type { SlotDraft } from "./SlotCard";

describe("compositionReconciliation (Section 3.6)", () => {
  test("generates stable localIds and preserves them", () => {
    const rawSlots: SlotDraft[] = [
      {
        name: "Plato principal",
        quantity: 1,
        course: "plato fuerte",
        options: [
          {
            displayName: "Hamburguesa",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-1",
          },
        ],
      },
    ];

    const withIds = ensureSlotLocalIds(rawSlots);
    expect(withIds[0].localId).toBeDefined();
    expect(withIds[0].options[0].localId).toBeDefined();

    // Calling ensureSlotLocalIds again preserves existing localIds
    const secondPass = ensureSlotLocalIds(withIds);
    expect(secondPass[0].localId).toBe(withIds[0].localId);
    expect(secondPass[0].options[0].localId).toBe(withIds[0].options[0].localId);
  });

  test("unambiguously matches newly created slots and options, assigning server IDs", () => {
    const slotLocalId = generateLocalId();
    const optLocalId = generateLocalId();

    const sentSlots: SlotDraft[] = [
      {
        localId: slotLocalId,
        name: "Bebidas",
        quantity: 1,
        course: "bebida",
        options: [
          {
            localId: optLocalId,
            displayName: "Limonada",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-limonada",
          },
        ],
      },
    ];

    const responseSlots: CompositionSlotDetail[] = [
      {
        slotId: "srv-slot-1",
        name: "Bebidas",
        quantity: 1,
        course: "bebida",
        options: [
          {
            optionId: "srv-opt-1",
            displayName: "Limonada",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-limonada",
          },
        ],
      },
    ];

    const currentSlots = [...sentSlots];
    const result = reconcileComposition({ currentSlots, sentSlots, responseSlots });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.slots[0].slotId).toBe("srv-slot-1");
      expect(result.slots[0].options[0].optionId).toBe("srv-opt-1");
      expect(result.slots[0].localId).toBe(slotLocalId);
      expect(result.slots[0].options[0].localId).toBe(optLocalId);
    }
  });

  test("handles reordered response slots matching correctly by contract", () => {
    const slot1LocalId = generateLocalId();
    const slot2LocalId = generateLocalId();

    const sentSlots: SlotDraft[] = [
      {
        localId: slot1LocalId,
        name: "Entrada",
        quantity: 1,
        course: "entrada",
        options: [],
      },
      {
        localId: slot2LocalId,
        name: "Postre",
        quantity: 2,
        course: "postre",
        options: [],
      },
    ];

    // Response comes back in reversed order
    const responseSlots: CompositionSlotDetail[] = [
      {
        slotId: "srv-postre",
        name: "Postre",
        quantity: 2,
        course: "postre",
        options: [],
      },
      {
        slotId: "srv-entrada",
        name: "Entrada",
        quantity: 1,
        course: "entrada",
        options: [],
      },
    ];

    const currentSlots = [...sentSlots];
    const result = reconcileComposition({ currentSlots, sentSlots, responseSlots });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.slots[0].slotId).toBe("srv-entrada");
      expect(result.slots[1].slotId).toBe("srv-postre");
    }
  });

  test("preserves post-send edits: deleted slot is NOT restored, edited fields kept, added option keeps no server ID", () => {
    // Scenario described in Section 3.6:
    // "enviar dos grupos con opciones, perder la respuesta, eliminar el primero,
    // editar el segundo y añadir una opción; recargar y recuperar.
    // El segundo conserva sus IDs correctos y cambios, el eliminado no reaparece
    // y la opción añadida sigue siendo nueva."

    const slot1LocalId = generateLocalId();
    const slot2LocalId = generateLocalId();
    const opt1LocalId = generateLocalId();
    const opt2LocalId = generateLocalId();

    const sentSlots: SlotDraft[] = [
      {
        localId: slot1LocalId,
        name: "Grupo 1",
        quantity: 1,
        course: "entrada",
        options: [
          {
            localId: opt1LocalId,
            displayName: "Opción 1",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-1",
          },
        ],
      },
      {
        localId: slot2LocalId,
        name: "Grupo 2",
        quantity: 2,
        course: "plato fuerte",
        options: [
          {
            localId: opt2LocalId,
            displayName: "Opción 2",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-2",
          },
        ],
      },
    ];

    const responseSlots: CompositionSlotDetail[] = [
      {
        slotId: "srv-slot-1",
        name: "Grupo 1",
        quantity: 1,
        course: "entrada",
        options: [
          {
            optionId: "srv-opt-1",
            displayName: "Opción 1",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-1",
          },
        ],
      },
      {
        slotId: "srv-slot-2",
        name: "Grupo 2",
        quantity: 2,
        course: "plato fuerte",
        options: [
          {
            optionId: "srv-opt-2",
            displayName: "Opción 2",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-2",
          },
        ],
      },
    ];

    // Current draft state after edits:
    // - Group 1 was deleted
    // - Group 2 was edited (name changed from "Grupo 2" to "Grupo 2 Editado")
    // - A new option was added to Group 2
    const addedOptionLocalId = generateLocalId();
    const currentSlots: SlotDraft[] = [
      {
        localId: slot2LocalId,
        name: "Grupo 2 Editado", // user edit preserved
        quantity: 3, // user edit preserved
        course: "plato fuerte",
        options: [
          {
            localId: opt2LocalId,
            displayName: "Opción 2",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-2",
          },
          {
            localId: addedOptionLocalId, // newly added
            displayName: "Opción Nueva",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-nueva",
          },
        ],
      },
    ];

    const result = reconcileComposition({ currentSlots, sentSlots, responseSlots });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.slots).toHaveLength(1); // Deleted slot 1 was NOT restored
      const slot2 = result.slots[0];
      expect(slot2.localId).toBe(slot2LocalId);
      expect(slot2.slotId).toBe("srv-slot-2"); // Correctly matched and assigned
      expect(slot2.name).toBe("Grupo 2 Editado"); // Preserved user edit!
      expect(slot2.quantity).toBe(3); // Preserved user edit!

      expect(slot2.options).toHaveLength(2);
      expect(slot2.options[0].localId).toBe(opt2LocalId);
      expect(slot2.options[0].optionId).toBe("srv-opt-2"); // Matched!

      expect(slot2.options[1].localId).toBe(addedOptionLocalId);
      expect(slot2.options[1].optionId).toBeUndefined(); // Added option remains without server ID!
    }
  });

  test("detects ambiguous newly created slots with identical contractual fields", () => {
    const slot1LocalId = generateLocalId();
    const slot2LocalId = generateLocalId();

    const sentSlots: SlotDraft[] = [
      {
        localId: slot1LocalId,
        name: "Acompañamiento",
        quantity: 1,
        course: "plato fuerte",
        options: [],
      },
      {
        localId: slot2LocalId,
        name: "Acompañamiento",
        quantity: 1,
        course: "plato fuerte",
        options: [],
      },
    ];

    const responseSlots: CompositionSlotDetail[] = [
      {
        slotId: "srv-acomp-1",
        name: "Acompañamiento",
        quantity: 1,
        course: "plato fuerte",
        options: [],
      },
      {
        slotId: "srv-acomp-2",
        name: "Acompañamiento",
        quantity: 1,
        course: "plato fuerte",
        options: [],
      },
    ];

    const currentSlots = [...sentSlots];
    const result = reconcileComposition({ currentSlots, sentSlots, responseSlots });

    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.reason).toContain("múltiples");
      expect(result.responseSlots).toEqual(responseSlots);
    }
  });

  test("detects ambiguous newly created options within the same slot", () => {
    const slotLocalId = generateLocalId();
    const opt1LocalId = generateLocalId();
    const opt2LocalId = generateLocalId();

    const sentSlots: SlotDraft[] = [
      {
        localId: slotLocalId,
        name: "Bebidas",
        quantity: 1,
        course: "bebida",
        options: [
          {
            localId: opt1LocalId,
            displayName: "Agua",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-agua",
          },
          {
            localId: opt2LocalId,
            displayName: "Agua",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-agua",
          },
        ],
      },
    ];

    const responseSlots: CompositionSlotDetail[] = [
      {
        slotId: "srv-bebidas",
        name: "Bebidas",
        quantity: 1,
        course: "bebida",
        options: [
          {
            optionId: "srv-opt-agua-1",
            displayName: "Agua",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-agua",
          },
          {
            optionId: "srv-opt-agua-2",
            displayName: "Agua",
            status: "ACTIVE",
            sourceType: "RECIPE",
            recipeId: "rec-agua",
          },
        ],
      },
    ];

    const currentSlots = [...sentSlots];
    const result = reconcileComposition({ currentSlots, sentSlots, responseSlots });

    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.reason).toContain("múltiples");
    }
  });

  test("detects missing slot in response as ambiguous", () => {
    const slotLocalId = generateLocalId();

    const sentSlots: SlotDraft[] = [
      {
        localId: slotLocalId,
        slotId: "existing-slot-id",
        name: "Entrada",
        quantity: 1,
        course: "entrada",
        options: [],
      },
    ];

    const responseSlots: CompositionSlotDetail[] = [];

    const currentSlots = [...sentSlots];
    const result = reconcileComposition({ currentSlots, sentSlots, responseSlots });

    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.reason).toContain("no fue encontrado");
    }
  });

  describe("cloneSlotsForDraft (MVP1-T29 / REQ-MENU-OFFER-005)", () => {
    test("clones slots and options into editable local definitions with fresh localIds and without server IDs", () => {
      const sourceSlots: CompositionSlotDetail[] = [
        {
          slotId: "srv-slot-100",
          name: "Guarniciones",
          quantity: 2,
          course: "entrada",
          status: "ACTIVE",
          options: [
            {
              optionId: "srv-opt-200",
              displayName: "Papas Fritas",
              status: "ACTIVE",
              sourceType: "INVENTORY_ITEM",
              inventoryItemId: "inv-potatoes",
              quantity: 150,
              unit: "g",
            },
          ],
        },
      ];

      const cloned = cloneSlotsForDraft(sourceSlots);

      expect(cloned).toHaveLength(1);
      expect(cloned[0].slotId).toBeUndefined();
      expect(cloned[0].localId).toBeDefined();
      expect(cloned[0].localId).not.toBe("srv-slot-100");
      expect(cloned[0].name).toBe("Guarniciones");
      expect(cloned[0].quantity).toBe(2);
      expect(cloned[0].course).toBe("entrada");

      expect(cloned[0].options).toHaveLength(1);
      expect(cloned[0].options[0].optionId).toBeUndefined();
      expect(cloned[0].options[0].localId).toBeDefined();
      expect(cloned[0].options[0].localId).not.toBe("srv-opt-200");
      expect(cloned[0].options[0].displayName).toBe("Papas Fritas");
      expect(cloned[0].options[0].status).toBe("ACTIVE");
      expect(cloned[0].options[0].sourceType).toBe("INVENTORY_ITEM");
      expect(cloned[0].options[0].inventoryItemId).toBe("inv-potatoes");
      expect(cloned[0].options[0].quantity).toBe(150);
      expect(cloned[0].options[0].unit).toBe("g");
    });

    test("preserves option status (ACTIVE/INACTIVE) and content origin references (RECIPE and INVENTORY_ITEM)", () => {
      const sourceSlots: CompositionSlotDetail[] = [
        {
          slotId: "srv-slot-200",
          name: "Bebidas y Complementos",
          quantity: 1,
          course: null,
          status: "ACTIVE",
          options: [
            {
              optionId: "srv-opt-301",
              displayName: "Salsa Secreta",
              status: "INACTIVE",
              sourceType: "RECIPE",
              recipeId: "rec-sauce-1",
            },
            {
              optionId: "srv-opt-302",
              displayName: "Jugo Natural",
              status: "ACTIVE",
              sourceType: "INVENTORY_ITEM",
              inventoryItemId: "inv-juice-1",
              quantity: 250,
              unit: "ml",
            },
          ],
        },
      ];

      const cloned = cloneSlotsForDraft(sourceSlots);

      expect(cloned[0].options[0].status).toBe("INACTIVE");
      expect(cloned[0].options[0].sourceType).toBe("RECIPE");
      expect(cloned[0].options[0].recipeId).toBe("rec-sauce-1");
      expect(cloned[0].options[0].hasRecipeAssignmentIntent).toBe(true);

      expect(cloned[0].options[1].status).toBe("ACTIVE");
      expect(cloned[0].options[1].sourceType).toBe("INVENTORY_ITEM");
      expect(cloned[0].options[1].inventoryItemId).toBe("inv-juice-1");
      expect(cloned[0].options[1].quantity).toBe(250);
      expect(cloned[0].options[1].unit).toBe("ml");
    });

    test("returns empty array when source composition has no slots", () => {
      expect(cloneSlotsForDraft([])).toEqual([]);
    });
  });
});
