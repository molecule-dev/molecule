/**
 * React-keyed list iteration shared by the components that render list props.
 *
 * React reconciles list children by `key`: a DOM node survives a props update
 * while its key is unchanged and moves when its position changes. Solid's
 * `<For>` keys by object identity, so the same list passed again as equal new
 * objects would re-create every node and drop its DOM state. The components
 * instead iterate {@link KeyedList.keys} with `<For>` — `<For>` compares
 * strings and numbers by value, so an unchanged key keeps its node — and read
 * each item through {@link KeyedList.get}, which always returns the latest
 * item for that key so the rendered content still updates reactively.
 *
 * @module
 */

import { type Accessor, createMemo } from 'solid-js'

/**
 * A React-keyed view of a list.
 */
export interface KeyedList<T, K extends string | number = string | number> {
  /** The keys, in list order: iterate these with `<For>`. */
  keys: Accessor<K[]>
  /**
   * The latest item for a key. When two items share a key the later one wins
   * (React renders both; its behavior with duplicate keys is undefined, so
   * components never rely on it).
   */
  get: (key: K) => T | undefined
}

/**
 * Splits a list into its keys and a key → latest item lookup, keyed the way
 * React keys the list's children. An index key falls out naturally: a `keyOf`
 * that returns the index produces keys that are unchanged by any update that
 * keeps the list's shape, so the nodes stay in place and only their content
 * updates.
 *
 * @template T - The list's item type.
 * @template K - The key type.
 * @param items - The list, as a reactive accessor.
 * @param keyOf - The key React would assign each item (`key={…}`), with the item's index.
 * @returns The keys to iterate and the item lookup to read.
 */
export function createKeyedList<T, K extends string | number>(
  items: Accessor<T[]>,
  keyOf: (item: T, index: number) => K,
): KeyedList<T, K> {
  const keys = createMemo(() => items().map((item, index) => keyOf(item, index)))
  const byKey = createMemo(() => {
    const latest = new Map<K, T>()
    items().forEach((item, index) => latest.set(keyOf(item, index), item))
    return latest
  })
  return {
    keys,
    get: (key) => byKey().get(key),
  }
}
