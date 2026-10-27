import type {
  CatalogImage,
  InventoryItem,
  MenuCategory,
  MenuEntryDetail,
  MenuOfferDetail,
  RecipeDetail,
} from "../application/catalog";

export interface DemoData {
  images: CatalogImage[];
  categories: MenuCategory[];
  entries: MenuEntryDetail[];
  offers: MenuOfferDetail[];
  recipes: RecipeDetail[];
  inventoryItems: InventoryItem[];
}

function illustration(id: string, label: string, drawing: string): CatalogImage {
  const url = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320"><title>${label}</title><rect width="480" height="320" fill="#FFF7ED"/>${drawing}</svg>`,
  )}`;
  return { id, url, thumbnailUrl: url };
}

// A new object graph on each call keeps demo sessions and tests independent.
export function createDemoData(): DemoData {
  const burger = illustration("demo-image-burger", "Hamburguesa", '<path d="M130 145a110 80 0 0 1 220 0" fill="#D97706"/><rect x="125" y="155" width="230" height="20" rx="10" fill="#16A34A"/><rect x="130" y="183" width="220" height="30" rx="15" fill="#78350F"/><rect x="130" y="220" width="220" height="35" rx="16" fill="#D97706"/>');
  const lemonade = illustration("demo-image-lemonade", "Limonada", '<path d="M180 85h120l-18 180h-84z" fill="#FDE68A" stroke="#D97706" stroke-width="4"/><path d="M250 170l30-120h40" fill="none" stroke="#C2410C" stroke-width="8"/><circle cx="188" cy="115" r="30" fill="#FFFBEB" stroke="#D97706" stroke-width="5"/>');
  const brownie = illustration("demo-image-brownie", "Brownie", '<rect x="140" y="120" width="200" height="120" rx="12" fill="#78350F"/><path d="M160 145h160M160 180h160M160 215h160" stroke="#9A3412" stroke-width="8"/><circle cx="240" cy="100" r="42" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="3"/>');

  return {
    images: [burger, lemonade, brownie],
    categories: [
      { id: "demo-category-main", name: "Platos fuertes", description: "Platillos preparados al momento." },
      { id: "demo-category-drinks", name: "Bebidas", description: "Bebidas frías y calientes." },
      { id: "demo-category-desserts", name: "Postres", description: "Un cierre dulce para la comida." },
    ],
    inventoryItems: [
      { id: "demo-inventory-beef", name: "Carne de res", unit: "g" },
      { id: "demo-inventory-bread", name: "Pan brioche", unit: "pza" },
      { id: "demo-inventory-cheese", name: "Queso cheddar", unit: "g" },
      { id: "demo-inventory-lemon", name: "Jugo de limón", unit: "ml" },
      { id: "demo-inventory-water", name: "Agua mineral", unit: "ml" },
      { id: "demo-inventory-chocolate", name: "Chocolate", unit: "g" },
    ],
    entries: [
      { id: "demo-entry-burger", brandName: "Hamburguesa clásica", description: "Carne de res, queso cheddar y pan brioche.", status: "ACTIVE", categoryIds: ["demo-category-main"], image: burger },
      { id: "demo-entry-lemonade", brandName: "Limonada natural", description: "Jugo de limón recién exprimido con agua mineral.", status: "ACTIVE", categoryIds: ["demo-category-drinks"], image: lemonade },
      { id: "demo-entry-brownie", brandName: "Brownie de chocolate", description: "Brownie tibio con una porción de helado.", status: "INACTIVE", categoryIds: ["demo-category-desserts"], image: brownie },
      { id: "demo-entry-seasonal", brandName: "Especial de temporada", description: "Entrada archivada para explorar los cambios de estado.", status: "ARCHIVED", categoryIds: ["demo-category-main"], image: burger },
    ],
    recipes: [
      { id: "demo-recipe-burger", name: "Hamburguesa de res", description: "Preparación base de la hamburguesa clásica.", instructions: "Formar la carne, cocinar a la plancha y montar sobre el pan con queso.", supplies: [{ inventoryItemId: "demo-inventory-beef", quantity: 180 }, { inventoryItemId: "demo-inventory-bread", quantity: 1 }, { inventoryItemId: "demo-inventory-cheese", quantity: 30 }] },
      { id: "demo-recipe-lemonade", name: "Limonada de la casa", description: "Bebida preparada al momento.", instructions: "Mezclar el jugo de limón con el agua mineral y servir frío.", supplies: [{ inventoryItemId: "demo-inventory-lemon", quantity: 60 }, { inventoryItemId: "demo-inventory-water", quantity: 300 }] },
      { id: "demo-recipe-brownie", name: "Brownie artesanal", description: "Base de chocolate para el postre.", instructions: "Integrar los ingredientes, hornear y dejar reposar antes de cortar.", supplies: [{ inventoryItemId: "demo-inventory-chocolate", quantity: 80 }] },
    ],
    offers: [
      { id: "demo-offer-burger", entryId: "demo-entry-burger", presentationTag: "Individual", basePrice: 145, status: "ACTIVE", image: burger, composition: { slots: [
        { slotId: "demo-slot-main", name: "Plato principal", quantity: 1, course: "plato fuerte", status: "ACTIVE", options: [{ optionId: "demo-option-burger", displayName: "Hamburguesa clásica", sourceType: "RECIPE", recipeId: "demo-recipe-burger", status: "ACTIVE" }] },
      ] } },
      { id: "demo-offer-combo", entryId: "demo-entry-burger", presentationTag: "Combo con bebida", basePrice: 185, status: "INACTIVE", image: burger, composition: { slots: [
        { slotId: "demo-slot-combo-main", name: "Plato principal", quantity: 1, course: "plato fuerte", status: "ACTIVE", options: [{ optionId: "demo-option-combo-burger", displayName: "Hamburguesa clásica", sourceType: "RECIPE", recipeId: "demo-recipe-burger", status: "ACTIVE" }] },
        { slotId: "demo-slot-drink", name: "Bebida", quantity: 1, course: "bebida", status: "ACTIVE", options: [{ optionId: "demo-option-water", displayName: "Agua mineral", sourceType: "INVENTORY_ITEM", inventoryItemId: "demo-inventory-water", quantity: 350, unit: "ml", status: "ACTIVE" }] },
      ] } },
      { id: "demo-offer-lemonade", entryId: "demo-entry-lemonade", presentationTag: "Vaso de 360 ml", basePrice: 45, status: "ACTIVE", image: lemonade, composition: { slots: [
        { slotId: "demo-slot-lemonade", name: "Bebida", quantity: 1, course: "bebida", status: "ACTIVE", options: [{ optionId: "demo-option-lemonade", displayName: "Limonada natural", sourceType: "RECIPE", recipeId: "demo-recipe-lemonade", status: "ACTIVE" }] },
      ] } },
    ],
  };
}
