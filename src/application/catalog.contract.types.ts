import type { SlotOptionInput, SlotOptionUpdate } from "./catalog";

type Assert<T extends true> = T;
type Rejected<T> = T extends SlotOptionUpdate ? false : true;

/** Checked by tsc; these assertions test the wire contract, not runtime coverage. */
export type OptionContractAssertions = [
  Assert<Rejected<{ sourceType: "RECIPE" }>>,
  Assert<Rejected<{ sourceType: "INVENTORY_ITEM" }>>,
  Assert<Rejected<{ sourceType: "RECIPE"; displayName: string; status: "ACTIVE" }>>,
  Assert<Rejected<{ sourceType: "RECIPE"; recipeId: string; displayName: string }>>,
  Assert<Rejected<{ sourceType: "INVENTORY_ITEM"; inventoryItemId: string; displayName: string; status: "ACTIVE" }>>,
  Assert<Rejected<{ sourceType: "RECIPE"; optionId: string; inventoryItemId: string }>>,
  Assert<Rejected<{ sourceType: "INVENTORY_ITEM"; optionId: string; recipeId: string }>>,
  Assert<{ sourceType: "RECIPE"; optionId: string } extends SlotOptionUpdate ? true : false>,
  Assert<{ sourceType: "INVENTORY_ITEM"; optionId: string } extends SlotOptionUpdate ? true : false>,
  Assert<{ sourceType: "RECIPE"; recipeId: string; displayName: string; status: "ACTIVE" } extends SlotOptionUpdate ? true : false>,
  Assert<{ sourceType: "INVENTORY_ITEM"; inventoryItemId: string; quantity: number; unit: string; displayName: string; status: "ACTIVE" } extends SlotOptionUpdate ? true : false>,
  Assert<{ sourceType: "RECIPE"; recipeId: string; inventoryItemId: string; displayName: string } extends SlotOptionInput ? false : true>,
];
