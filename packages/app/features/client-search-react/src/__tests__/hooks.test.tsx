import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
})

/** Renders a hook and returns a getter for its latest value plus a rerender. */
function renderHook<R>(use: () => R): { value: () => R; rerender: () => void } {
  let latest: R
  let force = () => {}
  function Probe() {
    const [, tick] = useState(0)
    force = () => tick((n) => n + 1)
    latest = use()
    return null
  }
  const container = document.createElement('div')
  root = createRoot(container)
  act(() => root!.render(createElement(Probe)))
  return { value: () => latest, rerender: () => act(() => force()) }
}

const key = (k: string, extra: Partial<ReactKeyboardEvent> = {}) =>
  ({
    key: k,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    ...extra,
  }) as unknown as ReactKeyboardEvent

describe('useClientSearchIndex', () => {
  it('builds once per list identity and is null without docs', () => {
    let docs: Doc[] | null = null
    const h = renderHook(() => useClientSearchIndex(docs, OPTIONS))
    expect(h.value()).toBeNull()
    docs = DOCS
    h.rerender()
    const first = h.value()
    expect(first?.size).toBe(3)
    h.rerender()
    expect(h.value()).toBe(first)
    docs = [...DOCS]
    h.rerender()
    expect(h.value()).not.toBe(first)
  })
})

describe('useClientSearch', () => {
  it('searches on every change, parses filters, and browses on blank text', () => {
    const h = renderHook(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      return useClientSearch(index, { limit: 10 })
    })
    expect(h.value().hits.map((x) => x.id)).toEqual(['1', '2', '3'])
    expect(h.value().active).toBe(false)
    act(() => h.value().setQuery('category:auth google'))
    expect(h.value().query).toBe('category:auth google')
    expect(h.value().parsed.filters).toEqual([{ field: 'category', values: ['auth'] }])
    expect(h.value().hits.map((x) => x.id)).toEqual(['2'])
    expect(h.value().active).toBe(true)
    act(() => h.value().clear())
    expect(h.value().hits.length).toBe(3)
  })

  it('starts from the initial query and returns no hits without an index', () => {
    const h = renderHook(() => useClientSearch<Doc>(null, { initialQuery: 'stripe' }))
    expect(h.value().query).toBe('stripe')
    expect(h.value().hits).toEqual([])
  })

  it('debounces when asked', () => {
    vi.useFakeTimers()
    try {
      const h = renderHook(() => {
        const index = useClientSearchIndex(DOCS, OPTIONS)
        return useClientSearch(index, { debounceMs: 100 })
      })
      act(() => h.value().setQuery('stripe'))
      expect(h.value().query).toBe('stripe')
      expect(h.value().hits.length).toBe(3)
      act(() => {
        vi.advanceTimersByTime(120)
      })
      expect(h.value().hits.map((x) => x.id)).toEqual(['3'])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useListNavigation', () => {
  it('moves with arrows, wraps, jumps, selects and escapes', () => {
    const onSelect = vi.fn()
    const onEscape = vi.fn()
    const h = renderHook(() => useListNavigation({ count: 3, onSelect, onEscape }))
    expect(h.value().activeIndex).toBe(-1)
    act(() => h.value().onKeyDown(key('ArrowDown')))
    expect(h.value().activeIndex).toBe(0)
    act(() => h.value().onKeyDown(key('ArrowUp')))
    expect(h.value().activeIndex).toBe(2)
    act(() => h.value().onKeyDown(key('End')))
    expect(h.value().activeIndex).toBe(2)
    act(() => h.value().onKeyDown(key('ArrowDown')))
    expect(h.value().activeIndex).toBe(0)
    act(() => h.value().onKeyDown(key('Home')))
    act(() => h.value().onKeyDown(key('Enter')))
    expect(onSelect).toHaveBeenCalledWith(0)
    act(() => h.value().onKeyDown(key('Escape')))
    expect(onEscape).toHaveBeenCalled()
    act(() => h.value().reset())
    expect(h.value().activeIndex).toBe(-1)
  })

  it('ignores modifier combos and Enter with nothing active, and clamps when the list shrinks', () => {
    const onSelect = vi.fn()
    let count = 3
    const h = renderHook(() => useListNavigation({ count, onSelect, loop: false }))
    act(() => h.value().onKeyDown(key('Enter')))
    expect(onSelect).not.toHaveBeenCalled()
    act(() => h.value().onKeyDown(key('ArrowDown', { metaKey: true })))
    expect(h.value().activeIndex).toBe(-1)
    act(() => h.value().onKeyDown(key('End')))
    expect(h.value().activeIndex).toBe(2)
    act(() => h.value().onKeyDown(key('ArrowDown')))
    expect(h.value().activeIndex).toBe(2)
    count = 1
    h.rerender()
    expect(h.value().activeIndex).toBe(0)
    count = 0
    h.rerender()
    expect(h.value().activeIndex).toBe(-1)
  })
})
