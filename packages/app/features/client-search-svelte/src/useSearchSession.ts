/**
 * A whole search session: the text, its hits, the keyboard, the address bar,
 * and what happens when a hit opens.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, type Readable, writable } from 'svelte/store'

import type { ClientSearchDocument, ParsedQuery } from '@molecule/app-client-search'
import { extractFieldText, formatQuery } from '@molecule/app-client-search'
import {
  get as storageGet,
  hasProvider as hasStorage,
  set as storageSet,
} from '@molecule/app-storage'

import { readHashQuery, writeHashQuery } from './hashQuery.js'
import type { OptionsInput } from './inputs.js'
import { readValue, toStore } from './store.js'
import type {
  ListNavigation,
  SearchSession,
  SearchSessionConfig,
  SessionHit,
  UseListNavigationOptions,
} from './types.js'
import { useClientSearch } from './useClientSearch.js'
import { useClientSearchIndex } from './useClientSearchIndex.js'
import { useListNavigation } from './useListNavigation.js'

/** What a remembered query is stored as. */
interface Remembered {
  q: string
  at: number
}

/** Extra hits an augmenting search added, and the query they belong to. */
interface Related<T> {
  raw: string
  docs: T[]
}

/**
 * The default `augmentWhen`: two or more words typed, or a phrase.
 *
 * @param parsed - The parsed query.
 * @returns Whether to ask for extra hits.
 */
const defaultAugmentWhen = (parsed: ParsedQuery): boolean =>
  parsed.phrases.length > 0 || parsed.text.trim().split(/\s+/).filter(Boolean).length >= 2

/**
 * The distinct words the free text and phrases hold, lower-cased.
 *
 * @param parsed - The parsed query.
 * @returns Its distinct words.
 */
const wordsOf = (parsed: ParsedQuery): string[] => [
  ...new Set(
    [parsed.text, ...parsed.phrases]
      .join(' ')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  ),
]

/**
 * The search state for one list, wired to the address bar and the keyboard.
 * The text starts from `#q=`, then from what was last typed under
 * `rememberKey`; every change is mirrored back to both after typing pauses.
 * Typing after a committed search first pushes a history entry, then rewrites
 * it, so Back returns to the previous search rather than to each keystroke.
 *
 * @param config - The documents, index options, and callbacks, or a store of them.
 * @returns A store of the session.
 */
export function useSearchSession<T extends ClientSearchDocument>(
  config: OptionsInput<SearchSessionConfig<T>>,
): Readable<SearchSession<T>> {
  const configStore = toStore(config)
  const cfg = (): SearchSessionConfig<T> => readValue(configStore)
  const inputRef: SearchSession<T>['inputRef'] = { current: null }
  const first = cfg()
  const syncUrl = first.syncUrl !== false
  const rememberKey = first.rememberKey
  const rememberMs = first.rememberMs ?? 30 * 60 * 1000

  const index = useClientSearchIndex<T>(
    derived(configStore, (next) => next.docs),
    derived(configStore, (next) => next.options),
  )
  const initial = syncUrl
    ? readHashQuery(undefined, { legacyField: first.legacyHashField })
    : { query: '', legacy: false }
  const search = useClientSearch<T>(index, {
    initialQuery: initial.query,
    limit: first.limit ?? 60,
  })
  let searchState = readValue(search)
  let touched = initial.query.length > 0
  let committed = initial.query
  let working = false

  // Extra hits from elsewhere, appended after the index's own.
  const related = writable<Related<T>>({ raw: '', docs: [] })
  let relatedState = readValue(related)

  /**
   * The index's own hits for the query, or the ones an augmenting search added
   * when those lead (the words typed alone match no record).
   *
   * @returns The hits to show.
   */
  function currentHits(): SessionHit<T>[] {
    const own: SessionHit<T>[] = searchState.hits
    const wanted = isWanted()
    if (!wanted || relatedState.raw !== searchState.parsed.raw || !relatedState.docs.length)
      return own
    const byId = new Map(own.map((h) => [h.id, h]))
    // When no record contains every word typed, the words alone rank poorly
    // (one common word in a title outweighs the rare one that carried the
    // meaning), so the augmenting hits lead; otherwise they follow.
    const words = wordsOf(searchState.parsed)
    const opts = cfg().options
    const extract = opts.extractField ?? extractFieldText
    const holdsAll = (doc: T): boolean =>
      words.every((w) => opts.fields.some((f) => extract(doc, f).toLowerCase().includes(w)))
    const complete = words.length > 0 && own.some((h) => holdsAll(h.doc))
    const extra: SessionHit<T>[] = []
    const seen = new Set<string>()
    for (const doc of relatedState.docs) {
      const id = String(doc[opts.idField])
      if (seen.has(id)) continue
      seen.add(id)
      const existing = byId.get(id)
      if (existing) {
        if (!complete) extra.push({ ...existing, related: true })
        continue
      }
      extra.push({ id, score: 0, doc, terms: [], fields: [], related: true })
    }
    if (!extra.length) return own
    if (complete) return [...own, ...extra]
    return [...extra, ...own.filter((h) => !seen.has(h.id))]
  }

  /**
   * Whether the query should ask for extra hits.
   *
   * @returns True when an augmenting search applies.
   */
  function isWanted(): boolean {
    const augment = cfg().augment
    return Boolean(augment) && (cfg().augmentWhen ?? defaultAugmentWhen)(searchState.parsed)
  }

  /**
   * Whether the hits are ranked rather than browsed.
   *
   * @returns True for free text or a phrase.
   */
  function isRanked(): boolean {
    return searchState.parsed.text.trim().length > 0 || searchState.parsed.phrases.length > 0
  }

  // The highlight moves through the hits; its options follow the hit count.
  const navOptions = writable<UseListNavigationOptions>({
    count: currentHits().length,
    onSelect: (i: number) => select(i),
    onEscape: () => escape(),
  })
  const nav = useListNavigation(navOptions)
  let navState: ListNavigation = readValue(nav)

  /**
   * Opens the i-th hit.
   *
   * @param index - The hit's position.
   */
  function select(index: number): void {
    const hit = currentHits()[index]
    if (hit) open(hit.doc)
  }

  /** Escape with nothing typed: the caller's handler, or blur the input. */
  function escape(): void {
    if (searchState.query) clear()
    else if (cfg().onEscape) cfg().onEscape?.()
    else inputRef.current?.blur()
  }

  /**
   * Sets the text.
   *
   * @param next - The text.
   */
  function setQuery(next: string): void {
    touched = true
    searchState.setQuery(next)
  }

  /** Clears the text. */
  function clear(): void {
    setQuery('')
  }

  /** Focuses the input and selects its text. */
  function focus(): void {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }

  /** Records the committed search, so Back returns to it rather than to a keystroke. */
  function commit(): void {
    if (syncUrl) writeHashQuery(searchState.query, 'replace')
    committed = searchState.query
    working = false
  }

  /**
   * Opens a hit and commits the search.
   *
   * @param doc - The document to open.
   */
  function open(doc: T): void {
    commit()
    cfg().onOpen(doc)
  }

  /**
   * Warms a hit's page.
   *
   * @param doc - The document to warm.
   */
  function prefetch(doc: T): void {
    cfg().prefetch?.(doc)
  }

  /**
   * Removes the i-th filter from the text.
   *
   * @param i - The filter's position.
   */
  function removeFilter(i: number): void {
    const { filters, ...rest } = searchState.parsed
    setQuery(formatQuery({ ...rest, filters: filters.filter((_, k) => k !== i) }))
    focus()
  }

  /** Republishes the session from the current state. */
  function publish(): void {
    navState = readValue(nav)
    session.set({
      inputRef,
      query: searchState.query,
      setQuery,
      clear,
      parsed: searchState.parsed,
      hits: currentHits(),
      active: searchState.active,
      ranked: isRanked(),
      activeIndex: navState.activeIndex,
      setActiveIndex: navState.setActiveIndex,
      onKeyDown: navState.onKeyDown,
      removeFilter,
      open,
      prefetch,
      focus,
    })
  }

  const session = writable<SearchSession<T>>({
    inputRef,
    query: searchState.query,
    setQuery,
    clear,
    parsed: searchState.parsed,
    hits: currentHits(),
    active: searchState.active,
    ranked: isRanked(),
    activeIndex: navState.activeIndex,
    setActiveIndex: navState.setActiveIndex,
    onKeyDown: navState.onKeyDown,
    removeFilter,
    open,
    prefetch,
    focus,
  })

  // --- Effects, as React runs them -------------------------------------------

  let mirrorTimer: ReturnType<typeof setTimeout> | null = null
  let augmentTimer: ReturnType<typeof setTimeout> | null = null
  let prefetchTimer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let lastQuery = searchState.query
  let lastWanted: boolean | null = null
  let lastRaw: string | null = null
  let lastHits: SessionHit<T>[] | null = null
  let lastRanked: boolean | null = null
  let lastCount = currentHits().length

  /**
   * Runs the effects a state change may need: the mirror to the address bar and
   * storage, the augmenting call, the prefetch of the top hits, and the
   * highlight's reset and refreshing options.
   */
  function react(): void {
    // The query changed: the highlight resets and the text is mirrored later.
    if (searchState.query !== lastQuery) {
      lastQuery = searchState.query
      navState.reset()
      if (mirrorTimer) clearTimeout(mirrorTimer)
      const current = searchState.query
      if (touched) {
        mirrorTimer = setTimeout(() => {
          if (syncUrl && current !== committed) {
            writeHashQuery(current, working ? 'replace' : 'push')
            working = true
          }
          if (rememberKey && hasStorage()) {
            const value = current.trim() ? { q: current, at: Date.now() } : null
            storageSet<Remembered | null>(rememberKey, value).catch((error: unknown) => {
              console.debug('search session: could not remember the query', error)
            })
          }
        }, 150)
      }
    }

    // The query's words changed: arm or disarm the augmenting call.
    const wanted = isWanted()
    const raw = searchState.parsed.raw
    if (wanted !== lastWanted || raw !== lastRaw) {
      lastWanted = wanted
      lastRaw = raw
      if (augmentTimer) clearTimeout(augmentTimer)
      augmentTimer = null
      controller?.abort()
      controller = null
      if (wanted) {
        const own = new AbortController()
        controller = own
        const parsed = searchState.parsed
        augmentTimer = setTimeout(() => {
          const fn = cfg().augment
          if (!fn) return
          fn(parsed, own.signal)
            .then((extra) => {
              if (own.signal.aborted) return
              relatedState = { raw: parsed.raw, docs: extra ?? [] }
              related.set(relatedState)
            })
            .catch((error: unknown) => {
              if (!own.signal.aborted) console.debug('search session: augment failed', error)
            })
        }, cfg().augmentDelayMs ?? 250)
      }
    }

    // The hits changed: give the highlight the new count, and warm the top ones.
    const hits = currentHits()
    const ranked = isRanked()
    if (hits.length !== lastCount) {
      lastCount = hits.length
      navOptions.set({
        count: lastCount,
        onSelect: (i: number) => select(i),
        onEscape: () => escape(),
      })
    }
    if (hits !== lastHits || ranked !== lastRanked) {
      lastHits = hits
      lastRanked = ranked
      if (prefetchTimer) clearTimeout(prefetchTimer)
      prefetchTimer = null
      if (ranked && hits.length && cfg().prefetch) {
        prefetchTimer = setTimeout(() => {
          for (const hit of hits.slice(0, 5)) cfg().prefetch?.(hit.doc)
        }, 300)
      }
    }
  }

  const stops: Array<() => void> = []

  // Nothing in the URL: offer back what was typed elsewhere, once, on mount.
  if (rememberKey && !touched && hasStorage()) {
    let alive = true
    storageGet<Remembered | null>(rememberKey)
      .then((saved) => {
        if (!alive || touched || !saved) return
        if (typeof saved.q !== 'string' || typeof saved.at !== 'number') return
        if (Date.now() - saved.at <= rememberMs && saved.q) setQuery(saved.q)
      })
      .catch((error: unknown) => {
        console.debug('search session: could not recall the query', error)
      })
    stops.push(() => {
      alive = false
    })
  }

  // A plain-anchor link becomes the `#q=` form at once.
  if (syncUrl && initial.legacy) writeHashQuery(initial.query, 'replace')

  // Back/Forward (or a hand-edited hash) restores that search.
  if (syncUrl) {
    const onHash = (): void => {
      const next = readHashQuery(undefined, { legacyField: cfg().legacyHashField })
      if (next.legacy) writeHashQuery(next.query, 'replace')
      committed = next.query
      working = false
      touched = true
      setQuery(next.query)
    }
    window.addEventListener('hashchange', onHash)
    stops.push(() => window.removeEventListener('hashchange', onHash))
  }

  stops.push(
    search.subscribe((next) => {
      searchState = next
      react()
      publish()
    }),
    related.subscribe((next) => {
      relatedState = next
      react()
      publish()
    }),
    nav.subscribe((next) => {
      navState = next
      session.update((current) =>
        current.activeIndex === next.activeIndex
          ? current
          : { ...current, activeIndex: next.activeIndex },
      )
    }),
  )

  onDestroy(() => {
    for (const stop of stops) stop()
    if (mirrorTimer) clearTimeout(mirrorTimer)
    if (augmentTimer) clearTimeout(augmentTimer)
    if (prefetchTimer) clearTimeout(prefetchTimer)
    controller?.abort()
  })
  return { subscribe: session.subscribe }
}
