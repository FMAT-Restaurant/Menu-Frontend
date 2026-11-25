const UNIT_TRANSLATIONS: Record<string, { singular: string; plural?: string }> = {
  unit: { singular: "unidad", plural: "unidades" },
  units: { singular: "unidad", plural: "unidades" },
  piece: { singular: "pieza", plural: "piezas" },
  pieces: { singular: "pieza", plural: "piezas" },
  pcs: { singular: "pieza", plural: "piezas" },
  gram: { singular: "g" },
  grams: { singular: "g" },
  kilogram: { singular: "kg" },
  kilograms: { singular: "kg" },
  liter: { singular: "L" },
  liters: { singular: "L" },
  milliliter: { singular: "ml" },
  milliliters: { singular: "ml" },
  slice: { singular: "rebanada", plural: "rebanadas" },
  slices: { singular: "rebanada", plural: "rebanadas" },
  portion: { singular: "porción", plural: "porciones" },
  portions: { singular: "porción", plural: "porciones" },
  box: { singular: "caja", plural: "cajas" },
  boxes: { singular: "caja", plural: "cajas" },
  bottle: { singular: "botella", plural: "botellas" },
  bottles: { singular: "botella", plural: "botellas" },
  can: { singular: "lata", plural: "latas" },
  cans: { singular: "lata", plural: "latas" },
  bag: { singular: "bolsa", plural: "bolsas" },
  bags: { singular: "bolsa", plural: "bolsas" },
  package: { singular: "paquete", plural: "paquetes" },
  packages: { singular: "paquete", plural: "paquetes" },
  cup: { singular: "taza", plural: "tazas" },
  cups: { singular: "taza", plural: "tazas" },
  tablespoon: { singular: "cda." },
  tablespoons: { singular: "cda." },
  teaspoon: { singular: "cdta." },
  teaspoons: { singular: "cdta." },
};

/** Traduce unidades técnicas en inglés (ej. `unit`) a español para su presentación en UI. */
export function formatSupplyUnit(unit: string, quantity?: number): string {
  const trimmed = unit.trim();
  if (!trimmed) return "";
  const entry = UNIT_TRANSLATIONS[trimmed.toLowerCase()];
  if (!entry) return trimmed;
  if (entry.plural && quantity !== undefined && quantity !== 1) {
    return entry.plural;
  }
  return entry.singular;
}
