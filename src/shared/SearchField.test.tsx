import { fireEvent, render, screen } from "@testing-library/react";
import { SearchField } from "./SearchField";

describe("SearchField", () => {
  test("keeps its input and submit action named while the search artwork stays decorative", () => {
    const onSearch = jest.fn();
    const onChange = jest.fn();
    const { container } = render(<SearchField value="pan" onChange={onChange} onSearch={onSearch} />);

    const input = screen.getByRole("searchbox", { name: "Buscar entradas" });
    expect(input).toHaveValue("pan");
    fireEvent.change(input, { target: { value: "sopa" } });
    expect(onChange).toHaveBeenCalledWith("sopa");
    fireEvent.click(screen.getByRole("button", { name: "Buscar ahora" }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
