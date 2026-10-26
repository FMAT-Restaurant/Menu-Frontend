import type { SubmitEvent } from "react";
import { Icon } from "./Icon";

interface SearchFieldProps {
  value: string;
  onChange(value: string): void;
  onSearch(): void;
  id?: string;
  label?: string;
  placeholder?: string;
}

export function SearchField({
  value,
  onChange,
  onSearch,
  id = "entry-search",
  label = "Buscar entradas",
  placeholder = "Nombre, descripción o categoría",
}: Readonly<SearchFieldProps>) {
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form role="search" className="search-field" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <div className="search-field__control">
        <span className="search-field__icon"><Icon name="search" /></span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        {value && (
          <button type="button" className="search-field__clear" aria-label="Limpiar búsqueda" onClick={() => onChange("")}>
            <Icon name="close" />
          </button>
        )}
        <button type="submit" className="button button--secondary" aria-label="Buscar ahora">Buscar</button>
      </div>
    </form>
  );
}

