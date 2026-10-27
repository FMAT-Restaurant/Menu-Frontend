import type { RecipeSummary } from "../../application/catalog";

interface BaseRecipeCardProps {
  recipe: RecipeSummary;
  isBusy?: boolean;
}

export interface ManagementRecipeCardProps extends BaseRecipeCardProps {
  mode: "management";
  onEdit: (recipe: RecipeSummary) => void;
  onDelete: (recipe: RecipeSummary) => void;
  onSelect?: never;
}

export interface SelectionRecipeCardProps extends BaseRecipeCardProps {
  mode: "selection";
  onSelect: (recipe: RecipeSummary) => void;
  onEdit?: never;
  onDelete?: never;
}

export type RecipeCardProps = ManagementRecipeCardProps | SelectionRecipeCardProps;

export function RecipeCard(props: Readonly<RecipeCardProps>) {
  const { recipe, mode, isBusy = false } = props;
  const suppliesText = recipe.supplies
    .map((supply) => {
      const name = supply.inventoryItem?.name ?? supply.inventoryItemId;
      const unit = supply.inventoryItem?.unit ?? "";
      return `${name} (${supply.quantity} ${unit})`.trim();
    })
    .join(", ");

  return (
    <article className="recipe-card" aria-labelledby={`recipe-title-${recipe.id}`}>
      <div className="recipe-card__header">
        <div>
          <h3 id={`recipe-title-${recipe.id}`}>{recipe.name}</h3>
          <p className="recipe-card__description">{recipe.description || "Sin descripción"}</p>
        </div>
        <div className="recipe-card__actions">
          {mode === "selection" ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => props.onSelect(recipe)}
              disabled={isBusy}
            >
              Asignar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => props.onEdit(recipe)}
                disabled={isBusy}
                aria-label={`Editar ${recipe.name}`}
              >
                Editar
              </button>
              <button
                type="button"
                className="button button--quiet recipe-card__delete"
                onClick={(e) => {
                  e.currentTarget.focus();
                  props.onDelete(recipe);
                }}
                disabled={isBusy}
                aria-label={`Eliminar ${recipe.name}`}
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>
      <div className="recipe-card__supplies">
        <p>
          <strong>Insumos:</strong> {suppliesText || "Ninguno"}
        </p>
      </div>
    </article>
  );
}
