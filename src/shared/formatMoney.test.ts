import { formatMoney } from "./formatMoney";

describe("formatMoney", () => {
  test.each([
    [145, "MXN\u00a0145.00"],
    [145.5, "MXN\u00a0145.50"],
    [123456789.5, "MXN\u00a0123,456,789.50"],
    [0, "MXN\u00a00.00"],
    [145.125, "MXN\u00a0145.13"],
  ])("presents %s in MXN with es-MX separators and two decimals", (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });
});
