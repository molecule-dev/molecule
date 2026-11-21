// @vitest-environment jsdom
/**
 * Unit tests for `useSearchSession` and the `#q=` hash helpers, ported from
 * `@molecule/app-client-search-react`'s own suite: the same test names, the
 * same assertions.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/app-client-search'
import { provider } from '@molecule/app-client-search-minisearch'

import { hashForQuery, readHashQuery, writeHashQuery } from '../hashQuery.js'
import { useSearchSession } from '../useSearchSession.js'

interface Doc extends Record<string, unknown> {
  id: string
  name: string
  category: string
}
const DOCS: Doc[] = [
  { id: 'a', name: 'auth sessions', category: 'auth' },
  { id: 'b', name: 'oauth google', category: 'auth' },
  { id: 'c', name: 'stripe payments', category: 'payments' },
]
const OPTIONS = { idField: 'id', fields: ['name'], filterFields: ['category'] }

beforeAll(() => setProvider(provider))

/** Hosts defined so far (each needs its own selector). */
let hostCount = 0

/** A mounted hook call: its result and a change-detection pass. */
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
    selector: `mol-client-search-session-${++hostCount}`,
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
const key = (k: string): KeyboardEvent => new KeyboardEvent('keydown', { key: k, cancelable: true })

describe('hash query', () => {
  it('reads #q=, tolerates a bad escape, and turns a plain anchor into a filter only when asked', () => {
    expect(readHashQuery('#q=user%20feedback')).toEqual({ query: 'user feedback', legacy: false })
    expect(readHashQuery('#q=%E0%A4%A')).toEqual({ query: '', legacy: false })
    expect(readHashQuery('#auth')).toEqual({ query: '', legacy: false })
    expect(readHashQuery('#auth', { legacyField: 'category' })).toEqual({
      query: 'category:auth',
      legacy: true,
    })
    expect(readHashQuery('#a=b', { legacyField: 'category' })).toEqual({ query: '', legacy: false })
    expect(readHashQuery('')).toEqual({ query: '', legacy: false })
  })

  it('formats and writes the hash without scrolling, pushing only when asked', () => {
    expect(hashForQuery('  ')).toBe('')
    expect(hashForQuery('a b')).toBe('#q=a%20b')
    const before = window.history.length
    writeHashQuery('one')
    expect(window.location.hash).toBe('#q=one')
    expect(window.history.length).toBe(before)
    writeHashQuery('two', 'push')
    expect(window.location.hash).toBe('#q=two')
    expect(window.history.length).toBe(before + 1)
    writeHashQuery('')
    expect(window.location.hash).toBe('')
  })
})

describe('useSearchSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from the hash, mirrors typing back to it, and opens a hit on Enter', async () => {
    window.history.replaceState(null, '', '/list#q=stripe')
    const onOpen = vi.fn()
    const m = await mount(() => useSearchSession<Doc>({ docs: DOCS, options: OPTIONS, onOpen }))
    expect(m.value.query()).toBe('stripe')
    expect(m.value.hits().map((x) => x.id)).toEqual(['c'])
    m.value.setQuery('auth')
    await m.tick()
    vi.advanceTimersByTime(200)
    expect(window.location.hash).toBe('#q=auth')
    m.value.onKeyDown(key('ArrowDown'))
    m.value.onKeyDown(key('Enter'))
    expect(onOpen).toHaveBeenCalledWith(DOCS[0])
  })

  it('reads a plain anchor as a filter and rewrites the hash', async () => {
    window.history.replaceState(null, '', '/list#auth')
    const m = await mount(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        legacyHashField: 'category',
      }),
    )
    expect(m.value.query()).toBe('category:auth')
    expect(m.value.hits().map((x) => x.id)).toEqual(['a', 'b'])
    expect(window.location.hash).toBe('#q=category%3Aauth')
    m.value.removeFilter(0)
    expect(m.value.query()).toBe('')
  })

  it('appends augmented hits after typing pauses, marked related, skipping duplicates', async () => {
    const augment = vi.fn(async () => [DOCS[2], DOCS[0]])
    const m = await mount(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        augment,
        syncUrl: false,
      }),
    )
    m.value.setQuery('auth sessions')
    expect(augment).not.toHaveBeenCalled()
    await m.tick()
    await vi.advanceTimersByTimeAsync(300)
    expect(augment).toHaveBeenCalledTimes(1)
    const ids = m.value.hits().map((x) => [x.id, Boolean(x.related)])
    expect(ids).toEqual([
      ['a', false],
      ['c', true],
    ])
    m.value.setQuery('auth')
    expect(m.value.hits().every((x) => !x.related)).toBe(true)
  })

  it('leads with augmented hits when no record holds every word typed', async () => {
    const augment = vi.fn(async () => [DOCS[2], DOCS[0]])
    const m = await mount(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        augment,
        syncUrl: false,
      }),
    )
    // "google" and "payments" each match one record; nothing matches both.
    m.value.setQuery('google payments')
    expect(
      m.value
        .hits()
        .map((x) => x.id)
        .sort(),
    ).toEqual(['b', 'c'])
    await m.tick()
    await vi.advanceTimersByTimeAsync(300)
    expect(m.value.hits().map((x) => [x.id, Boolean(x.related)])).toEqual([
      ['c', true],
      ['a', true],
      ['b', false],
    ])
  })

  it('warms the top hits once results settle', async () => {
    const prefetch = vi.fn()
    const m = await mount(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        prefetch,
        syncUrl: false,
      }),
    )
    m.value.setQuery('auth')
    await m.tick()
    vi.advanceTimersByTime(400)
    expect(prefetch).toHaveBeenCalledWith(DOCS[0])
    expect(prefetch).toHaveBeenCalledWith(DOCS[1])
  })
})
