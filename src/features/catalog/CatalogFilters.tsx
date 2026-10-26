import type { MenuCategory, EntryStatus } from "../../application/catalog";
import { SearchField } from "../../shared/SearchField";

export interface CatalogFiltersProps {
  search: string;
  onSearchChange(value: string): void;
  onSearch(): void;
  advancedCount: number;
  categories: MenuCategory[];
  categoryId: string;
  status: EntryStatus | "";
  hasFilters: boolean;
  onFilterChange: {
    (name: "categoryId", value: string): void;
    (name: "status", value: EntryStatus | ""): void;
  };
  onClear(): void;
}

export function CatalogFilters(props: Readonly<CatalogFiltersProps>) {
  return (
    <section className="filters" aria-label="Filtros de entradas">
      <div className="filters__header">
        <p className="filters__label">Filtros{props.advancedCount ? <span className="filters__count">{props.advancedCount} activos</span> : null}</p>
        <button className="button button--secondary filters__clear" type="button" onClick={props.onClear} disabled={!props.hasFilters}>Limpiar filtros</button>
      </div>
      <SearchField value={props.search} onChange={props.onSearchChange} onSearch={props.onSearch} />
      <div className="filters__advanced">
        <div className="select-field">
          <label htmlFor="category-filter">Categoría</label>
          <select id="category-filter" value={props.categoryId} onChange={(event) => props.onFilterChange("categoryId", event.target.value)}>
            <option value="">Todas las categorías</option>
            <option value="__uncategorized__">Sin categoría</option>
            {props.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div className="select-field">
          <label htmlFor="status-filter">Estado administrativo</label>
          <select id="status-filter" value={props.status} onChange={(event) => props.onFilterChange("status", event.target.value as EntryStatus | "")}>
            <option value="">Todos los estados</option><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option><option value="ARCHIVED">Archivada</option>
          </select>
        </div>
      </div>
    </section>
  );
}
