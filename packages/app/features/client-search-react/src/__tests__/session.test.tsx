import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  window.history.replaceState(null, '', '/')
})

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
const key = (k: string) =>
  ({
    key: k,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
  }) as unknown as ReactKeyboardEvent

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
    const h = renderHook(() => useSearchSession<Doc>({ docs: DOCS, options: OPTIONS, onOpen }))
    expect(h.value().query).toBe('stripe')
    expect(h.value().hits.map((x) => x.id)).toEqual(['c'])
    act(() => h.value().setQuery('auth'))
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(window.location.hash).toBe('#q=auth')
    act(() => h.value().onKeyDown(key('ArrowDown')))
    act(() => h.value().onKeyDown(key('Enter')))
    expect(onOpen).toHaveBeenCalledWith(DOCS[0])
  })

  it('reads a plain anchor as a filter and rewrites the hash', () => {
    window.history.replaceState(null, '', '/list#auth')
    const h = renderHook(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        legacyHashField: 'category',
      }),
    )
    expect(h.value().query).toBe('category:auth')
    expect(h.value().hits.map((x) => x.id)).toEqual(['a', 'b'])
    expect(window.location.hash).toBe('#q=category%3Aauth')
    act(() => h.value().removeFilter(0))
    expect(h.value().query).toBe('')
  })

  it('appends augmented hits after typing pauses, marked related, skipping duplicates', async () => {
    const augment = vi.fn(async () => [DOCS[2], DOCS[0]])
    const h = renderHook(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        augment,
        syncUrl: false,
      }),
    )
    act(() => h.value().setQuery('auth sessions'))
    expect(augment).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })
    expect(augment).toHaveBeenCalledTimes(1)
    const ids = h.value().hits.map((x) => [x.id, Boolean(x.related)])
    expect(ids).toEqual([
      ['a', false],
      ['c', true],
    ])
    act(() => h.value().setQuery('auth'))
    expect(h.value().hits.every((x) => !x.related)).toBe(true)
  })

  it('warms the top hits once results settle', () => {
    const prefetch = vi.fn()
    const h = renderHook(() =>
      useSearchSession<Doc>({
        docs: DOCS,
        options: OPTIONS,
        onOpen: () => {},
        prefetch,
        syncUrl: false,
      }),
    )
    act(() => h.value().setQuery('auth'))
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(prefetch).toHaveBeenCalledWith(DOCS[0])
    expect(prefetch).toHaveBeenCalledWith(DOCS[1])
  })
})
