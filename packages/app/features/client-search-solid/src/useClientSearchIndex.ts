/**
 * Builds a client search index from a list, once per list.
 *
 * @module
 */

import { type Accessor, createMemo } from 'solid-js'

import type {
  ClientSearchDocument,
  ClientSearchIndex,
  ClientSearchIndexOptions,
} from '@molecule/app-client-search'
import { createIndex, hasProvider } from '@molecule/app-client-search'

import { readValue } from './accessor.js'

/**
 * Indexes `docs` with the bonded provider. The index is rebuilt only when the
 * `docs` array identity changes (memoize the list, or pass it from state), and
 * is `null` until the list exists or while no provider is bonded.
 *
 * @param docs - The documents to index, or nothing yet (or an accessor of them).
 * @param options - How to index them. Read once per rebuild; keep it stable.
 * @returns An accessor of the index, or of `null`.
 */
export function useClientSearchIndex<T extends ClientSearchDocument>(
  docs: T[] | null | undefined | Accessor<T[] | null | undefined>,
  options: ClientSearchIndexOptions<T> | Accessor<ClientSearchIndexOptions<T>>,
): Accessor<ClientSearchIndex<T> | null> {
  // The options object is intentionally not a separate dependency: a fresh
  // literal each render must not rebuild the index; a different list does.
  return createMemo(() => {
    const list = readValue(docs)
    return list && hasProvider() ? createIndex(list, readValue(options)) : null
  })
}
