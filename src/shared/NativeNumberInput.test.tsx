import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { NativeNumberInput } from "./NativeNumberInput";

function Quantity({ integer = false }: { integer?: boolean }) {
  const [value, setValue] = useState("1");
  return <label>Cantidad<NativeNumberInput id="quantity" value={value} required integer={integer}
    onChange={event => setValue(event.target.value)} errorMessage="Cantidad inválida." /></label>;
}

test.each(["0", "-1", "", "abc", "1e999"])("issue 84 flags invalid quantity %s before saving and clears the error after correction", value => {
  render(<Quantity />);
  const input = screen.getByLabelText("Cantidad") as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  expect(input.checkValidity()).toBe(false);
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Cantidad inválida.");
  fireEvent.change(input, { target: { value: "0.125" } });
  expect(input.checkValidity()).toBe(true);
  expect(input).toHaveValue(0.125);
  expect(input).toHaveAttribute("aria-invalid", "false");
  expect(screen.queryByText("Cantidad inválida.")).not.toBeInTheDocument();
});

test.each(["1.5", "0", "-1", "9007199254740992"])("issue 84 enforces the existing safe integer rule for rounds %s", value => {
  render(<Quantity integer />);
  const input = screen.getByLabelText("Cantidad") as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  expect(input.checkValidity()).toBe(false);
  expect(input).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(input, { target: { value: "3" } });
  expect(input.checkValidity()).toBe(true);
  expect(input).toHaveValue(3);
});
