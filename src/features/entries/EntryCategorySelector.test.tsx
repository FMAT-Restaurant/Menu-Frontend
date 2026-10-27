import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EntryCategorySelector } from "./EntryCategorySelector";

function renderSelector(onSubmit = jest.fn()) {
  function Harness() {
    const [selected, setSelected] = useState<string[]>([]);
    return <>
      <form onSubmit={event => { event.preventDefault(); onSubmit(selected); }}>
        <EntryCategorySelector
          categories={[{ id: "main", name: "Platos fuertes" }]}
          selected={selected}
          loading={false}
          error=""
          disabled={false}
          continuing={false}
          onChange={setSelected}
          onRetry={jest.fn()}
          onContinue={jest.fn()}
        />
        <button type="submit">Guardar entrada</button>
      </form>
      <button type="button">Acción exterior</button>
    </>;
  }
  render(<Harness />);
  return onSubmit;
}

test("an outside submit keeps the panel stable until click and submits the selected categories once", () => {
  const onSubmit = renderSelector();
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Platos fuertes" }));
  const save = screen.getByRole("button", { name: "Guardar entrada" });
  fireEvent.pointerDown(save);
  expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toBeVisible();
  fireEvent.pointerUp(save);
  expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toBeVisible();
  fireEvent.click(save);
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith(["main"]);
  expect(screen.queryByRole("searchbox", { name: "Buscar categorías" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1 categoría seleccionada" })).toBeVisible();
});

test("clicking outside closes the panel while an inside selection keeps it open", () => {
  renderSelector();
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Platos fuertes" }));
  expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Acción exterior" }));
  expect(screen.queryByRole("searchbox", { name: "Buscar categorías" })).not.toBeInTheDocument();
});

test("Escape closes the panel and returns keyboard focus to its current selection trigger", () => {
  renderSelector();
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Platos fuertes" }));
  fireEvent.keyDown(screen.getByRole("searchbox", { name: "Buscar categorías" }), { key: "Escape" });
  expect(screen.queryByRole("searchbox", { name: "Buscar categorías" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1 categoría seleccionada" })).toHaveFocus();
});
