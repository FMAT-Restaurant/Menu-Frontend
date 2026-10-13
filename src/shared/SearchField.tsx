import type { SubmitEvent } from "react";

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
        <span aria-hidden="true">⌕</span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <button type="submit" className="button button--secondary">Buscar</button>
      </div>
    </form>
  );
}

