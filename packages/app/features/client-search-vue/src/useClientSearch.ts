/**
 * Search state for an input: the text, its parsed form, and the hits.
 *
 * @module
 */

import {
  computed,
  getCurrentScope,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
} from 'vue'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ParsedQuery,
} from '@molecule/app-client-search'
import { filterFieldsOf, parseQuery } from '@molecule/app-client-search'

import type { ClientSearchIndexInput } from './inputs.js'
import type { ClientSearchState, UseClientSearchOptions } from './types.js'

/**
 * Keeps an input's text and the hits for it. With no index yet the hits are
 * empty; with an index and blank text they are every document (browse mode),
 * so one list renders both states.
 *
 * @param index - The index from {@link useClientSearchIndex}, or `null` (or a ref/getter of it).
 * @param options - Initial text, limit, debounce (or a ref/getter of them).
 * @returns The search state, as refs and plain functions.
 */
export function useClientSearch<T extends ClientSearchDocument>(
  index: ClientSearchIndexInput<T>,
  options: MaybeRefOrGetter<UseClientSearchOptions> = {},
): ClientSearchState<T> {
  // The initial text is read once, like `useState(initialQuery)`: a later
  // options change must not wipe what the person has typed.
  const initial = toValue(options)?.initialQuery ?? ''
  const query = shallowRef(initial)
  const applied = shallowRef(initial)
  let timer: ReturnType<typeof setTimeout> | null = null

  const setQuery = (next: string): void => {
    query.value = next
    const debounceMs = toValue(options)?.debounceMs ?? 0
    if (debounceMs <= 0) {
      applied.value = next
      return
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      applied.value = next
    }, debounceMs)
  }
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (timer) clearTimeout(timer)
    })
  }

  const parsed = computed<ParsedQuery>(() => {
    const current = toValue(index)
    return parseQuery(query.value, {
      filterFields: current ? filterFieldsOf(current.options) : undefined,
    })
  })
  const hits = computed<ClientSearchHit<T>[]>(() => {
    const current = toValue(index)
    if (!current) return []
    const limit = toValue(options)?.limit ?? 50
    const q = parseQuery(applied.value, { filterFields: filterFieldsOf(current.options) })
    return current.search({ ...q, limit })
  })

  const clear = (): void => setQuery('')
  return {
    query,
    setQuery,
    parsed,
    hits,
    active: computed(() => query.value.trim().length > 0),
    clear,
  }
}
