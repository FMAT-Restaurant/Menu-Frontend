import { fireEvent, render, screen } from "@testing-library/react";
import { computePaginationNumbers, EntryPagination } from "./CatalogResults";

describe("Catalog pagination algorithm (Section 3.5.4 / C08)", () => {
  test("returns empty array for 0 and 1 pages", () => {
    expect(computePaginationNumbers(1, 0)).toEqual([]);
    expect(computePaginationNumbers(1, 1)).toEqual([]);
  });

  test("shows all pages for 2 to 5 pages without repetition or ellipsis", () => {
    expect(computePaginationNumbers(1, 2)).toEqual([1, 2]);
    expect(computePaginationNumbers(2, 2)).toEqual([1, 2]);
    expect(computePaginationNumbers(2, 3)).toEqual([1, 2, 3]);
    expect(computePaginationNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test("calculates exactly 5 pages with 3 centered/shifted intermediate pages when totalPages > 5", () => {
    // totalPages = 6
    expect(computePaginationNumbers(1, 6)).toEqual([1, 2, 3, 4, 6]);
    expect(computePaginationNumbers(2, 6)).toEqual([1, 2, 3, 4, 6]);
    expect(computePaginationNumbers(3, 6)).toEqual([1, 2, 3, 4, 6]);
    expect(computePaginationNumbers(4, 6)).toEqual([1, 3, 4, 5, 6]);
    expect(computePaginationNumbers(5, 6)).toEqual([1, 3, 4, 5, 6]);
    expect(computePaginationNumbers(6, 6)).toEqual([1, 3, 4, 5, 6]);

    // totalPages = 100: start, center, end
    expect(computePaginationNumbers(1, 100)).toEqual([1, 2, 3, 4, 100]);
    expect(computePaginationNumbers(50, 100)).toEqual([1, 49, 50, 51, 100]);
    expect(computePaginationNumbers(99, 100)).toEqual([1, 97, 98, 99, 100]);
    expect(computePaginationNumbers(100, 100)).toEqual([1, 97, 98, 99, 100]);
  });

  test("handles huge totalPages in O(1) memory without creating array of total length", () => {
    const huge = 1_000_000;
    const result = computePaginationNumbers(500_000, huge);
    expect(result).toEqual([1, 499_999, 500_000, 500_001, 1_000_000]);
  });

  test("renders EntryPagination DOM with ellipses and handles clicks", () => {
    const onPage = jest.fn();
    const { rerender } = render(<EntryPagination page={1} totalPages={1} disabled={false} onPage={onPage} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    rerender(<EntryPagination page={1} totalPages={100} disabled={false} onPage={onPage} />);
    expect(screen.getByRole("navigation")).toBeVisible();
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente página" })).toBeEnabled();

    // Exactly 5 numbered buttons
    const numberedButtons = screen.getAllByRole("button").filter((btn) => /^\d+$/.test(btn.textContent ?? ""));
    expect(numberedButtons).toHaveLength(5);
    expect(numberedButtons.map((btn) => btn.textContent)).toEqual(["1", "2", "3", "4", "100"]);
    expect(numberedButtons[0]).toHaveAttribute("aria-current", "page");

    // Ellipsis rendered between 4 and 100
    const ellipses = document.querySelectorAll(".pagination__ellipsis");
    expect(ellipses).toHaveLength(1);

    fireEvent.click(numberedButtons[1]);
    expect(onPage).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente página" }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
});
