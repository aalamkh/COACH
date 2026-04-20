export function isBillingError(error: string): boolean {
  const m = error.toLowerCase();
  return (
    m.includes("credit balance") ||
    m.includes("billing") ||
    m.includes("insufficient") ||
    m.includes("quota")
  );
}
