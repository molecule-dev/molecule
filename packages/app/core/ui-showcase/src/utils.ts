/**
 * Utilities for generating prop combinations from a showcase matrix.
 *
 * @module
 */

/**
 * Generate all combinations from a prop matrix.
 *
 * Given `{ variant: ['solid', 'outline'], color: ['primary', 'error'] }`,
 * returns:
 * ```
 * [
 *   { variant: 'solid', color: 'primary' },
 *   { variant: 'solid', color: 'error' },
 *   { variant: 'outline', color: 'primary' },
 *   { variant: 'outline', color: 'error' },
 * ]
 * ```
 *
 * @param matrix - Object mapping prop names to arrays of possible values.
 * @returns Array of objects, one per combination.
 */
export function generateCombinations(matrix: Record<string, unknown[]>): Record<string, unknown>[] {
  const keys = Object.keys(matrix)
  if (keys.length === 0) return [{}]

  const result: Record<string, unknown>[] = []

  /**
   * Recursively build combinations by iterating through each matrix key.
   *
   * @param index - Current key index in the keys array.
   * @param current - Accumulated prop combination so far.
   */
  function recurse(index: number, current: Record<string, unknown>): void {
    if (index === keys.length) {
      result.push({ ...current })
      return
    }
    const key = keys[index]
    for (const value of matrix[key]) {
      current[key] = value
      recurse(index + 1, current)
    }
  }

  recurse(0, {})
  return result
}
