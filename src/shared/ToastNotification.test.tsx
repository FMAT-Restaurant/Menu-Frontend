import { act, fireEvent, render, screen } from "@testing-library/react";
import { ToastNotification, useNotification } from "./ToastNotification";

function DemoNotifier() {
  const { notification, notify, clear } = useNotification(4000);
  return (
    <div>
      <button type="button" onClick={() => notify('Oferta "Rebanada" creada.')}>Crear</button>
      <button type="button" onClick={() => notify("Oferta activada.")}>Activar</button>
      <button type="button" onClick={clear}>Limpiar</button>
      <ToastNotification notification={notification} onDismiss={clear} />
    </div>
  );
}

describe("ToastNotification", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("replaces previous notification instead of stacking and supports manual dismiss", () => {
    render(<DemoNotifier />);

    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(screen.getByText('Oferta "Rebanada" creada.')).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    expect(screen.queryByText('Oferta "Rebanada" creada.')).not.toBeInTheDocument();
    expect(screen.getByText("Oferta activada.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar notificación" }));
    expect(screen.queryByText("Oferta activada.")).not.toBeInTheDocument();
  });

  test("auto-dismisses after timeout", () => {
    jest.useFakeTimers();
    render(<DemoNotifier />);

    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(screen.getByText('Oferta "Rebanada" creada.')).toBeVisible();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Oferta "Rebanada" creada.')).not.toBeInTheDocument();
  });
});
