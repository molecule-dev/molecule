/**
 * The chapter list's pure helpers — framework-free, and identical to
 * `@molecule/app-feature-chapter-list-react`'s so both packages agree on every
 * derivation.
 *
 * @module
 */

import type { Chapter } from './types.js'

/**
 * Format a number of seconds as `m:ss` or `h:mm:ss` (or `0:00` for
 * non-finite / negative input). Used for chapter timestamps.
 *
 * @param seconds - Seconds to format.
 * @returns The formatted timestamp string.
 */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Find the index of the active chapter for a given `currentTime`.
 * Returns the index of the last chapter whose `startTime` is `<=
 * currentTime`. Returns `-1` when `chapters` is empty or `currentTime`
 * is before the first chapter.
 *
 * @param chapters - Chapters in start-time order.
 * @param currentTime - Current playback time in seconds.
 * @returns The active chapter index, or `-1`.
 */
export function findActiveChapterIndex(chapters: Chapter[], currentTime: number): number {
  let active = -1
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i]!.startTime <= currentTime) active = i
    else break
  }
  return active
}
