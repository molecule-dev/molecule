/**
 * Search state for an input: the text, its parsed form, and the hits.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ParsedQuery,
} from '@molecule/app-client-search'
import { filterFieldsOf, parseQuery } from '@molecule/app-client-search'

import type { ClientSearchIndexInput, OptionsInput } from './inputs.js'
import { readValue, toStore } from './store.js'
import type { ClientSearchState, UseClientSearchOptions } from './types.js'

/**
 * Keeps an input's text and the hits for it. With no index yet the hits are
 * empty; with an index and blank text they are every document (browse mode),
 * so one list renders both states.
 *
 * @param index - The index from {@link useClientSearchIndex}, or `null` (or a store of it).
 * @param options - Initial text, limit, debounce (or a store of them).
 * @returns A store of the search state.
 */
export function useClientSearch<T extends ClientSearchDocument>(
  index: ClientSearchIndexInput<T>,
  options: OptionsInput<UseClientSearchOptions> = {},
): Readable<ClientSearchState<T>> {
  // The initial text is read once, as a state initializer is: a later options
  // change must not wipe what the person has typed.
  let query = readValue(options)?.initialQuery ?? ''
  let applied = query
  let timer: ReturnType<typeof setTimeout> | null = null

  const state = writable<ClientSearchState<T>>({
    query,
    setQuery: (next: string) => setQuery(next),
    parsed: parse(query),
    hits: search(query, applied),
    active: query.trim().length > 0,
    clear: (): void => setQuery(''),
  })

  /**
   * The text in its parsed form, with the index's filterable fields.
   *
   * @param text - The text to parse.
   * @returns The structured query.
   */
  function parse(text: string): ParsedQuery {
    const current = readValue(index)
    return parseQuery(text, {
      filterFields: current ? filterFieldsOf(current.options) : undefined,
    })
  }

  /**
   * The hits for a text.
   *
   * @param text - The text to parse.
   * @param appliedText - The text whose results are shown (the debounced one).
   * @returns The hits, best first.
   */
  function search(text: string, appliedText: string): ClientSearchHit<T>[] {
    const current = readValue(index)
    if (!current) return []
    const limit = readValue(options)?.limit ?? 50
    return current.search({ ...parse(appliedText), limit })
  }

  /** Republishes the state after a change. */
  function publish(): void {
    state.set({
      query,
      setQuery: (next: string) => setQuery(next),
      parsed: parse(query),
      hits: search(query, applied),
      active: query.trim().length > 0,
      clear: (): void => setQuery(''),
    })
  }

  /**
   * Sets the text, searching at once or after the debounce.
   *
   * @param next - The text.
   */
  function setQuery(next: string): void {
    query = next
    const debounceMs = readValue(options)?.debounceMs ?? 0
    if (debounceMs <= 0) {
      applied = next
      publish()
      return
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      applied = next
      publish()
    }, debounceMs)
    publish()
  }

  const stops = [
    toStore(index).subscribe(() => publish()),
    toStore(options).subscribe(() => publish()),
  ]
  onDestroy(() => {
    if (timer) clearTimeout(timer)
    for (const stop of stops) stop()
  })
  return { subscribe: state.subscribe }
}
