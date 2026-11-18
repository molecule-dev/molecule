/**
 * A reactive prop bag for the policy tests: a `.svelte.ts` module, so the
 * Svelte compiler turns `$state` into a rune after Vite strips the types.
 * Assigning a key re-renders the host that spreads it, which is how a test
 * hands the component new props (React's `rerender` with new props).
 *
 * @module
 */

/**
 * Creates a deeply reactive prop bag.
 *
 * @param initial - The props the component mounts with.
 * @returns The reactive bag; assigning a key re-renders the host.
 */
export function createPropBag(initial: Record<string, unknown>): Record<string, unknown> {
  const bag = $state<Record<string, unknown>>(initial)
  return bag
}
