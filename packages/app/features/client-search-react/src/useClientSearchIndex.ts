/**
 * Builds a client search index from a list, once per list.
 *
 * @module
 */

import { useMemo } from 'react'

import type {
  ClientSearchDocument,
  ClientSearchIndex,
  ClientSearchIndexOptions,
} from '@molecule/app-client-search'
import { createIndex, hasProvider } from '@molecule/app-client-search'
import { useValueAtKeyChange } from '@molecule/app-react/render'

/**
 * Indexes `docs` with the bonded provider. The index is rebuilt only when the
 * `docs` array identity changes (memoize the list, or pass it from state), and
 * is `null` until the list exists or while no provider is bonded.
 *
 * @param docs - The documents to index, or nothing yet.
 * @param options - How to index them. Read once per rebuild; keep it stable.
 * @returns The index, or `null`.
 */
export function useClientSearchIndex<T extends ClientSearchDocument>(
  docs: T[] | null | undefined,
  options: ClientSearchIndexOptions<T>,
): ClientSearchIndex<T> | null {
  // Options are read once per list: a fresh literal each render must not
  // rebuild the index. They are the options of the render in which `docs` last
  // changed, kept in state, so a render React throws away leaves no trace.
  const held = useValueAtKeyChange(options, [docs])
  return useMemo(() => (docs && hasProvider() ? createIndex(docs, held) : null), [docs, held])
}
