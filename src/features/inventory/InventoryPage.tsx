import { useEffect, useState } from "react";
import type { InventoryItem, MenuRepository, Page } from "../../application/catalog";
import { SearchField } from "../../shared/SearchField";

export type InventoryRepository = Pick<MenuRepository, "listInventoryItems">;

export interface InventoryPageProps {
  repository: InventoryRepository;
  context?: "option" | "ingredient";
  onSelectItem?: (item: InventoryItem) => void;
  onClose?: () => void;
}

export function InventoryPage({
  repository,
  context = "option",
  onSelectItem,
  onClose,
}: Readonly<InventoryPageProps>) {
  const [draftSearch, setDraftSearch] = useState("");
  const [queryText, setQueryText] = useState("");
  const [itemsResult, setItemsResult] = useState<Page<InventoryItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    repository
      .listInventoryItems(
        {
          ...(queryText ? { q: queryText } : {}),
          page: 1,
          pageSize: 50,
        },
        controller.signal
      )
      .then((res) => {
        if (!controller.signal.aborted) {
          setItemsResult(res);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("No se pudieron cargar los artículos de inventario.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [repository, queryText, retry]);

  function handleSearchSubmit() {
    setQueryText(draftSearch.trim());
  }

  const rawItems = itemsResult?.data ?? [];
  const normalizedFilter = draftSearch.trim().toLocaleLowerCase();
  const filteredItems = normalizedFilter
    ? rawItems.filter(
        (item) =>
          item.name.toLocaleLowerCase().includes(normalizedFilter) ||
          item.unit.toLocaleLowerCase().includes(normalizedFilter) ||
          item.id.toLocaleLowerCase().includes(normalizedFilter)
      )
    : rawItems;

  const subtitle =
    context === "ingredient"
      ? "Selecciona un artículo del catálogo de Inventario para la línea de ingrediente."
      : "Selecciona un artículo del catálogo de Inventario como origen directo de la opción.";

  return (
    <div className="category-screen inventory-screen">
      <header className="category-screen__header">
        <div>
          <p className="eyebrow">Administración del menú</p>
          <h1 id="inventory-selector-title">Artículos de inventario — elegir opción</h1>
          <p>{subtitle}</p>
        </div>
        <button
          type="button"
          className="button category-screen__back"
          onClick={onClose}
        >
          ✕ Cancelar
        </button>
      </header>

      <main className="category-screen__main">
        <section className="category-panel" aria-labelledby="inventory-list-heading">
          <div className="category-panel__heading">
            <div>
              <h2 id="inventory-list-heading">Catálogo de artículos de inventario</h2>
              <p>
                Inventario conserva la identidad, unidad de medida autoritativa y existencias de cada artículo.
              </p>
            </div>
          </div>

          <div className="recipe-toolbar">
            <SearchField
              id="inventory-search"
              label="Buscar insumo"
              placeholder="Buscar insumo..."
              value={draftSearch}
              onChange={setDraftSearch}
              onSearch={handleSearchSubmit}
            />
          </div>

          {error && (
            <div className="feedback feedback--error" role="alert">
              {error}{" "}
              <button type="button" onClick={() => setRetry((r) => r + 1)}>
                Reintentar
              </button>
            </div>
          )}

          {loading && <output className="feedback">Cargando artículos de inventario…</output>}

          {!loading && !error && filteredItems.length === 0 && (
            <div className="empty-state category-empty">
              <span className="empty-state__icon" aria-hidden="true">⌕</span>
              <h3>No se encontraron artículos de inventario.</h3>
              <p>
                {normalizedFilter || queryText
                  ? "No hay artículos que coincidan con el criterio de búsqueda."
                  : "No hay artículos disponibles en Inventario para seleccionar."}
              </p>
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && (
            <div className="inventory-table-wrapper">
              <table className="inventory-selection-table" aria-label="Artículos de inventario">
                <thead>
                  <tr>
                    <th scope="col">Ítem de Inventario</th>
                    <th scope="col">Unidad</th>
                    <th scope="col" className="inventory-selection-table__action-col">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="inventory-selection-row">
                      <td className="inventory-selection-row__item">
                        <span className="inventory-selection-row__name">{item.name}</span>
                      </td>
                      <td className="inventory-selection-row__unit">{item.unit}</td>
                      <td className="inventory-selection-row__action">
                        <button
                          type="button"
                          className="button button--primary button--small"
                          onClick={() => onSelectItem?.(item)}
                        >
                          Asignar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
