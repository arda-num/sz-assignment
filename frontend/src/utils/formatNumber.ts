const MAX_SIGNIFICANT_DIGITS = 12

export function formatNumber(value: number): string {
  const rounded = value.toPrecision(MAX_SIGNIFICANT_DIGITS)
  if (!rounded.includes('e')) {
    return String(Number(rounded))
  }

  // Keep exponent notation: Number() would expand it back into digits that were rounded away.
  const [mantissa = '', exponent = ''] = rounded.split('e')
  return `${String(Number(mantissa))}e${exponent}`
}
