import { formatSupplyUnit } from "./formatUnit";

describe("formatSupplyUnit", () => {
  test("translates English inventory units into Spanish", () => {
    expect(formatSupplyUnit("unit")).toBe("unidad");
    expect(formatSupplyUnit("unit", 1)).toBe("unidad");
    expect(formatSupplyUnit("unit", 3)).toBe("unidades");
    expect(formatSupplyUnit("piece", 2)).toBe("piezas");
    expect(formatSupplyUnit("kilogram")).toBe("kg");
    expect(formatSupplyUnit("liter")).toBe("L");
    expect(formatSupplyUnit("g")).toBe("g");
  });
});
