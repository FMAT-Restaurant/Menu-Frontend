import type { MenuCategory, EntryStatus } from "../../application/catalog";
import { SearchField } from "../../shared/SearchField";

export interface CatalogFiltersProps {
  search: string;
  onSearchChange(value: string): void;
  onSearch(): void;
  advancedOpen: boolean;
  onToggleAdvanced(): void;
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
      <SearchField value={props.search} onChange={props.onSearchChange} onSearch={props.onSearch} />
      <button className="button button--secondary filters__toggle" type="button" aria-expanded={props.advancedOpen} aria-controls="advanced-filters" onClick={props.onToggleAdvanced}>
        Filtros{props.advancedCount ? ` (${props.advancedCount} activos)` : ""}
      </button>
      <div id="advanced-filters" className={`filters__advanced ${props.advancedOpen ? "filters__advanced--open" : ""}`}>
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
      <button className="button button--quiet filters__clear" type="button" onClick={props.onClear} disabled={!props.hasFilters}>Limpiar filtros</button>
    </section>
  );
}
