// @vitest-environment jsdom
/**
 * Unit tests for the Vue client-search composables, ported from
 * `@molecule/app-client-search-react`'s own suite: the same test names, the
 * same assertions, with the reactive arguments Vue follows instead of a
 * re-render.
 *
 * @module
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { type EffectScope, effectScope, nextTick, shallowRef } from 'vue'

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

let scope: EffectScope | null = null
afterEach(() => {
  scope?.stop()
  scope = null
  vi.useRealTimers()
})

/**
 * Runs a composable in a detached effect scope, the way a component's setup
 * runs it: what it watches is stopped when the scope stops.
 *
 * @param use - The composable call.
 * @returns Its result.
 */
function run<R>(use: () => R): R {
  scope = effectScope(true)
  return scope.run(use) as R
}

/** A key press as the key handler receives it. */
const key = (k: string, extra: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: k, cancelable: true, ...extra })

describe('useClientSearchIndex', () => {
  it('builds once per list identity and is null without docs', () => {
    const docs = shallowRef<Doc[] | null>(null)
    const index = run(() => useClientSearchIndex(docs, OPTIONS))
    expect(index.value).toBeNull()
    docs.value = DOCS
    const first = index.value
    expect(first?.size).toBe(3)
    docs.value = DOCS
    expect(index.value).toBe(first)
    docs.value = [...DOCS]
    expect(index.value).not.toBe(first)
  })
})

describe('useClientSearch', () => {
  it('searches on every change, parses filters, and browses on blank text', () => {
    const h = run(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      return useClientSearch(index, { limit: 10 })
    })
    expect(h.hits.value.map((x) => x.id)).toEqual(['1', '2', '3'])
    expect(h.active.value).toBe(false)
    h.setQuery('category:auth google')
    expect(h.query.value).toBe('category:auth google')
    expect(h.parsed.value.filters).toEqual([{ field: 'category', values: ['auth'] }])
    expect(h.hits.value.map((x) => x.id)).toEqual(['2'])
    expect(h.active.value).toBe(true)
    h.clear()
    expect(h.hits.value.length).toBe(3)
  })

  it('starts from the initial query and returns no hits without an index', () => {
    const h = run(() => useClientSearch<Doc>(null, { initialQuery: 'stripe' }))
    expect(h.query.value).toBe('stripe')
    expect(h.hits.value).toEqual([])
  })

  it('debounces when asked', () => {
    vi.useFakeTimers()
    const h = run(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      return useClientSearch(index, { debounceMs: 100 })
    })
    h.setQuery('stripe')
    expect(h.query.value).toBe('stripe')
    expect(h.hits.value.length).toBe(3)
    vi.advanceTimersByTime(120)
    expect(h.hits.value.map((x) => x.id)).toEqual(['3'])
  })
})

describe('useListNavigation', () => {
  it('moves with arrows, wraps, jumps, selects and escapes', () => {
    const onSelect = vi.fn()
    const onEscape = vi.fn()
    const nav = run(() => useListNavigation(() => ({ count: 3, onSelect, onEscape })))
    expect(nav.activeIndex.value).toBe(-1)
    nav.onKeyDown(key('ArrowDown'))
    expect(nav.activeIndex.value).toBe(0)
    nav.onKeyDown(key('ArrowUp'))
    expect(nav.activeIndex.value).toBe(2)
    nav.onKeyDown(key('End'))
    expect(nav.activeIndex.value).toBe(2)
    nav.onKeyDown(key('ArrowDown'))
    expect(nav.activeIndex.value).toBe(0)
    nav.onKeyDown(key('Home'))
    nav.onKeyDown(key('Enter'))
    expect(onSelect).toHaveBeenCalledWith(0)
    nav.onKeyDown(key('Escape'))
    expect(onEscape).toHaveBeenCalled()
    nav.reset()
    expect(nav.activeIndex.value).toBe(-1)
  })

  it('ignores modifier combos and Enter with nothing active, and clamps when the list shrinks', async () => {
    const onSelect = vi.fn()
    const count = shallowRef(3)
    const nav = run(() => useListNavigation(() => ({ count: count.value, onSelect, loop: false })))
    nav.onKeyDown(key('Enter'))
    expect(onSelect).not.toHaveBeenCalled()
    nav.onKeyDown(key('ArrowDown', { metaKey: true }))
    expect(nav.activeIndex.value).toBe(-1)
    nav.onKeyDown(key('End'))
    expect(nav.activeIndex.value).toBe(2)
    nav.onKeyDown(key('ArrowDown'))
    expect(nav.activeIndex.value).toBe(2)
    count.value = 1
    await nextTick()
    expect(nav.activeIndex.value).toBe(0)
    count.value = 0
    await nextTick()
    expect(nav.activeIndex.value).toBe(-1)
  })
})
