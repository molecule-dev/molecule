/**
 * A whole search session: the text, its hits, the keyboard, the address bar,
 * and what happens when a hit opens.
 *
 * @module
 */

import { type Accessor, createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'

import type {
  ClientSearchDocument,
  ClientSearchIndexOptions,
  ParsedQuery,
} from '@molecule/app-client-search'
import { extractFieldText, formatQuery } from '@molecule/app-client-search'
import {
  get as storageGet,
  hasProvider as hasStorage,
  set as storageSet,
} from '@molecule/app-storage'

import { readValue } from './accessor.js'
import { readHashQuery, writeHashQuery } from './hashQuery.js'
import type { SearchSession, SearchSessionConfig, SessionHit } from './types.js'
import { useClientSearch } from './useClientSearch.js'
import { useClientSearchIndex } from './useClientSearchIndex.js'
import { useListNavigation } from './useListNavigation.js'

/** What a remembered query is stored as. */
interface Remembered {
  q: string
  at: number
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
 * @param config - The documents, index options, and callbacks, or an accessor of them.
 * @returns The session, as accessors and plain functions.
 */
export function useSearchSession<T extends ClientSearchDocument>(
  config: SearchSessionConfig<T> | Accessor<SearchSessionConfig<T>>,
): SearchSession<T> {
  const cfg = (): SearchSessionConfig<T> => readValue(config)
  const inputRef: SearchSession<T>['inputRef'] = { current: null }
  const first = cfg()
  const syncUrl = first.syncUrl !== false
  const rememberKey = first.rememberKey
  const rememberMs = first.rememberMs ?? 30 * 60 * 1000

  const index = useClientSearchIndex<T>(
    () => cfg().docs,
    (): ClientSearchIndexOptions<T> => cfg().options,
  )
  const initial = syncUrl
    ? readHashQuery(undefined, { legacyField: first.legacyHashField })
    : { query: '', legacy: false }
  const search = useClientSearch<T>(index, () => ({
    initialQuery: initial.query,
    limit: cfg().limit ?? 60,
  }))
  let touched = initial.query.length > 0
  let committed = initial.query
  let working = false

  const setQuery = (next: string): void => {
    touched = true
    search.setQuery(next)
  }
  const clear = (): void => setQuery('')
  const focus = (): void => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }

  // Nothing in the URL: offer back what was typed elsewhere, once, on mount.
  if (rememberKey && !touched && hasStorage()) {
    let alive = true
    storageGet<Remembered | null>(rememberKey)
      .then((saved) => {
        if (!alive || touched || !saved) return
        if (typeof saved.q !== 'string' || typeof saved.at !== 'number') return
        if (Date.now() - saved.at <= rememberMs && saved.q) search.setQuery(saved.q)
      })
      .catch((error: unknown) => {
        console.debug('search session: could not recall the query', error)
      })
    onCleanup(() => {
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
      search.setQuery(next.query)
    }
    window.addEventListener('hashchange', onHash)
    onCleanup(() => window.removeEventListener('hashchange', onHash))
  }

  // Mirror the text to the hash and to storage after typing pauses.
  createEffect(
    on(
      () => search.query(),
      (current) => {
        if (!touched) return
        const timer = setTimeout(() => {
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
        onCleanup(() => clearTimeout(timer))
      },
      { defer: false },
    ),
  )

  /**
   * Records the committed search, so Back returns to it rather than to a
   * keystroke.
   */
  const commit = (): void => {
    if (syncUrl) writeHashQuery(search.query(), 'replace')
    committed = search.query()
    working = false
  }

  const open = (doc: T): void => {
    commit()
    cfg().onOpen(doc)
  }
  const prefetch = (doc: T): void => {
    cfg().prefetch?.(doc)
  }

  // Extra hits from elsewhere, appended after the index's own.
  const [related, setRelated] = createSignal<{ raw: string; docs: T[] }>({ raw: '', docs: [] })
  const wanted = createMemo<boolean>(
    () => Boolean(cfg().augment) && (cfg().augmentWhen ?? defaultAugmentWhen)(search.parsed()),
  )
  const raw = createMemo<string>(() => search.parsed().raw)
  createEffect(
    on(
      [wanted, raw],
      ([isWanted]) => {
        if (!isWanted) return
        const controller = new AbortController()
        const parsed = search.parsed()
        const timer = setTimeout(() => {
          const fn = cfg().augment
          if (!fn) return
          fn(parsed, controller.signal)
            .then((extra) => {
              if (!controller.signal.aborted) setRelated({ raw: parsed.raw, docs: extra ?? [] })
            })
            .catch((error: unknown) => {
              if (!controller.signal.aborted) console.debug('search session: augment failed', error)
            })
        }, cfg().augmentDelayMs ?? 250)
        onCleanup(() => {
          clearTimeout(timer)
          controller.abort()
        })
      },
      { defer: false },
    ),
  )

  const hits = createMemo<SessionHit<T>[]>(() => {
    const own: SessionHit<T>[] = search.hits()
    const current = related()
    if (!wanted() || current.raw !== raw() || !current.docs.length) return own
    const byId = new Map(own.map((h) => [h.id, h]))
    // When no record contains every word typed, the words alone rank poorly
    // (one common word in a title outweighs the rare one that carried the
    // meaning), so the augmenting hits lead; otherwise they follow.
    const words = wordsOf(search.parsed())
    const opts = cfg().options
    const extract = opts.extractField ?? extractFieldText
    const holdsAll = (doc: T): boolean =>
      words.every((w) => opts.fields.some((f) => extract(doc, f).toLowerCase().includes(w)))
    const complete = words.length > 0 && own.some((h) => holdsAll(h.doc))
    const extra: SessionHit<T>[] = []
    const seen = new Set<string>()
    for (const doc of current.docs) {
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
  })

  const nav = useListNavigation(() => ({
    count: hits().length,
    onSelect: (i: number): void => {
      const hit = hits()[i]
      if (hit) open(hit.doc)
    },
    onEscape: (): void => {
      if (search.query()) clear()
      else if (cfg().onEscape) cfg().onEscape?.()
      else inputRef.current?.blur()
    },
  }))
  createEffect(
    on(
      () => search.query(),
      () => nav.reset(),
      { defer: false },
    ),
  )

  const ranked = createMemo<boolean>(
    () => search.parsed().text.trim().length > 0 || search.parsed().phrases.length > 0,
  )
  // Warm the pages of the first few hits once results settle.
  createEffect(
    on(
      [hits, ranked],
      ([currentHits, isRanked]) => {
        if (!isRanked || !currentHits.length || !cfg().prefetch) return
        const timer = setTimeout(() => {
          for (const hit of currentHits.slice(0, 5)) cfg().prefetch?.(hit.doc)
        }, 300)
        onCleanup(() => clearTimeout(timer))
      },
      { defer: false },
    ),
  )

  const removeFilter = (i: number): void => {
    const { filters, ...rest } = search.parsed()
    setQuery(formatQuery({ ...rest, filters: filters.filter((_, k) => k !== i) }))
    focus()
  }

  return {
    inputRef,
    query: search.query,
    setQuery,
    clear,
    parsed: search.parsed,
    hits,
    active: search.active,
    ranked,
    activeIndex: nav.activeIndex,
    setActiveIndex: nav.setActiveIndex,
    onKeyDown: nav.onKeyDown,
    removeFilter,
    open,
    prefetch,
    focus,
  }
}
