import { optionRequest, validateOptionDraft, type OptionDraft } from "./optionDraft";

const recipe: OptionDraft = { sourceType: "RECIPE", displayName: "Plato", status: "ACTIVE", recipeId: "recipe-1",
  localId: "local", hasRecipeAssignmentIntent: true, recipeAssignmentToken: "intent-1" };
const inventory: OptionDraft = { sourceType: "INVENTORY_ITEM", displayName: "Refresco", status: "INACTIVE",
  inventoryItemId: "opaque-soda", quantity: 2, unit: "lata" };

describe("option request validation (RV14 / D01)", () => {
  test("new recipe PATCH has complete fields, POST omits status and internal metadata", () => {
    expect(optionRequest(recipe, "update")).toEqual({ sourceType: "RECIPE", displayName: "Plato", status: "ACTIVE", recipeId: "recipe-1" });
    expect(JSON.parse(JSON.stringify(optionRequest(recipe, "create")))).toEqual({ sourceType: "RECIPE", displayName: "Plato", recipeId: "recipe-1" });
  });
  test("existing recipe omission conserves assignment; selecting the same recipe includes it", () => {
    const existing = { ...recipe, optionId: "option-1", originalSourceType: "RECIPE" as const, hasRecipeAssignmentIntent: false };
    expect(optionRequest(existing, "update")).toEqual({ sourceType: "RECIPE", optionId: "option-1", displayName: "Plato", status: "ACTIVE" });
    expect(optionRequest({ ...existing, hasRecipeAssignmentIntent: true }, "update")).toMatchObject({ optionId: "option-1", recipeId: "recipe-1" });
    expect(optionRequest({ ...existing, recipeId: undefined }, "update")).not.toHaveProperty("recipeId");
  });
  test("switching an existing inventory option to recipe requires and sends the new source", () => {
    const changed = { ...recipe, optionId: "option-1", originalSourceType: "INVENTORY_ITEM" as const, hasRecipeAssignmentIntent: false };
    expect(optionRequest(changed, "update")).toMatchObject({ optionId: "option-1", recipeId: "recipe-1" });
    expect(() => optionRequest({ ...changed, recipeId: undefined }, "update")).toThrow("Debes elegir una receta");
  });
  test("inventory tuple is preserved verbatim and no quantity/unit are invented", () => {
    expect(optionRequest(inventory, "update")).toEqual(inventory);
    expect(optionRequest({ ...inventory, optionId: "option-2" }, "update")).toMatchObject({ optionId: "option-2", quantity: 2, unit: "lata" });
    expect(optionRequest(inventory, "create")).toEqual({ sourceType: "INVENTORY_ITEM", displayName: "Refresco", inventoryItemId: "opaque-soda", quantity: 2, unit: "lata" });
  });
  test.each([NaN, Infinity, 0, -1, undefined])("rejects invalid inventory quantity %s before producing a request", quantity => {
    expect(validateOptionDraft({ ...inventory, quantity }, "update").valid).toBe(false);
    expect(() => optionRequest({ ...inventory, quantity }, "update")).toThrow();
  });
  test.each([undefined, "", "   "])("rejects missing authoritative unit %s", unit => {
    expect(() => optionRequest({ ...inventory, unit }, "update")).toThrow("unidad autoritativa");
  });
  test.each<Partial<OptionDraft>>([
    { sourceType: null }, { recipeId: undefined }, { recipeId: " " },
    { inventoryItemId: "mixed" }, { quantity: 2 }, { unit: "mixed" }, { optionId: "" },
  ])("rejects incomplete or mixed restored recipe state %j", changed => {
    expect(() => optionRequest({ ...recipe, ...changed }, "update")).toThrow();
  });
  test("rejects recipe fields in inventory state and missing inventory identity", () => {
    expect(() => optionRequest({ ...inventory, recipeId: "mixed" }, "update")).toThrow("campos de receta");
    expect(() => optionRequest({ ...inventory, inventoryItemId: undefined }, "update")).toThrow();
  });
  test("new POST cannot borrow the omission allowed for an existing recipe PATCH", () => {
    const restored: OptionDraft = { sourceType: "RECIPE", optionId: "existing", displayName: "Plato", status: "ACTIVE" };
    expect(() => optionRequest(restored, "update")).not.toThrow();
    expect(() => optionRequest(restored, "create")).toThrow();
  });
  test("existing inventory omissions are preserved, but a change from recipe requires the whole tuple", () => {
    const existing: OptionDraft = { optionId: "existing", sourceType: "INVENTORY_ITEM", displayName: "Local", status: "ACTIVE" };
    expect(optionRequest(existing, "update")).toEqual({ optionId: "existing", sourceType: "INVENTORY_ITEM", displayName: "Local", status: "ACTIVE" });
    expect(() => optionRequest({ ...existing, originalSourceType: "RECIPE" }, "update")).toThrow();
    expect(optionRequest({ ...existing, ...inventory, originalSourceType: "RECIPE" }, "update")).toMatchObject({ optionId: "existing", inventoryItemId: "opaque-soda", quantity: 2, unit: "lata" });
    expect(() => optionRequest({ ...existing, quantity: NaN }, "update")).toThrow();
    expect(() => optionRequest({ ...existing, unit: " " }, "update")).toThrow();
  });
});
