/**
 * A reactive prop bag for the SettingsContainer tests: a `.svelte.ts` module,
 * so the Svelte compiler turns `$state` into a rune. Assigning a key
 * re-renders the host that receives it, which is how a test hands the
 * container new props (React's `rerender` with new props).
 *
 * @module
 */

/**
 * Creates a deeply reactive prop bag.
 *
 * @param initial - The props the host mounts with.
 * @returns The reactive bag; assigning a key re-renders the host.
 */
export function createPropBag(initial: Record<string, unknown>): Record<string, unknown> {
  const bag = $state<Record<string, unknown>>(initial)
  return bag
}
