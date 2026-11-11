import { expect, type Locator, type Page } from "@playwright/test";

/** Busca un insumo en el formulario de receta y elige el resultado, como haría el usuario. */
export async function addSupply(scope: Page | Locator, name: string, query = name): Promise<void> {
  await scope.getByRole("combobox", { name: "Buscar insumo para agregar" }).fill(query);
  // El texto de cada opción es "Nombre · unidad", así que "Nombre ·" no confunde nombres que comparten prefijo.
  await scope.getByRole("option", { name: `${name} ·` }).click();
  await expect(scope.getByLabel(`Cantidad de ${name}`, { exact: true })).toBeFocused();
}
