// @vitest-environment jsdom
/**
 * Unit tests for the Svelte client-search hooks, ported from
 * `@molecule/app-client-search-react`'s own suite: the same test names, the
 * same assertions, with a store standing in for a re-render.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ClientSearchIndex } from '@molecule/app-client-search'
import { setProvider } from '@molecule/app-client-search'
import { provider } from '@molecule/app-client-search-minisearch'

import type { ClientSearchState, ListNavigation } from '../types.js'
import { useClientSearch } from '../useClientSearch.js'
import { useClientSearchIndex } from '../useClientSearchIndex.js'
import { useListNavigation } from '../useListNavigation.js'
import HookProbe from './HookProbe.svelte'

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

/** The mounted probes; torn down after every test, like React's roots. */
const instances: Array<Record<string, unknown>> = []
afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  vi.useRealTimers()
})

/**
 * Mounts a component whose init calls one hook, the way an app does.
 *
 * @param call - The init body.
 */
function mountProbe(call: () => void): void {
  instances.push(
    mount(HookProbe, {
      target: document.createElement('div'),
      props: { call },
    }),
  )
  flushSync()
}

/** A key press as the key handler receives it. */
const key = (k: string, extra: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: k, cancelable: true, ...extra })

describe('useClientSearchIndex', () => {
  it('builds once per list identity and is null without docs', () => {
    const docs = writable<Doc[] | null>(null)
    let index!: Readable<ClientSearchIndex<Doc> | null>
    mountProbe(() => {
      index = useClientSearchIndex(docs, OPTIONS)
    })
    expect(get(index)).toBeNull()
    docs.set(DOCS)
    const first = get(index)
    expect(first?.size).toBe(3)
    docs.set(DOCS)
    expect(get(index)).toBe(first)
    docs.set([...DOCS])
    expect(get(index)).not.toBe(first)
  })
})

describe('useClientSearch', () => {
  it('searches on every change, parses filters, and browses on blank text', () => {
    let h!: Readable<ClientSearchState<Doc>>
    mountProbe(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      h = useClientSearch(index, { limit: 10 })
    })
    expect(get(h).hits.map((x) => x.id)).toEqual(['1', '2', '3'])
    expect(get(h).active).toBe(false)
    get(h).setQuery('category:auth google')
    expect(get(h).query).toBe('category:auth google')
    expect(get(h).parsed.filters).toEqual([{ field: 'category', values: ['auth'] }])
    expect(get(h).hits.map((x) => x.id)).toEqual(['2'])
    expect(get(h).active).toBe(true)
    get(h).clear()
    expect(get(h).hits.length).toBe(3)
  })

  it('starts from the initial query and returns no hits without an index', () => {
    let h!: Readable<ClientSearchState<Doc>>
    mountProbe(() => {
      h = useClientSearch<Doc>(null, { initialQuery: 'stripe' })
    })
    expect(get(h).query).toBe('stripe')
    expect(get(h).hits).toEqual([])
  })

  it('debounces when asked', () => {
    vi.useFakeTimers()
    let h!: Readable<ClientSearchState<Doc>>
    mountProbe(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      h = useClientSearch(index, { debounceMs: 100 })
    })
    get(h).setQuery('stripe')
    expect(get(h).query).toBe('stripe')
    expect(get(h).hits.length).toBe(3)
    vi.advanceTimersByTime(120)
    expect(get(h).hits.map((x) => x.id)).toEqual(['3'])
  })
})

describe('useListNavigation', () => {
  it('moves with arrows, wraps, jumps, selects and escapes', () => {
    const onSelect = vi.fn()
    const onEscape = vi.fn()
    let nav!: Readable<ListNavigation>
    mountProbe(() => {
      nav = useListNavigation({ count: 3, onSelect, onEscape })
    })
    expect(get(nav).activeIndex).toBe(-1)
    get(nav).onKeyDown(key('ArrowDown'))
    expect(get(nav).activeIndex).toBe(0)
    get(nav).onKeyDown(key('ArrowUp'))
    expect(get(nav).activeIndex).toBe(2)
    get(nav).onKeyDown(key('End'))
    expect(get(nav).activeIndex).toBe(2)
    get(nav).onKeyDown(key('ArrowDown'))
    expect(get(nav).activeIndex).toBe(0)
    get(nav).onKeyDown(key('Home'))
    get(nav).onKeyDown(key('Enter'))
    expect(onSelect).toHaveBeenCalledWith(0)
    get(nav).onKeyDown(key('Escape'))
    expect(onEscape).toHaveBeenCalled()
    get(nav).reset()
    expect(get(nav).activeIndex).toBe(-1)
  })

  it('ignores modifier combos and Enter with nothing active, and clamps when the list shrinks', () => {
    const onSelect = vi.fn()
    const count = writable(3)
    let nav!: Readable<ListNavigation>
    mountProbe(() => {
      nav = useListNavigation({
        subscribe: (run) =>
          count.subscribe((value) => run({ count: value, onSelect, loop: false })),
      })
    })
    get(nav).onKeyDown(key('Enter'))
    expect(onSelect).not.toHaveBeenCalled()
    get(nav).onKeyDown(key('ArrowDown', { metaKey: true }))
    expect(get(nav).activeIndex).toBe(-1)
    get(nav).onKeyDown(key('End'))
    expect(get(nav).activeIndex).toBe(2)
    get(nav).onKeyDown(key('ArrowDown'))
    expect(get(nav).activeIndex).toBe(2)
    count.set(1)
    expect(get(nav).activeIndex).toBe(0)
    count.set(0)
    expect(get(nav).activeIndex).toBe(-1)
  })
})
