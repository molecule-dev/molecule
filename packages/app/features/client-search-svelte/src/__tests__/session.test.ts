// @vitest-environment jsdom
/**
 * Unit tests for `useSearchSession` and the `#q=` hash helpers, ported from
 * `@molecule/app-client-search-react`'s own suite: the same test names, the
 * same assertions.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { get, type Readable } from 'svelte/store'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/app-client-search'
import { provider } from '@molecule/app-client-search-minisearch'

import { hashForQuery, readHashQuery, writeHashQuery } from '../hashQuery.js'
import type { SearchSession } from '../types.js'
import { useSearchSession } from '../useSearchSession.js'
import HookProbe from './HookProbe.svelte'

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

/** The mounted probes; torn down after every test, like React's roots. */
const instances: Array<Record<string, unknown>> = []
afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
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

  it('starts from the hash, mirrors typing back to it, and opens a hit on Enter', () => {
    window.history.replaceState(null, '', '/list#q=stripe')
    const onOpen = vi.fn()
    let h!: Readable<SearchSession<Doc>>
    mountProbe(() => {
      h = useSearchSession<Doc>({ docs: DOCS, options: OPTIONS, onOpen })
    })
    expect(get(h).query).toBe('stripe')
    expect(get(h).hits.map((x) => x.id)).toEqual(['c'])
    get(h).setQuery('auth')
    vi.advanceTimersByTime(200)
    expect(window.location.hash).toBe('#q=auth')
    get(h).onKeyDown(key('ArrowDown'))
    get(h).onKeyDown(key('Enter'))
    expect(onOpen).toHaveBeenCalledWith(DOCS[0])
  })

  it('reads a plain anchor as a filter and rewrites the hash', () => {
    window.history.replaceState(null, '', '/list#auth')
    let h!: Readable<SearchSession<Doc>>
    mountProbe(() => {
      h = useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        legacyHashField: 'category',
      })
    })
    expect(get(h).query).toBe('category:auth')
    expect(get(h).hits.map((x) => x.id)).toEqual(['a', 'b'])
    expect(window.location.hash).toBe('#q=category%3Aauth')
    get(h).removeFilter(0)
    expect(get(h).query).toBe('')
  })

  it('appends augmented hits after typing pauses, marked related, skipping duplicates', async () => {
    const augment = vi.fn(async () => [DOCS[2], DOCS[0]])
    let h!: Readable<SearchSession<Doc>>
    mountProbe(() => {
      h = useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        augment,
        syncUrl: false,
      })
    })
    get(h).setQuery('auth sessions')
    expect(augment).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(augment).toHaveBeenCalledTimes(1)
    const ids = get(h).hits.map((x) => [x.id, Boolean(x.related)])
    expect(ids).toEqual([
      ['a', false],
      ['c', true],
    ])
    get(h).setQuery('auth')
    expect(get(h).hits.every((x) => !x.related)).toBe(true)
  })

  it('leads with augmented hits when no record holds every word typed', async () => {
    const augment = vi.fn(async () => [DOCS[2], DOCS[0]])
    let h!: Readable<SearchSession<Doc>>
    mountProbe(() => {
      h = useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        augment,
        syncUrl: false,
      })
    })
    // "google" and "payments" each match one record; nothing matches both.
    get(h).setQuery('google payments')
    expect(
      get(h)
        .hits.map((x) => x.id)
        .sort(),
    ).toEqual(['b', 'c'])
    await vi.advanceTimersByTimeAsync(300)
    expect(get(h).hits.map((x) => [x.id, Boolean(x.related)])).toEqual([
      ['c', true],
      ['a', true],
      ['b', false],
    ])
  })

  it('warms the top hits once results settle', () => {
    const prefetch = vi.fn()
    let h!: Readable<SearchSession<Doc>>
    mountProbe(() => {
      h = useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        prefetch,
        syncUrl: false,
      })
    })
    get(h).setQuery('auth')
    vi.advanceTimersByTime(400)
    expect(prefetch).toHaveBeenCalledWith(DOCS[0])
    expect(prefetch).toHaveBeenCalledWith(DOCS[1])
  })
})
