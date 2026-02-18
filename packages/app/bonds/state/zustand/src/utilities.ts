/**
 * Zustand utility functions.
 *
 * @module
 */

/**
 * Creates a memoized selector that only recomputes when the selected value changes
 * (determined by the equality function, defaulting to `Object.is`).
 * @param selector - Function that extracts a derived value from state.
 * @param equalityFn - Equality comparator for the derived value; defaults to `Object.is`.
 * @returns A memoized selector function that returns the cached result when the derived value is equal.
 */
export const createSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn: (a: R, b: R) => boolean = Object.is,
): ((state: T) => R) => {
  let lastState: T | undefined
  let lastResult: R | undefined

  return (state: T): R => {
    if (lastState === undefined || state !== lastState) {
      const result = selector(state)
      if (lastResult === undefined || !equalityFn(result, lastResult)) {
        lastResult = result
      }
      lastState = state
    }
    return lastResult as R
  }
}
