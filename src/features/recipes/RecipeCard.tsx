import type { RecipeSummary } from "../../application/catalog";

interface RecipeCardProps {
  recipe: RecipeSummary;
  mode: "management" | "selection";
  onEdit?(recipe: RecipeSummary): void;
  onDelete?(recipe: RecipeSummary): void;
  onSelect?(recipe: RecipeSummary): void;
  isBusy?: boolean;
}

export function RecipeCard({
  recipe,
  mode,
  onEdit,
  onDelete,
  onSelect,
  isBusy = false,
}: Readonly<RecipeCardProps>) {
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
              onClick={() => onSelect?.(recipe)}
              disabled={isBusy}
            >
              Asignar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => onEdit?.(recipe)}
                disabled={isBusy}
                aria-label={`Editar ${recipe.name}`}
              >
                Editar
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => onDelete?.(recipe)}
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
