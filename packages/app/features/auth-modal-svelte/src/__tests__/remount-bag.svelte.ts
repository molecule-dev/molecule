/**
 * A reactive phase holder for the remount test: assigning `phase` swaps the
 * parent `RemountHost` renders the mount under. A `.svelte.ts` module, so the
 * Svelte compiler turns `$state` into a rune.
 *
 * @module
 */

/** The reactive holder the remount host reads its phase from. */
export interface RemountBag {
  /** Which parent the mount renders under. */
  phase: 'first' | 'second'
}

/**
 * Creates a `$state` phase holder, starting under the first parent.
 *
 * @returns The reactive holder.
 */
export function createRemountBag(): RemountBag {
  const bag: RemountBag = $state({ phase: 'first' })
  return bag
}
