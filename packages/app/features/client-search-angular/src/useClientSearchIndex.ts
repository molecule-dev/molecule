/**
 * Builds a client search index from a list, once per list.
 *
 * @module
 */

import { computed, type Signal } from '@angular/core'

import type {
  ClientSearchDocument,
  ClientSearchIndex,
  ClientSearchIndexOptions,
} from '@molecule/app-client-search'
import { createIndex, hasProvider } from '@molecule/app-client-search'

import type { MaybeSignal } from './inputs.js'
import { readValue } from './signal.js'

/**
 * Indexes `docs` with the bonded provider. The index is rebuilt only when the
 * `docs` array identity changes (memoize the list, or pass it from state), and
 * is `null` until the list exists or while no provider is bonded.
 *
 * @param docs - The documents to index, or nothing yet (or a signal of them).
 * @param options - How to index them. Read once per rebuild; keep it stable.
 * @returns A signal of the index, or of `null`.
 */
export function useClientSearchIndex<T extends ClientSearchDocument>(
  docs: MaybeSignal<T[] | null | undefined>,
  options: MaybeSignal<ClientSearchIndexOptions<T>>,
): Signal<ClientSearchIndex<T> | null> {
  // The options object is intentionally not a separate dependency: a fresh
  // literal each render must not rebuild the index; a different list does.
  return computed(() => {
    const list = readValue(docs)
    return list && hasProvider() ? createIndex(list, readValue(options)) : null
  })
}
