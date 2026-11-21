// @vitest-environment jsdom
/**
 * Unit tests for the Angular client-search hooks, ported from
 * `@molecule/app-client-search-react`'s own suite: the same test names, the
 * same assertions, with a signal standing in for a re-render.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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

/** Hosts defined so far (each needs its own selector). */
let hostCount = 0

/** A mounted hook call: its result, a change-detection pass, and teardown. */
interface Mounted<R> {
  /** The hook's result, read once the host's field initializer ran. */
  readonly value: R
  /** Runs change detection, so the hook's effects catch up. */
  tick(): Promise<void>
}

const mounted: Array<() => void> = []
afterEach(() => {
  for (const destroy of mounted.splice(0)) destroy()
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

/**
 * Runs a hook in a component field initializer — an injection context — the way
 * an app calls it, and returns its result.
 *
 * @param use - The hook call.
 * @returns The mounted hook's result and a way to run change detection.
 */
async function mount<R>(use: () => R): Promise<Mounted<R>> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  let value!: R
  const Host = Component({
    selector: `mol-client-search-host-${++hostCount}`,
    standalone: true,
    template: '',
  })(
    class {
      // A field initializer runs in the component's injection context.
      readonly result = (value = use())
    },
  ) as Type<unknown>
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push(() => appRef.destroy())
  return {
    get value(): R {
      return value
    },
    async tick(): Promise<void> {
      appRef.tick()
      await appRef.whenStable()
      appRef.tick()
    },
  }
}

/** A key press as the key handler receives it. */
const key = (k: string, extra: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: k, cancelable: true, ...extra })

describe('useClientSearchIndex', () => {
  it('builds once per list identity and is null without docs', async () => {
    const docs = signal<Doc[] | null>(null)
    const m = await mount(() => useClientSearchIndex(docs, OPTIONS))
    expect(m.value()).toBeNull()
    docs.set(DOCS)
    const first = m.value()
    expect(first?.size).toBe(3)
    docs.set(DOCS)
    expect(m.value()).toBe(first)
    docs.set([...DOCS])
    expect(m.value()).not.toBe(first)
  })
})

describe('useClientSearch', () => {
  it('searches on every change, parses filters, and browses on blank text', async () => {
    const m = await mount(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      return useClientSearch(index, { limit: 10 })
    })
    expect(m.value.hits().map((x) => x.id)).toEqual(['1', '2', '3'])
    expect(m.value.active()).toBe(false)
    m.value.setQuery('category:auth google')
    expect(m.value.query()).toBe('category:auth google')
    expect(m.value.parsed().filters).toEqual([{ field: 'category', values: ['auth'] }])
    expect(m.value.hits().map((x) => x.id)).toEqual(['2'])
    expect(m.value.active()).toBe(true)
    m.value.clear()
    expect(m.value.hits().length).toBe(3)
  })

  it('starts from the initial query and returns no hits without an index', async () => {
    const m = await mount(() => useClientSearch<Doc>(null, { initialQuery: 'stripe' }))
    expect(m.value.query()).toBe('stripe')
    expect(m.value.hits()).toEqual([])
  })

  it('debounces when asked', async () => {
    const m = await mount(() => {
      const index = useClientSearchIndex(DOCS, OPTIONS)
      return useClientSearch(index, { debounceMs: 100 })
    })
    vi.useFakeTimers()
    m.value.setQuery('stripe')
    expect(m.value.query()).toBe('stripe')
    expect(m.value.hits().length).toBe(3)
    vi.advanceTimersByTime(120)
    expect(m.value.hits().map((x) => x.id)).toEqual(['3'])
  })
})

describe('useListNavigation', () => {
  it('moves with arrows, wraps, jumps, selects and escapes', async () => {
    const onSelect = vi.fn()
    const onEscape = vi.fn()
    const m = await mount(() => useListNavigation(() => ({ count: 3, onSelect, onEscape })))
    expect(m.value.activeIndex()).toBe(-1)
    m.value.onKeyDown(key('ArrowDown'))
    expect(m.value.activeIndex()).toBe(0)
    m.value.onKeyDown(key('ArrowUp'))
    expect(m.value.activeIndex()).toBe(2)
    m.value.onKeyDown(key('End'))
    expect(m.value.activeIndex()).toBe(2)
    m.value.onKeyDown(key('ArrowDown'))
    expect(m.value.activeIndex()).toBe(0)
    m.value.onKeyDown(key('Home'))
    m.value.onKeyDown(key('Enter'))
    expect(onSelect).toHaveBeenCalledWith(0)
    m.value.onKeyDown(key('Escape'))
    expect(onEscape).toHaveBeenCalled()
    m.value.reset()
    expect(m.value.activeIndex()).toBe(-1)
  })

  it('ignores modifier combos and Enter with nothing active, and clamps when the list shrinks', async () => {
    const onSelect = vi.fn()
    const count = signal(3)
    const m = await mount(() =>
      useListNavigation(() => ({ count: count(), onSelect, loop: false })),
    )
    m.value.onKeyDown(key('Enter'))
    expect(onSelect).not.toHaveBeenCalled()
    m.value.onKeyDown(key('ArrowDown', { metaKey: true }))
    expect(m.value.activeIndex()).toBe(-1)
    m.value.onKeyDown(key('End'))
    expect(m.value.activeIndex()).toBe(2)
    m.value.onKeyDown(key('ArrowDown'))
    expect(m.value.activeIndex()).toBe(2)
    count.set(1)
    await m.tick()
    expect(m.value.activeIndex()).toBe(0)
    count.set(0)
    await m.tick()
    expect(m.value.activeIndex()).toBe(-1)
  })
})
