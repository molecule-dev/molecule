/**
 * Resolves a node prop so that a function in it is never called again because of what its result
 * renders: Solid's `children()` with each function read in a scope of its own.
 *
 * @module
 */

import {
  type Accessor,
  type ChildrenReturn,
  createMemo,
  mapArray,
  type ResolvedChildren,
  type ResolvedJSXElement,
} from 'solid-js'

/**
 * Resolves what a function returned, or a list: an array is mapped by item identity and each item
 * resolved in a scope of its own, so an item that stays keeps its scope while others come and go.
 * A value that is not an array resolves to what its one item resolves to (Solid's shape: an array
 * only where a list was).
 *
 * @param returned - The value, read in the caller's memo.
 * @returns The resolved value.
 */
function resolveReturned(returned: Accessor<unknown>): Accessor<ResolvedChildren> {
  const isList = createMemo(() => Array.isArray(returned()))
  const items = createMemo((): readonly unknown[] => {
    const value = returned()
    return Array.isArray(value) ? value : [value]
  })
  const parts = mapArray(items, resolveValue)
  // Reads the parts' memos only: it calls no function of the caller's, so it may re-run freely.
  return createMemo((): ResolvedChildren => {
    const resolved = parts()
    if (!isList()) return resolved[0]?.()
    return resolved.flatMap((part): ResolvedJSXElement[] => {
      const value = part()
      return Array.isArray(value) ? value : [value]
    })
  })
}

/**
 * Resolves one value. A function that takes no argument (an accessor item, a `<Show>` or `<For>`
 * result, a memo) is read in a memo of its own, and so is a function it returns: a change inside
 * what it returned re-reads that part only, never the function. A factory (`() => <Row />`) creates
 * its component untracked, so its memo never re-runs and the component lives as long as the scope;
 * a function that reads a signal itself (`() => (on() ? <A /> : <B />)`) re-runs on that signal.
 * A function that takes arguments is a value, as in Solid.
 *
 * @param value - The value.
 * @returns The resolved value.
 */
function resolveValue(value: unknown): Accessor<ResolvedChildren> {
  if (typeof value === 'function' && value.length === 0) {
    return resolveReturned(createMemo(() => (value as () => unknown)()))
  }
  if (Array.isArray(value)) return resolveReturned(() => value)
  // The one conversion from the core's untyped node prop to what Solid inserts.
  return () => value as ResolvedChildren
}

/**
 * Solid's `children()` helper, with every function in the node read in a scope of its own.
 * `children()` reads a node and every function in it in one memo, so a change inside what an
 * accessor item returned (the `<Show>` at the root of `() => <Row />`) calls the accessor again and
 * replaces the row, losing its state. Here an item is created once and kept while it stays: a list
 * is mapped by item identity, so adding a row to a `<For>` of accessor rows creates only that row.
 * Components are created where this is called and disposed with that scope, as with `children()`.
 * Use it wherever a component resolves a node prop (molecule's Solid packages do not import
 * `children` from solid-js).
 *
 * @example
 * ```tsx
 * const trigger = resolveNode(() => local.trigger)
 * const element = (): Element | null => {
 *   const only = trigger.toArray()
 *   return only.length === 1 && only[0] instanceof Element ? only[0] : null
 * }
 * ```
 *
 * @param read - Reads the node prop (`() => local.footer`).
 * @returns The resolved node, with `toArray()` as `children()` gives it.
 */
export function resolveNode(read: () => unknown): ChildrenReturn {
  const resolved = resolveReturned(createMemo(read))
  return Object.assign(resolved, {
    toArray: (): ResolvedJSXElement[] => {
      const value = resolved()
      return Array.isArray(value) ? value : value != null ? [value] : []
    },
  })
}
