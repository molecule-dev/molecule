/**
 * Internal helpers shared across ranking algorithms. Pure functions,
 * no I/O, no global state.
 */

/**
 * Normalises a `Date | string | number` to epoch milliseconds.
 *
 * @param value - Date instance, ISO-8601 string, or epoch ms number.
 * @returns Epoch milliseconds.
 * @throws {TypeError} If the value cannot be parsed into a finite timestamp.
 */
export const toEpochMs = (value: Date | string | number): number => {
  const ms =
    value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value)

  if (!Number.isFinite(ms)) {
    throw new TypeError(`rank-score: invalid timestamp: ${String(value)}`)
  }

  return ms
}

/**
 * Hours elapsed between two timestamps. Result may be negative if `then`
 * is in the future relative to `now`.
 *
 * @param then - The earlier (item creation) timestamp, ms.
 * @param now - The reference timestamp, ms.
 * @returns Elapsed hours as a float.
 */
export const hoursBetween = (then: number, now: number): number => {
  return (now - then) / 3_600_000
}

/**
 * Sign of `n` — `-1`, `0`, or `1`. `Math.sign` returns `-0`/`0` ambiguously
 * across engines for some inputs; this helper coerces to `0`.
 *
 * @param n - Any finite number.
 * @returns `-1`, `0`, or `1`.
 */
export const sign = (n: number): -1 | 0 | 1 => {
  if (n > 0) return 1
  if (n < 0) return -1
  return 0
}
