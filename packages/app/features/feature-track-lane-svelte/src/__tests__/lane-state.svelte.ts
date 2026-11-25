/**
 * Svelte state for the track-lane tests: `$state` is a rune, which Svelte
 * accepts only in a Svelte module.
 *
 * @module
 */

/**
 * Holds an object as Svelte state, so replacing its properties re-renders a
 * component that reads them as props.
 *
 * @param initial - The object.
 * @returns The same object, as state.
 */
export function laneState<T extends object>(initial: T): T {
  const state = $state(initial)
  return state
}
