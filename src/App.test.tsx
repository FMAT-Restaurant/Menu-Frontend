import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("Menu frontend", () => {
  test("shows the menu entry point", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Menú", level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver menú" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });
});
