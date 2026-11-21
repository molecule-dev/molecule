/**
 * Search state for an input: the text, its parsed form, and the hits.
 *
 * @module
 */

import { type Accessor, createMemo, createSignal, onCleanup } from 'solid-js'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ParsedQuery,
} from '@molecule/app-client-search'
import { filterFieldsOf, parseQuery } from '@molecule/app-client-search'

import { readValue } from './accessor.js'
import type { ClientSearchIndexInput } from './inputs.js'
import type { ClientSearchState, UseClientSearchOptions } from './types.js'

/**
 * Keeps an input's text and the hits for it. With no index yet the hits are
 * empty; with an index and blank text they are every document (browse mode),
 * so one list renders both states.
 *
 * @param index - The index from {@link useClientSearchIndex}, or `null` (or an accessor of it).
 * @param options - Initial text, limit, debounce (or an accessor of them).
 * @returns The search state, as accessors and plain functions.
 */
export function useClientSearch<T extends ClientSearchDocument>(
  index: ClientSearchIndexInput<T>,
  options: UseClientSearchOptions | Accessor<UseClientSearchOptions> = {},
): ClientSearchState<T> {
  // The initial text is read once, as a state initializer is: a later options
  // change must not wipe what the person has typed.
  const initial = readValue(options)?.initialQuery ?? ''
  const [query, setQueryState] = createSignal(initial)
  const [applied, setApplied] = createSignal(initial)
  let timer: ReturnType<typeof setTimeout> | null = null

  const setQuery = (next: string): void => {
    setQueryState(next)
    const debounceMs = readValue(options)?.debounceMs ?? 0
    if (debounceMs <= 0) {
      setApplied(next)
      return
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      setApplied(next)
    }, debounceMs)
  }
  onCleanup(() => {
    if (timer) clearTimeout(timer)
  })

  const parsed = createMemo<ParsedQuery>(() => {
    const current = readValue(index)
    return parseQuery(query(), {
      filterFields: current ? filterFieldsOf(current.options) : undefined,
    })
  })
  const hits = createMemo<ClientSearchHit<T>[]>(() => {
    const current = readValue(index)
    if (!current) return []
    const limit = readValue(options)?.limit ?? 50
    const q = parseQuery(applied(), { filterFields: filterFieldsOf(current.options) })
    return current.search({ ...q, limit })
  })

  return {
    query,
    setQuery,
    parsed,
    hits,
    active: createMemo(() => query().trim().length > 0),
    clear: (): void => setQuery(''),
  }
}
