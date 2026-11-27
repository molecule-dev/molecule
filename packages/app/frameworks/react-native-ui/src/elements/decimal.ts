/** Counts the decimal places in a number's shortest decimal representation, or zero for integers. */
export function decimalPlaces(value: number | bigint): number {
  const [coefficient = '', exponent = '0'] = String(value).split('e')
  return Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent))
}

/** Represents a decimal value in whole units of the supplied precision. */
export function scaled(value: number | bigint, places: number): bigint {
  const [coefficient = '', exponent = '0'] = String(value).split('e')
  const shift = places + Number(exponent) - (coefficient.split('.')[1]?.length ?? 0)
  return BigInt(coefficient.replace('.', '')) * 10n ** BigInt(shift)
}
