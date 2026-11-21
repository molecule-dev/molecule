/**
 * Builds a client search index from a list, once per list.
 *
 * @module
 */

import { type MaybeRefOrGetter, type Ref, shallowRef, toValue, watch } from 'vue'

import type {
  ClientSearchDocument,
  ClientSearchIndex,
  ClientSearchIndexOptions,
} from '@molecule/app-client-search'
import { createIndex, hasProvider } from '@molecule/app-client-search'

/**
 * Indexes `docs` with the bonded provider. The index is rebuilt only when the
 * `docs` array identity changes (memoize the list, or pass it from state), and
 * is `null` until the list exists or while no provider is bonded.
 *
 * @param docs - The documents to index, or nothing yet (or a ref/getter of them).
 * @param options - How to index them. Read once per rebuild; keep it stable.
 * @returns A ref of the index, or of `null`.
 */
export function useClientSearchIndex<T extends ClientSearchDocument>(
  docs: MaybeRefOrGetter<T[] | null | undefined>,
  options: MaybeRefOrGetter<ClientSearchIndexOptions<T>>,
): Ref<ClientSearchIndex<T> | null> {
  const index = shallowRef<ClientSearchIndex<T> | null>(null)
  // The options object is intentionally not a dependency of the watcher: a
  // fresh literal each render would rebuild the index every time.
  const rebuild = (): void => {
    const list = toValue(docs)
    index.value = list && hasProvider() ? createIndex(list, toValue(options)) : null
  }
  rebuild()
  // Synchronous, so the index a caller reads right after a list change is the
  // new one (React's `useMemo` recomputes within the same render).
  watch(() => toValue(docs), rebuild, { flush: 'sync' })
  return index
}
