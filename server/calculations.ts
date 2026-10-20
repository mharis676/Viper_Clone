// Shared by the client and API so previews and persisted amounts use the same rules.
export const money = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export function calculateLine<
  T extends {
    quantity: number;
    price: number;
    discountPercent: number;
    taxRate: number;
  },
>(line: T) {
  const discountAmount = money(
    (line.quantity * line.price * line.discountPercent) / 100,
  );
  const taxable = money(line.quantity * line.price - discountAmount);
  const taxAmount = money((taxable * line.taxRate) / 100);
  return {
    ...line,
    discountAmount,
    taxAmount,
    total: money(taxable + taxAmount),
  };
}
export function calculateTotals(
  lines: {
    quantity: number;
    price: number;
    discountAmount: number;
    taxAmount: number;
  }[],
  interstate = false,
) {
  const subtotal = money(lines.reduce((s, l) => s + l.quantity * l.price, 0));
  const discountTotal = money(lines.reduce((s, l) => s + l.discountAmount, 0));
  const taxTotal = money(lines.reduce((s, l) => s + l.taxAmount, 0));
  const cgst = interstate ? 0 : money(taxTotal / 2);
  return {
    subtotal,
    discountTotal,
    taxTotal,
    cgst,
    sgst: interstate ? 0 : money(taxTotal - cgst),
    igst: interstate ? taxTotal : 0,
    total: money(subtotal - discountTotal + taxTotal),
  };
}
