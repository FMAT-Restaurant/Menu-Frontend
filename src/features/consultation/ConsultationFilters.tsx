import type { CatalogViewCategories } from "../../application/catalog";
import { SearchField } from "../../shared/SearchField";

export interface ConsultationFiltersProps {
  search: string;
  onSearchChange(value: string): void;
  onSearch(): void;
  categories: CatalogViewCategories | null;
  categoryId: string;
  onCategoryChange(categoryId: string): void;
  hasFilters: boolean;
  activeCount: number;
  onClear(): void;
}

export function ConsultationFilters(props: Readonly<ConsultationFiltersProps>) {
  const activeSuffix = props.activeCount === 1 ? "activo" : "activos";

  return (
    <section className="consultation-filters" aria-label="Filtros del catálogo">
      <div className="consultation-filters__header">
        <p className="consultation-filters__label">
          Filtros
          {props.activeCount > 0 && (
            <span className="consultation-filters__count">
              {props.activeCount} {activeSuffix}
            </span>
          )}
        </p>
        <button
          className="button button--secondary consultation-filters__clear"
          type="button"
          onClick={props.onClear}
          disabled={!props.hasFilters}
        >
          Limpiar filtros
        </button>
      </div>
      <SearchField
        id="consultation-search"
        label="Buscar en el menú"
        placeholder="Nombre, descripción o categoría"
        value={props.search}
        onChange={props.onSearchChange}
        onSearch={props.onSearch}
      />
      <div className="select-field">
        <label htmlFor="consultation-category">Categoría</label>
        <select
          id="consultation-category"
          value={props.categoryId}
          onChange={(event) => props.onCategoryChange(event.target.value)}
        >
          <option value="">Todas las categorías</option>
          {props.categories?.data.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.entryCount})
            </option>
          ))}
          <option value="__uncategorized__">
            Sin categoría ({props.categories?.uncategorized.entryCount ?? 0})
          </option>
        </select>
      </div>
    </section>
  );
}
