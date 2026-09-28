/**
 * Search state for an input: the text, its parsed form, and the hits.
 *
 * @module
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ClientSearchIndex,
  ParsedQuery,
} from '@molecule/app-client-search'
import { filterFieldsOf, parseQuery } from '@molecule/app-client-search'

/** Options for {@link useClientSearch}. */
export interface UseClientSearchOptions {
  /** The text to start with (e.g. from the URL). */
  initialQuery?: string

  /** Maximum hits. Defaults to `50`. */
  limit?: number

  /**
   * Milliseconds to wait after the last keystroke before searching. `0` (the
   * default) searches synchronously on every change, which an in-memory index
   * handles comfortably; raise it only for very large lists.
   */
  debounceMs?: number
}

/** What {@link useClientSearch} returns. */
export interface ClientSearchState<T extends ClientSearchDocument> {
  /** The text as typed. Bind it to the input's `value`. */
  query: string

  /** Sets the text. Bind it to the input's `onChange`. */
  setQuery: (query: string) => void

  /** The text in its parsed form (terms, phrases, filters, exclusions). */
  parsed: ParsedQuery

  /** The hits for the current (debounced) text; every document when the text is empty. */
  hits: ClientSearchHit<T>[]

  /** Whether the text is non-blank. */
  active: boolean

  /** Clears the text. */
  clear: () => void
}

/**
 * Keeps an input's text and the hits for it. With no index yet the hits are
 * empty; with an index and blank text they are every document (browse mode),
 * so one list renders both states.
 *
 * @param index - The index from {@link useClientSearchIndex}, or `null`.
 * @param options - Initial text, limit, debounce.
 * @returns The search state.
 */
export function useClientSearch<T extends ClientSearchDocument>(
  index: ClientSearchIndex<T> | null,
  options: UseClientSearchOptions = {},
): ClientSearchState<T> {
  const { initialQuery = '', limit = 50, debounceMs = 0 } = options
  const [query, setQueryState] = useState(initialQuery)
  const [applied, setApplied] = useState(initialQuery)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setQuery = useCallback(
    (next: string) => {
      setQueryState(next)
      if (debounceMs <= 0) {
        setApplied(next)
        return
      }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setApplied(next), debounceMs)
    },
    [debounceMs],
  )
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const parsed = useMemo(
    () => parseQuery(query, { filterFields: index ? filterFieldsOf(index.options) : undefined }),
    [query, index],
  )
  const hits = useMemo<ClientSearchHit<T>[]>(() => {
    if (!index) return []
    const q = parseQuery(applied, { filterFields: filterFieldsOf(index.options) })
    return index.search({ ...q, limit })
  }, [index, applied, limit])

  const clear = useCallback(() => setQuery(''), [setQuery])
  return { query, setQuery, parsed, hits, active: query.trim().length > 0, clear }
}
