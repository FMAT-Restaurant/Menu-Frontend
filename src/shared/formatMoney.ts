const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Presentation only. Keep the original numeric value for storage and requests. */
export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}
