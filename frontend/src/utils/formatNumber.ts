const MAX_SIGNIFICANT_DIGITS = 12

export function formatNumber(value: number): string {
  return String(Number(value.toPrecision(MAX_SIGNIFICANT_DIGITS)))
}
