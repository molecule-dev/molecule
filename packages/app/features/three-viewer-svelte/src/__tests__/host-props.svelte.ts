/**
 * Reactive props holder for the unit tests: Svelte 5 runes outside a
 * component, so a test can change a mounted component's props.
 *
 * @module
 */

/**
 * Builds a reactive props object.
 *
 * @template T - The props shape.
 * @param initial - The initial props.
 * @returns A deeply reactive props object.
 */
export function reactiveProps<T extends object>(initial: T): T {
  const state = $state(initial)
  return state
}
