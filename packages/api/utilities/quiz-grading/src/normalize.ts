/**
 * String-normalisation + edit-distance helpers shared across the
 * text-based graders.
 *
 * @module
 */

import type { TextMatchOptions } from './types.js'

/**
 * Apply the requested normalisation steps to `value`. All flags default
 * to `true` (forgiving comparison).
 *
 * @param value - Raw string from the user / question payload.
 * @param options - Override flags. Omitted flags default to `true`.
 * @returns The normalised string.
 */
export const normalizeText = (value: string, options?: TextMatchOptions): string => {
  const {
    caseInsensitive = true,
    trim = true,
    collapseWhitespace = true,
    accentFold = true,
  } = options ?? {}

  let result = value
  if (trim) {
    result = result.trim()
  }
  if (collapseWhitespace) {
    result = result.replace(/\s+/g, ' ')
  }
  if (caseInsensitive) {
    result = result.toLowerCase()
  }
  if (accentFold) {
    // NFD splits accented chars into base + combining marks; strip the marks.
    // ̀-ͯ covers the "Combining Diacritical Marks" Unicode block.
    result = result.normalize('NFD').replace(/[̀-ͯ]/g, '')
  }
  return result
}

/**
 * Levenshtein edit distance between two strings.
 *
 * Used by the `type-answer` grader for fuzzy matching. Implements the
 * standard two-row dynamic-programming algorithm — O(n*m) time, O(min(n,m))
 * space.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns Number of single-character insertions, deletions, or
 *   substitutions required to turn `a` into `b`.
 */
export const editDistance = (a: string, b: string): number => {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Ensure `b` is the shorter string so the working row stays small.
  if (a.length < b.length) {
    const tmp = a
    a = b
    b = tmp
  }

  let prev = new Array<number>(b.length + 1)
  let curr = new Array<number>(b.length + 1)

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      const deletion = prev[j] + 1
      const insertion = curr[j - 1] + 1
      const substitution = prev[j - 1] + cost
      let min = deletion
      if (insertion < min) min = insertion
      if (substitution < min) min = substitution
      curr[j] = min
    }
    const swap = prev
    prev = curr
    curr = swap
  }

  return prev[b.length]
}
