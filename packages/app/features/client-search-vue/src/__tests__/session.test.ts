// @vitest-environment jsdom
/**
 * Unit tests for `useSearchSession` and the `#q=` hash helpers, ported from
 * `@molecule/app-client-search-react`'s own suite: the same test names, the
 * same assertions.
 *
 * @module
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type EffectScope, effectScope, nextTick } from 'vue'

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

let scope: EffectScope | null = null
afterEach(() => {
  scope?.stop()
  scope = null
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

/**
 * Runs a composable in a detached effect scope, the way a component's setup
 * runs it: what it watches and listens to is stopped when the scope stops.
 *
 * @param use - The composable call.
 * @returns Its result.
 */
function run<R>(use: () => R): R {
  scope = effectScope(true)
  return scope.run(use) as R
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
    expect(readHashQuery('#a=b', { legacyField: 'category' })).toEqual({
      query: '',
      legacy: false,
    })
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
    const h = run(() => useSearchSession<Doc>({ docs: DOCS, options: OPTIONS, onOpen }))
    expect(h.query.value).toBe('stripe')
    expect(h.hits.value.map((x) => x.id)).toEqual(['c'])
    h.setQuery('auth')
    await nextTick()
    vi.advanceTimersByTime(200)
    expect(window.location.hash).toBe('#q=auth')
    h.onKeyDown(key('ArrowDown'))
    h.onKeyDown(key('Enter'))
    expect(onOpen).toHaveBeenCalledWith(DOCS[0])
  })

  it('reads a plain anchor as a filter and rewrites the hash', () => {
    window.history.replaceState(null, '', '/list#auth')
    const h = run(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        legacyHashField: 'category',
      }),
    )
    expect(h.query.value).toBe('category:auth')
    expect(h.hits.value.map((x) => x.id)).toEqual(['a', 'b'])
    expect(window.location.hash).toBe('#q=category%3Aauth')
    h.removeFilter(0)
    expect(h.query.value).toBe('')
  })

  it('appends augmented hits after typing pauses, marked related, skipping duplicates', async () => {
    const augment = vi.fn(async () => [DOCS[2], DOCS[0]])
    const h = run(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        augment,
        syncUrl: false,
      }),
    )
    h.setQuery('auth sessions')
    expect(augment).not.toHaveBeenCalled()
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(augment).toHaveBeenCalledTimes(1)
    const ids = h.hits.value.map((x) => [x.id, Boolean(x.related)])
    expect(ids).toEqual([
      ['a', false],
      ['c', true],
    ])
    h.setQuery('auth')
    expect(h.hits.value.every((x) => !x.related)).toBe(true)
  })

  it('leads with augmented hits when no record holds every word typed', async () => {
    const augment = vi.fn(async () => [DOCS[2], DOCS[0]])
    const h = run(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        augment,
        syncUrl: false,
      }),
    )
    // "google" and "payments" each match one record; nothing matches both.
    h.setQuery('google payments')
    expect(h.hits.value.map((x) => x.id).sort()).toEqual(['b', 'c'])
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(h.hits.value.map((x) => [x.id, Boolean(x.related)])).toEqual([
      ['c', true],
      ['a', true],
      ['b', false],
    ])
  })

  it('warms the top hits once results settle', async () => {
    const prefetch = vi.fn()
    const h = run(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        prefetch,
        syncUrl: false,
      }),
    )
    h.setQuery('auth')
    await nextTick()
    vi.advanceTimersByTime(400)
    expect(prefetch).toHaveBeenCalledWith(DOCS[0])
    expect(prefetch).toHaveBeenCalledWith(DOCS[1])
  })
})
