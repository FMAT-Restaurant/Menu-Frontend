import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { InventoryItem, Page } from "../../application/catalog";
import { InventoryPage, type InventoryRepository } from "./InventoryPage";

const mockInventoryItems: InventoryItem[] = [
  { id: "inv-01", name: "Carne Molida Res 80/20", unit: "g" },
  { id: "inv-02", name: "Pan para Hamburguesa", unit: "pza" },
  { id: "inv-23", name: "Refresco de Cola 355ml", unit: "pza" },
  { id: "inv-07", name: "Salsa de Tomate", unit: "ml" },
];

function createMockRepository(items: InventoryItem[] = mockInventoryItems): jest.Mocked<InventoryRepository> {
  return {
    listInventoryItems: jest.fn().mockResolvedValue({
      data: items,
      meta: { page: 1, pageSize: 50, total: items.length, totalPages: 1 },
    } as Page<InventoryItem>),
  };
}

describe("InventoryPage — V7 Seleccionar artículo de inventario", () => {
  test("renders C19 header, C23 search field, C28 selection table and C29 rows with item, authoritative unit and assign action", async () => {
    const repository = createMockRepository();
    const onSelectItem = jest.fn();
    const onClose = jest.fn();

    render(
      <InventoryPage
        repository={repository}
        context="option"
        onSelectItem={onSelectItem}
        onClose={onClose}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Artículos de inventario — elegir opción", level: 1 })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "✕ Cancelar" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Buscar insumo" })).toBeVisible();

    const table = await screen.findByRole("table", { name: "Artículos de inventario" });
    expect(table).toBeVisible();

    const carneRow = screen.getByRole("row", { name: /Carne Molida Res 80\/20/i });
    expect(within(carneRow).getByText("Carne Molida Res 80/20")).toBeVisible();
    expect(within(carneRow).getByText("g")).toBeVisible();

    const salsaRow = screen.getByRole("row", { name: /Salsa de Tomate/i });
    expect(within(salsaRow).getByText("Salsa de Tomate")).toBeVisible();
    expect(within(salsaRow).getByText("ml")).toBeVisible();

    fireEvent.click(within(carneRow).getByRole("button", { name: "Asignar" }));
    expect(onSelectItem).toHaveBeenCalledWith(mockInventoryItems[0]);

    fireEvent.click(screen.getByRole("button", { name: "✕ Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("filters inventory items by search query and queries GET /inventory/items on submit", async () => {
    const repository = createMockRepository();
    render(<InventoryPage repository={repository} onSelectItem={jest.fn()} onClose={jest.fn()} />);

    await screen.findByRole("table", { name: "Artículos de inventario" });

    const searchbox = screen.getByRole("searchbox", { name: "Buscar insumo" });
    fireEvent.change(searchbox, { target: { value: "Refresco" } });

    // Client-side filter immediately narrows visible items
    expect(screen.getByText("Refresco de Cola 355ml")).toBeVisible();
    expect(screen.queryByText("Carne Molida Res 80/20")).not.toBeInTheDocument();

    // Submitting search triggers repository query with q parameter
    fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));

    await waitFor(() => {
      expect(repository.listInventoryItems).toHaveBeenCalledWith(
        expect.objectContaining({ q: "Refresco", page: 1, pageSize: 50 }),
        expect.any(AbortSignal)
      );
    });
  });

  test("renders ingredient context subtitle and empty state when search has no matches", async () => {
    const repository = createMockRepository();
    render(
      <InventoryPage
        repository={repository}
        context="ingredient"
        onSelectItem={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(
      screen.getByText(
        "Selecciona un artículo del catálogo de Inventario para la línea de ingrediente."
      )
    ).toBeVisible();

    await screen.findByRole("table", { name: "Artículos de inventario" });

    const searchbox = screen.getByRole("searchbox", { name: "Buscar insumo" });
    fireEvent.change(searchbox, { target: { value: "InexistenteXYZ" } });

    expect(screen.getByText("No se encontraron artículos de inventario.")).toBeVisible();
    expect(
      screen.getByText("No hay artículos que coincidan con el criterio de búsqueda.")
    ).toBeVisible();
  });

  test("renders empty state when inventory catalog has no items", async () => {
    const repository = createMockRepository([]);
    render(<InventoryPage repository={repository} />);

    expect(await screen.findByText("No se encontraron artículos de inventario.")).toBeVisible();
    expect(
      screen.getByText("No hay artículos disponibles en Inventario para seleccionar.")
    ).toBeVisible();
  });

  test("displays error message when loading fails and retries on button click", async () => {
    const repository = createMockRepository();
    repository.listInventoryItems.mockRejectedValueOnce(new Error("Network error"));

    render(<InventoryPage repository={repository} />);

    expect(
      await screen.findByText("No se pudieron cargar los artículos de inventario.")
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("table", { name: "Artículos de inventario" })).toBeVisible();
    expect(screen.getByText("Carne Molida Res 80/20")).toBeVisible();
  });
});
