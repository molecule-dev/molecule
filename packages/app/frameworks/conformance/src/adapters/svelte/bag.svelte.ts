/**
 * A deeply reactive prop bag for the Svelte parity host, and the holder of a case's children and
 * slots. A `.svelte.ts` module, so the Svelte compiler turns `$state` into a rune after Vite
 * strips the types.
 *
 * @module
 */

import type { ChangingLists, ChildLists } from '../../ui/index.js'

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

/** The reactive holder of a case's children and slots, for a case with a `children` step. */
export interface ChildListsBag {
  /** The lists the host renders now; assigning new lists re-renders what reads them. */
  lists: ChildLists
  /** The lists a step replaces: the host renders only these as lists that change. */
  readonly changing: ChangingLists
}

/**
 * Creates the holder of a case's children and slots. The lists are replaced whole by each step,
 * never changed in place, so they are held raw (not deeply proxied): a node reaches a component
 * as the plain object the case wrote.
 *
 * @param lists - The lists at mount.
 * @param changing - The lists a step replaces.
 * @returns The reactive holder.
 */
export function createChildListsBag(lists: ChildLists, changing: ChangingLists): ChildListsBag {
  let current = $state.raw(lists)
  return {
    changing,
    get lists() {
      return current
    },
    set lists(next: ChildLists) {
      current = next
    },
  }
}
