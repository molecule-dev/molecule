/**
 * Builds a client search index from a list, once per list.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type {
  ClientSearchDocument,
  ClientSearchIndex,
  ClientSearchIndexOptions,
} from '@molecule/app-client-search'
import { createIndex, hasProvider } from '@molecule/app-client-search'

import type { OptionsInput } from './inputs.js'
import { readValue, toStore } from './store.js'

/**
 * Indexes `docs` with the bonded provider. The index is rebuilt only when the
 * `docs` array identity changes (memoize the list, or pass it from state), and
 * is `null` until the list exists or while no provider is bonded.
 *
 * @param docs - The documents to index, or nothing yet (or a store of them).
 * @param options - How to index them. Read once per rebuild; keep it stable.
 * @returns A store of the index, or of `null`.
 */
export function useClientSearchIndex<T extends ClientSearchDocument>(
  docs: T[] | null | undefined | Readable<T[] | null | undefined>,
  options: OptionsInput<ClientSearchIndexOptions<T>>,
): Readable<ClientSearchIndex<T> | null> {
  // The options object is intentionally not a separate dependency, and a store
  // notifies on every write even when it carries the same array again: only a
  // different list identity rebuilds the index.
  let built = false
  let list: T[] | null | undefined
  let index: ClientSearchIndex<T> | null = null
  const build = (): ClientSearchIndex<T> | null => {
    const next = readValue(docs)
    if (!built || next !== list) {
      built = true
      list = next
      index = next && hasProvider() ? createIndex(next, readValue(options)) : null
    }
    return index
  }
  const store = writable<ClientSearchIndex<T> | null>(build())
  const stops = [
    toStore(docs).subscribe(() => store.set(build())),
    toStore(options).subscribe(() => store.set(build())),
  ]
  onDestroy(() => {
    for (const stop of stops) stop()
  })
  return { subscribe: store.subscribe }
}
