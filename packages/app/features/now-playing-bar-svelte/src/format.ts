/**
 * Pure helpers of the Svelte now-playing bar.
 *
 * @module
 */

/**
 * Format a number of seconds as `m:ss` (or `0:00` for non-finite input).
 *
 * @param seconds - Seconds to format.
 * @returns The formatted `m:ss` string.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
