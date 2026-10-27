import type { CatalogFiltersProps } from "../features/catalog/CatalogFilters";
import type { RecipeCardProps } from "../features/recipes/RecipeCard";
import type { RecipeSummary } from "./catalog";

type Assert<T extends true> = T;
type FilterChange = CatalogFiltersProps["onFilterChange"];
export type UiContractAssertions = [
  Assert<FilterChange extends (name: "status", value: "UNRECOGNIZED") => void ? false : true>,
  Assert<FilterChange extends (name: "missingFilter", value: string) => void ? false : true>,
  Assert<FilterChange extends (name: "status", value: "ACTIVE") => void ? true : false>,
  Assert<FilterChange extends (name: "categoryId", value: string) => void ? true : false>,
  Assert<{ mode: "selection"; recipe: RecipeSummary } extends RecipeCardProps ? false : true>,
  Assert<{ mode: "management"; recipe: RecipeSummary } extends RecipeCardProps ? false : true>,
  Assert<{ mode: "selection"; recipe: RecipeSummary; onSelect: (recipe: RecipeSummary) => void } extends RecipeCardProps ? true : false>,
  Assert<{ mode: "management"; recipe: RecipeSummary; onEdit: (recipe: RecipeSummary) => void; onDelete: (recipe: RecipeSummary) => void } extends RecipeCardProps ? true : false>,
];
