/**
 * A deeply reactive prop bag for the controlled-tool tests: assigning a field
 * re-renders the host, standing in for React's rerender-driven assertions. A
 * `.svelte.ts` module, so the Svelte compiler turns `$state` into a rune.
 *
 * @module
 */

/** The reactive holder the host reads its props from. */
export interface PropBag {
  /** The props the host renders with. */
  props: Record<string, unknown>
}

/**
 * Creates a `$state` prop bag; assigning a field re-renders the host.
 *
 * @param props - Initial props.
 * @returns The reactive bag.
 */
export function createPropBag(props: Record<string, unknown>): PropBag {
  const bag: PropBag = $state({ props })
  return bag
}
