/**
 * A `$state`-backed props object for the Svelte `RelativeTime` tick test:
 * assigning a key re-renders the mounted component through the reactive props
 * it read, the port's way of React's `rerender` with new props.
 *
 * @module
 */

/**
 * Wraps a props object in `$state`, so a later assignment updates the mounted
 * component (React's `rerender`).
 *
 * @param initial - The initial props.
 * @returns The same props, reactive.
 */
export function reactiveProps<T extends Record<string, unknown>>(initial: T): T {
  const props = $state(initial)
  return props
}
