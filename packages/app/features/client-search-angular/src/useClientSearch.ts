/**
 * Search state for an input: the text, its parsed form, and the hits.
 *
 * @module
 */

import { computed, DestroyRef, inject, signal } from '@angular/core'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ParsedQuery,
} from '@molecule/app-client-search'
import { filterFieldsOf, parseQuery } from '@molecule/app-client-search'

import type { ClientSearchIndexInput, MaybeSignal } from './inputs.js'
import { readValue } from './signal.js'
import type { ClientSearchState, UseClientSearchOptions } from './types.js'

/**
 * Keeps an input's text and the hits for it. With no index yet the hits are
 * empty; with an index and blank text they are every document (browse mode),
 * so one list renders both states.
 *
 * @param index - The index from {@link useClientSearchIndex}, or `null` (or a signal of it).
 * @param options - Initial text, limit, debounce (or a signal of them).
 * @returns The search state, as signals and plain functions.
 */
export function useClientSearch<T extends ClientSearchDocument>(
  index: ClientSearchIndexInput<T>,
  options: MaybeSignal<UseClientSearchOptions> = {},
): ClientSearchState<T> {
  // The initial text is read once, as a state initializer is: a later options
  // change must not wipe what the person has typed.
  const initial = readValue(options)?.initialQuery ?? ''
  const query = signal(initial)
  const applied = signal(initial)
  let timer: ReturnType<typeof setTimeout> | null = null
  inject(DestroyRef).onDestroy(() => {
    if (timer) clearTimeout(timer)
  })

  const setQuery = (next: string): void => {
    query.set(next)
    const debounceMs = readValue(options)?.debounceMs ?? 0
    if (debounceMs <= 0) {
      applied.set(next)
      return
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      applied.set(next)
    }, debounceMs)
  }

  const parsed = computed<ParsedQuery>(() => {
    const current = readValue(index)
    return parseQuery(query(), {
      filterFields: current ? filterFieldsOf(current.options) : undefined,
    })
  })
  const hits = computed<ClientSearchHit<T>[]>(() => {
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
    active: computed(() => query().trim().length > 0),
    clear: (): void => setQuery(''),
  }
}
