/**
 * Display formatters for AI model metadata.
 *
 * @module
 */

/**
 * Format a token count for display (e.g. `200000` -> `"200K"`, `1000000` -> `"1M"`).
 *
 * @param tokens - Token count.
 * @returns Formatted string.
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000
    return `${Number.isInteger(k) ? k : Math.round(k)}K`
  }
  return String(tokens)
}
