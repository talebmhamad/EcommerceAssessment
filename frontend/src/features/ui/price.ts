const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency"
});

export function formatCurrency(price: string): string {
  return currencyFormatter.format(Number(price));
}
