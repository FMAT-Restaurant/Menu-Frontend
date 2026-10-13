import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type { InventoryItem, RecipeDetail, RecipeDraft, RecipeSummary } from "../../application/catalog";

interface RecipeFormDialogProps {
  recipe?: RecipeDetail | RecipeSummary | null;
  inventoryItems: InventoryItem[];
  onClose(): void;
  onSubmit(draft: RecipeDraft): Promise<void>;
}

let rowSeed = 0;
function nextRowKey(): string {
  rowSeed += 1;
  return `supply-row-${rowSeed}`;
}

interface SupplyRow {
  key: string;
  inventoryItemId: string;
  quantity: string | number;
}

export function RecipeFormDialog({
  recipe,
  inventoryItems,
  onClose,
  onSubmit,
}: Readonly<RecipeFormDialogProps>) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [instructions, setInstructions] = useState(
    (recipe && "instructions" in recipe ? recipe.instructions : "") ?? ""
  );
  const [supplies, setSupplies] = useState<SupplyRow[]>(() => {
    if (recipe?.supplies && recipe.supplies.length > 0) {
      return recipe.supplies.map((s) => ({
        key: nextRowKey(),
        inventoryItemId: s.inventoryItemId,
        quantity: s.quantity,
      }));
    }
    return [{ key: nextRowKey(), inventoryItemId: "", quantity: 1 }];
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    nameRef.current?.focus();
    return () => {
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  function handleAddSupply() {
    setSupplies((current) => [...current, { key: nextRowKey(), inventoryItemId: "", quantity: 1 }]);
  }

  function handleRemoveSupply(index: number) {
    setSupplies((current) => current.filter((_, i) => i !== index));
  }

  function handleSupplyChange(index: number, field: "inventoryItemId" | "quantity", value: string) {
    setSupplies((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function getUnitForItem(inventoryItemId: string) {
    if (!inventoryItemId) return "--";
    const found = inventoryItems.find((item) => item.id === inventoryItemId);
    if (found) return found.unit;
    const fromRecipe = recipe?.supplies?.find((s) => s.inventoryItemId === inventoryItemId)?.inventoryItem;
    return fromRecipe?.unit ?? "--";
  }

  async function handleSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanInstructions = instructions.trim();

    if (!cleanName) {
      setError("Indica el nombre de la receta.");
      nameRef.current?.focus();
      return;
    }

    if (!cleanDescription) {
      setError("Indica la descripción de la receta.");
      return;
    }

    if (!cleanInstructions) {
      setError("Indica las instrucciones de la receta.");
      return;
    }

    if (supplies.length === 0) {
      setError("Agrega al menos un ingrediente del inventario.");
      return;
    }

    const parsedSupplies: { inventoryItemId: string; quantity: number }[] = [];
    for (const supply of supplies) {
      if (!supply.inventoryItemId) {
        setError("Selecciona un artículo de inventario para cada ingrediente.");
        return;
      }
      const qty = Number(supply.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError("La cantidad de cada ingrediente debe ser mayor a 0.");
        return;
      }
      parsedSupplies.push({
        inventoryItemId: supply.inventoryItemId,
        quantity: qty,
      });
    }

    setBusy(true);
    setError("");

    try {
      await onSubmit({
        name: cleanName,
        description: cleanDescription,
        instructions: cleanInstructions,
        supplies: parsedSupplies,
      });
    } catch {
      setError("No se pudo guardar la receta. Verifica los datos y vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  let saveLabel = "Guardar receta";
  if (recipe) saveLabel = "Guardar cambios";
  if (busy) saveLabel = "Guardando…";

  return (
    <dialog
      ref={dialogRef}
      className="recipe-form-dialog"
      aria-labelledby="recipe-form-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="recipe-form-dialog__header">
        <h2 id="recipe-form-title">{recipe ? "Editar receta" : "Nueva receta"}</h2>
        <button
          className="recipe-form-dialog__close"
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Cerrar formulario"
        >
          ×
        </button>
      </div>

      <form noValidate onSubmit={handleSave}>
        <div className="recipe-form-dialog__fields">
          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-name">Nombre</label>
            <input
              ref={nameRef}
              id="recipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              placeholder="Ej. Hamburguesa Hawaiana"
              required
            />
          </div>

          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-description">Descripción</label>
            <textarea
              id="recipe-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descripción breve de la receta"
              required
            />
          </div>

          <div className="recipe-form-dialog__field">
            <label htmlFor="recipe-instructions">Instrucciones</label>
            <textarea
              id="recipe-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Pasos de preparación"
              required
            />
          </div>

          <fieldset className="recipe-supplies-section">
            <div className="recipe-supplies-section__header">
              <legend>Insumos del inventario</legend>
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={handleAddSupply}
                disabled={busy}
              >
                + Agregar insumo
              </button>
            </div>

            <table className="recipe-supplies-table">
              <thead>
                <tr>
                  <th scope="col">Insumo seleccionado</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">U. Medida</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((supply, index) => {
                  const unit = getUnitForItem(supply.inventoryItemId);
                  return (
                    <tr key={supply.key}>
                      <td>
                        <select
                          aria-label={`Insumo ${index + 1}`}
                          value={supply.inventoryItemId}
                          onChange={(e) => handleSupplyChange(index, "inventoryItemId", e.target.value)}
                          disabled={busy}
                          required
                        >
                          <option value="">Seleccione insumo…</option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          aria-label={`Cantidad del insumo ${index + 1}`}
                          value={supply.quantity}
                          onChange={(e) => handleSupplyChange(index, "quantity", e.target.value)}
                          disabled={busy}
                          required
                        />
                      </td>
                      <td className="recipe-supplies-table__unit">{unit}</td>
                      <td>
                        <button
                          type="button"
                          className="button button--quiet"
                          onClick={() => handleRemoveSupply(index)}
                          disabled={busy || supplies.length <= 1}
                          aria-label={`Eliminar insumo ${index + 1}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </fieldset>

          {error && <p className="recipe-form-dialog__error" role="alert">{error}</p>}
        </div>

        <div className="recipe-form-dialog__actions">
          <button
            className="button button--secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button button--primary"
            type="submit"
            disabled={busy}
          >
            {saveLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
