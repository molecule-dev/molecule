/**
 * A deeply reactive prop bag for the Svelte parity host. A `.svelte.ts` module,
 * so the Svelte compiler turns `$state` into a rune after Vite strips the types.
 *
 * @module
 */

/** The reactive holder the host reads its props from. */
export interface PropBag {
  /** The props the host renders with; assigning a new object re-renders it. */
  props: Record<string, unknown>
}

/**
 * Creates a `$state` prop bag; assigning `bag.props` re-renders the host.
 *
 * @param props - Initial props.
 * @returns The reactive bag.
 */
export function createPropBag(props: Record<string, unknown>): PropBag {
  const bag = $state<PropBag>({ props })
  return bag
}
