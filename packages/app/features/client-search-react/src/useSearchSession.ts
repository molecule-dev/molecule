/**
 * A whole search session: the text, its hits, the keyboard, the address bar,
 * and what happens when a hit opens.
 *
 * @module
 */

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ClientSearchIndexOptions,
  ParsedQuery,
} from '@molecule/app-client-search'
import { formatQuery } from '@molecule/app-client-search'
import {
  get as storageGet,
  hasProvider as hasStorage,
  set as storageSet,
} from '@molecule/app-storage'

import { readHashQuery, writeHashQuery } from './hashQuery.js'
import { useClientSearch } from './useClientSearch.js'
import { useClientSearchIndex } from './useClientSearchIndex.js'
import { useListNavigation } from './useListNavigation.js'

/** A hit, possibly one an augmenting search added. */
export type SessionHit<T extends ClientSearchDocument> = ClientSearchHit<T> & {
  /** Found by an augmenting search (for example by meaning) rather than by the words typed. */
  related?: boolean
}

/** What {@link useSearchSession} needs to know. */
export interface SearchSessionConfig<T extends ClientSearchDocument> {
  /** The documents, or `null` until they exist. Keep the array identity stable. */
  docs: T[] | null

  /** How to index them. Keep the object identity stable (a module constant). */
  options: ClientSearchIndexOptions<T>

  /** Maximum hits. Defaults to `60`. */
  limit?: number

  /**
   * Keep the text in the URL hash (`#q=…`) and read it back on load and on
   * Back/Forward. Defaults to `true`.
   */
  syncUrl?: boolean

  /** The field a plain `#anchor` in the URL stands for (`'category'` makes `#auth` mean `category:auth`). */
  legacyHashField?: string

  /**
   * Share the text between pages through the bonded storage under this key,
   * for `rememberMs`. Omit to keep nothing.
   */
  rememberKey?: string

  /** How long a remembered text is offered back. Defaults to 30 minutes. */
  rememberMs?: number

  /** Opens a hit (Enter, or a click on its row). */
  onOpen: (doc: T) => void

  /** Warms a hit's page ahead of time (hover, focus, and the top hits once results settle). */
  prefetch?: (doc: T) => void

  /** Escape with nothing typed. Defaults to blurring the input; a dialog closes instead. */
  onEscape?: () => void

  /**
   * More hits for the current query from elsewhere (an API, a semantic
   * index): called after typing pauses, its results are appended after the
   * index's own hits, marked `related`; ids already present are skipped.
   * Return nothing for no extra hits.
   */
  augment?: (parsed: ParsedQuery, signal: AbortSignal) => Promise<T[] | undefined | void>

  /** Milliseconds to wait after typing before calling `augment`. Defaults to `250`. */
  augmentDelayMs?: number

  /** Only call `augment` when this returns `true` for the query. Defaults to "two or more words, or a phrase". */
  augmentWhen?: (parsed: ParsedQuery) => boolean
}

/** Everything a search box and a results list share. */
export interface SearchSession<T extends ClientSearchDocument> {
  /** Attach to the input. */
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  setQuery: (query: string) => void
  clear: () => void
  parsed: ParsedQuery
  hits: SessionHit<T>[]
  /** Anything typed at all (text, a phrase, or a filter). */
  active: boolean
  /** Free text or a phrase is present, so hits are ranked rather than browsed. */
  ranked: boolean
  activeIndex: number
  setActiveIndex: (index: number) => void
  /** Attach to the input as `onKeyDown`. */
  onKeyDown: (event: ReactKeyboardEvent) => void
  /** Removes the i-th filter from the text. */
  removeFilter: (index: number) => void
  /** Opens a hit and commits the search to history. */
  open: (doc: T) => void
  prefetch: (doc: T) => void
  /** Focuses the input and selects its text. */
  focus: () => void
}

interface Remembered {
  q: string
  at: number
}

const defaultAugmentWhen = (parsed: ParsedQuery): boolean =>
  parsed.phrases.length > 0 || parsed.text.trim().split(/\s+/).filter(Boolean).length >= 2

/**
 * The search state for one list, wired to the address bar and the keyboard.
 * The text starts from `#q=`, then from what was last typed under
 * `rememberKey`; every change is mirrored back to both after typing pauses.
 * Typing after a committed search first pushes a history entry, then rewrites
 * it, so Back returns to the previous search rather than to each keystroke.
 *
 * @param config - The documents, index options, and callbacks.
 * @returns The session.
 */
export function useSearchSession<T extends ClientSearchDocument>(
  config: SearchSessionConfig<T>,
): SearchSession<T> {
  const {
    docs,
    options,
    limit = 60,
    syncUrl = true,
    legacyHashField,
    rememberKey,
    rememberMs = 30 * 60 * 1000,
    augment,
    augmentDelayMs = 250,
    augmentWhen = defaultAugmentWhen,
  } = config
  const inputRef = useRef<HTMLInputElement | null>(null)
  const index = useClientSearchIndex(docs, options)
  const [initial] = useState(() =>
    syncUrl
      ? readHashQuery(undefined, { legacyField: legacyHashField })
      : { query: '', legacy: false },
  )
  const search = useClientSearch(index, { initialQuery: initial.query, limit })
  const touched = useRef(initial.query.length > 0)
  const committed = useRef(initial.query)
  const working = useRef(false)
  const onOpenRef = useRef(config.onOpen)
  onOpenRef.current = config.onOpen
  const prefetchRef = useRef(config.prefetch)
  prefetchRef.current = config.prefetch
  const onEscapeRef = useRef(config.onEscape)
  onEscapeRef.current = config.onEscape
  const augmentRef = useRef(augment)
  augmentRef.current = augment

  const setQuery = useCallback(
    (next: string) => {
      touched.current = true
      search.setQuery(next)
    },
    [search],
  )
  const clear = useCallback(() => setQuery(''), [setQuery])
  const focus = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  // Nothing in the URL: offer back what was typed elsewhere, once, on mount.
  useEffect(() => {
    if (!rememberKey || touched.current || !hasStorage()) return
    let alive = true
    storageGet<Remembered | null>(rememberKey)
      .then((saved) => {
        if (!alive || touched.current || !saved) return
        if (typeof saved.q !== 'string' || typeof saved.at !== 'number') return
        if (Date.now() - saved.at <= rememberMs && saved.q) search.setQuery(saved.q)
      })
      .catch((error: unknown) => {
        console.debug('search session: could not recall the query', error)
      })
    return () => {
      alive = false
    }
  }, [])

  // A plain-anchor link becomes the `#q=` form at once.
  useEffect(() => {
    if (syncUrl && initial.legacy) writeHashQuery(initial.query, 'replace')
  }, [syncUrl, initial])

  // Back/Forward (or a hand-edited hash) restores that search.
  useEffect(() => {
    if (!syncUrl) return
    const onHash = (): void => {
      const next = readHashQuery(undefined, { legacyField: legacyHashField })
      if (next.legacy) writeHashQuery(next.query, 'replace')
      committed.current = next.query
      working.current = false
      touched.current = true
      search.setQuery(next.query)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [syncUrl, legacyHashField, search])

  // Mirror the text to the hash and to storage after typing pauses.
  useEffect(() => {
    if (!touched.current) return
    const timer = setTimeout(() => {
      if (syncUrl && search.query !== committed.current) {
        writeHashQuery(search.query, working.current ? 'replace' : 'push')
        working.current = true
      }
      if (rememberKey && hasStorage()) {
        const value = search.query.trim() ? { q: search.query, at: Date.now() } : null
        storageSet<Remembered | null>(rememberKey, value).catch((error: unknown) => {
          console.debug('search session: could not remember the query', error)
        })
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [search.query, syncUrl, rememberKey])

  const commit = useCallback(() => {
    if (syncUrl) writeHashQuery(search.query, 'replace')
    committed.current = search.query
    working.current = false
  }, [syncUrl, search.query])

  const open = useCallback(
    (doc: T) => {
      commit()
      onOpenRef.current(doc)
    },
    [commit],
  )
  const prefetch = useCallback((doc: T) => prefetchRef.current?.(doc), [])

  // Extra hits from elsewhere, appended after the index's own.
  const [related, setRelated] = useState<{ raw: string; docs: T[] }>({ raw: '', docs: [] })
  const wanted = Boolean(augment) && augmentWhen(search.parsed)
  const raw = search.parsed.raw
  useEffect(() => {
    if (!wanted) return
    const controller = new AbortController()
    const parsed = search.parsed
    const timer = setTimeout(() => {
      const fn = augmentRef.current
      if (!fn) return
      fn(parsed, controller.signal)
        .then((extra) => {
          if (!controller.signal.aborted) setRelated({ raw: parsed.raw, docs: extra ?? [] })
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) console.debug('search session: augment failed', error)
        })
    }, augmentDelayMs)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // The parsed object changes with the raw text; keying on raw avoids double runs.
  }, [wanted, raw, augmentDelayMs])

  const hits = useMemo<SessionHit<T>[]>(() => {
    const own: SessionHit<T>[] = search.hits
    if (!wanted || related.raw !== raw || !related.docs.length) return own
    const seen = new Set(own.map((h) => h.id))
    const extra: SessionHit<T>[] = []
    for (const doc of related.docs) {
      const id = String(doc[options.idField])
      if (seen.has(id)) continue
      seen.add(id)
      extra.push({ id, score: 0, doc, terms: [], fields: [], related: true })
    }
    return extra.length ? [...own, ...extra] : own
  }, [search.hits, wanted, related, raw, options.idField])

  const nav = useListNavigation({
    count: hits.length,
    onSelect: (i) => {
      const hit = hits[i]
      if (hit) open(hit.doc)
    },
    onEscape: () => {
      if (search.query) clear()
      else if (onEscapeRef.current) onEscapeRef.current()
      else inputRef.current?.blur()
    },
  })
  const { reset } = nav
  useEffect(() => {
    reset()
  }, [search.query, reset])

  const ranked = search.parsed.text.trim().length > 0 || search.parsed.phrases.length > 0
  // Warm the pages of the first few hits once results settle.
  useEffect(() => {
    if (!ranked || !hits.length || !prefetchRef.current) return
    const timer = setTimeout(() => {
      for (const hit of hits.slice(0, 5)) prefetchRef.current?.(hit.doc)
    }, 300)
    return () => clearTimeout(timer)
  }, [hits, ranked])

  const removeFilter = useCallback(
    (i: number) => {
      const { filters, ...rest } = search.parsed
      setQuery(formatQuery({ ...rest, filters: filters.filter((_, k) => k !== i) }))
      focus()
    },
    [search.parsed, setQuery, focus],
  )

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
