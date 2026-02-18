/**
 * Utility functions for state management.
 *
 * @module
 */

/**
 * Performs a shallow equality comparison between two values.
 * Returns `true` if both values have the same top-level keys
 * with identical values (using `Object.is`).
 *
 * @param a - First value to compare.
 * @param b - Second value to compare.
 * @returns `true` if the values are shallowly equal.
 */
export const shallowEqual = <T>(a: T, b: T): boolean => {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a === null || b === null) return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false
    }
  }

  return true
}

/**
 * Simplified produce helper for immutable state updates.
 * Creates a shallow copy, applies the recipe, and returns the result.
 *
 * @param state - The current state object.
 * @param recipe - A function that mutates the draft copy.
 * @returns A new state object with the recipe's mutations applied.
 */
export const produce = <T extends object>(state: T, recipe: (draft: T) => void): T => {
  const draft = { ...state }
  recipe(draft)
  return draft
}
