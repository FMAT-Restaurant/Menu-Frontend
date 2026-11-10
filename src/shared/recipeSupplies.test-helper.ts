import { fireEvent, screen, waitFor, within } from "@testing-library/react";

const SEARCH_NAME = "Buscar insumo para agregar";

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** Opción del buscador de insumos cuyo nombre es exactamente `name` (el texto sigue con " · unidad"). */
export function supplyOptionName(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)} ·`);
}

export function supplySearch(container: HTMLElement = document.body): HTMLElement {
  return within(container).getByRole("combobox", { name: SEARCH_NAME });
}

/** Escribe en el buscador, espera el resultado y lo elige, como haría el usuario. */
export async function addSupply(name: string, options: { query?: string; container?: HTMLElement } = {}): Promise<void> {
  const container = options.container ?? document.body;
  fireEvent.change(supplySearch(container), { target: { value: options.query ?? name } });
  const option = await within(container).findByRole("option", { name: supplyOptionName(name) });
  fireEvent.click(option);
  await within(container).findByRole("spinbutton", { name: `Cantidad de ${name}` });
}

/** Espera a que termine la carga del inventario del formulario de receta. */
export async function waitForInventory(): Promise<void> {
  await screen.findByRole("combobox", { name: SEARCH_NAME });
  await waitFor(() => expect(screen.queryByText("Cargando insumos…")).not.toBeInTheDocument());
}
