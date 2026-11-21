// @vitest-environment jsdom
/**
 * Unit tests for the Solid client-search primitives, ported from
 * `@molecule/app-client-search-react`'s own suite: the same test names, the
 * same assertions, with a signal standing in for a re-render.
 *
 * @module
 */
import { createRoot, createSignal } from 'solid-js'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/app-client-search'
import { provider } from '@molecule/app-client-search-minisearch'

import { useClientSearch } from '../useClientSearch.js'
import { useClientSearchIndex } from '../useClientSearchIndex.js'
import { useListNavigation } from '../useListNavigation.js'

interface Doc extends Record<string, unknown> {
  id: string
  name: string
  category: string
}

const DOCS: Doc[] = [
  { id: '1', name: 'auth sessions', category: 'auth' },
  { id: '2', name: 'oauth google', category: 'auth' },
  { id: '3', name: 'stripe payments', category: 'payments' },
]
const OPTIONS = { idField: 'id', fields: ['name'], filterFields: ['category'] }

beforeAll(() => {
  setProvider(provider)
})

const roots: Array<() => void> = []
afterEach(() => {
  for (const dispose of roots.splice(0)) dispose()
  vi.useRealTimers()
})

/**
 * Runs a primitive in a reactive root, the way a component body runs it: what
 * it memoizes and effects it creates are disposed when the root is.
 *
 * @param use - The primitive call.
 * @returns Its result.
 */
function run<R>(use: () => R): R {
  let value!: R
  roots.push(
    createRoot((dispose) => {
      value = use()
      return dispose
    }),
  )
  return value
}

/** A key press as the key handler receives it. */
const key = (k: string, extra: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: k, cancelable: true, ...extra })

describe('useClientSearchIndex', () => {
  it('builds once per list identity and is null without docs', () => {
    const [docs, setDocs] = createSignal<Doc[] | null>(null)
    const index = run(() => useClientSearchIndex(docs, OPTIONS))
    expect(index()).toBeNull()
    setDocs(() => DOCS)
    const first = index()
    expect(first?.size).toBe(3)
    setDocs(() => DOCS)
    expect(index()).toBe(first)
    setDocs(() => [...DOCS])
    expect(index()).not.toBe(first)
  })
})

describe('useClientSearch', () => {
  it('searches on every change, parses filters, and browses on blank text', () => {
    const h = run(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      return useClientSearch(index, { limit: 10 })
    })
    expect(h.hits().map((x) => x.id)).toEqual(['1', '2', '3'])
    expect(h.active()).toBe(false)
    h.setQuery('category:auth google')
    expect(h.query()).toBe('category:auth google')
    expect(h.parsed().filters).toEqual([{ field: 'category', values: ['auth'] }])
    expect(h.hits().map((x) => x.id)).toEqual(['2'])
    expect(h.active()).toBe(true)
    h.clear()
    expect(h.hits().length).toBe(3)
  })

  it('starts from the initial query and returns no hits without an index', () => {
    const h = run(() => useClientSearch<Doc>(null, { initialQuery: 'stripe' }))
    expect(h.query()).toBe('stripe')
    expect(h.hits()).toEqual([])
  })

  it('debounces when asked', () => {
    vi.useFakeTimers()
    const h = run(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      return useClientSearch(index, { debounceMs: 100 })
    })
    h.setQuery('stripe')
    expect(h.query()).toBe('stripe')
    expect(h.hits().length).toBe(3)
    vi.advanceTimersByTime(120)
    expect(h.hits().map((x) => x.id)).toEqual(['3'])
  })
})

describe('useListNavigation', () => {
  it('moves with arrows, wraps, jumps, selects and escapes', () => {
    const onSelect = vi.fn()
    const onEscape = vi.fn()
    const nav = run(() => useListNavigation(() => ({ count: 3, onSelect, onEscape })))
    expect(nav.activeIndex()).toBe(-1)
    nav.onKeyDown(key('ArrowDown'))
    expect(nav.activeIndex()).toBe(0)
    nav.onKeyDown(key('ArrowUp'))
    expect(nav.activeIndex()).toBe(2)
    nav.onKeyDown(key('End'))
    expect(nav.activeIndex()).toBe(2)
    nav.onKeyDown(key('ArrowDown'))
    expect(nav.activeIndex()).toBe(0)
    nav.onKeyDown(key('Home'))
    nav.onKeyDown(key('Enter'))
    expect(onSelect).toHaveBeenCalledWith(0)
    nav.onKeyDown(key('Escape'))
    expect(onEscape).toHaveBeenCalled()
    nav.reset()
    expect(nav.activeIndex()).toBe(-1)
  })

  it('ignores modifier combos and Enter with nothing active, and clamps when the list shrinks', () => {
    const onSelect = vi.fn()
    const [count, setCount] = createSignal(3)
    const nav = run(() => useListNavigation(() => ({ count: count(), onSelect, loop: false })))
    nav.onKeyDown(key('Enter'))
    expect(onSelect).not.toHaveBeenCalled()
    nav.onKeyDown(key('ArrowDown', { metaKey: true }))
    expect(nav.activeIndex()).toBe(-1)
    nav.onKeyDown(key('End'))
    expect(nav.activeIndex()).toBe(2)
    nav.onKeyDown(key('ArrowDown'))
    expect(nav.activeIndex()).toBe(2)
    setCount(1)
    expect(nav.activeIndex()).toBe(0)
    setCount(0)
    expect(nav.activeIndex()).toBe(-1)
  })
})
