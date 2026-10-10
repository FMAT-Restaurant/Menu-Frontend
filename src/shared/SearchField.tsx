import type { SubmitEvent } from "react";

interface SearchFieldProps {
  value: string;
  onChange(value: string): void;
  onSearch(): void;
}

export function SearchField({ value, onChange, onSearch }: Readonly<SearchFieldProps>) {
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form role="search" className="search-field" onSubmit={submit}>
      <label htmlFor="entry-search">Buscar entradas</label>
      <div className="search-field__control">
        <span aria-hidden="true">⌕</span>
        <input
          id="entry-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nombre, descripción o categoría"
        />
        <button type="submit" className="button button--secondary">Buscar</button>
      </div>
    </form>
  );
}
