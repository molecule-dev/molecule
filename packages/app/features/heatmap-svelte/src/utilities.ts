/**
 * Plain helpers of the Svelte heatmap: the quantile bucketing the component
 * shares with `@molecule/app-heatmap-react`.
 *
 * @module
 */

/**
 * Compute four quantile thresholds from a numeric distribution.
 * Returns thresholds that split values into 5 ascending buckets.
 *
 * @param values - All non-zero values from the data set.
 * @returns Four ascending thresholds.
 */
export function computeQuantileThresholds(values: number[]): [number, number, number, number] {
  if (values.length === 0) return [1, 1, 1, 1]
  const sorted = [...values].sort((a, b) => a - b)
  const q = (p: number): number => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))
    return sorted[idx] as number
  }
  return [q(0.2), q(0.4), q(0.6), q(0.8)]
}

/**
 * Bucket a numeric value into a 0..4 index given quantile thresholds.
 * Bucket 0 always represents zero / no activity.
 *
 * @param value - Value to bucket.
 * @param thresholds - Four ascending quantile thresholds.
 * @returns Integer in `[0, 4]`.
 */
export function bucketValue(
  value: number,
  thresholds: readonly [number, number, number, number],
): number {
  if (value <= 0) return 0
  if (value <= thresholds[0]) return 1
  if (value <= thresholds[1]) return 2
  if (value <= thresholds[2]) return 3
  return 4
}
