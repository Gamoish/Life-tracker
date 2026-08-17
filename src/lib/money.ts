/**
 * Currency formatting for the expense tracker. Hardcoded to INR — this app
 * has no multi-currency concept (one set of accounts, one household), and
 * the sample accounts in the spec ("HDFC Savings") are India-flavoured.
 * Flagged in the report as a call worth confirming if that's wrong.
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
