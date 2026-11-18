// @vitest-environment jsdom
/**
 * The list lifecycle contract of `keepPreviousData`, driven through the real
 * Solid primitive and both query bonds: a same-principal key change keeps the
 * rows on screen until the next key answers; a principal change, a completed
 * (even empty) answer or a failure never shows the previous key's document —
 * also after the query provider is replaced.
 */
import { batch, createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider, QueryState } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../use-query.js'
import { type Deferred, deferred, renderHook, settle } from './helpers.jsx'

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('useQuery keepPreviousData over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('keeps the previous document while a same-principal key loads', async () => {
    const [key, setKey] = createSignal('page-1')
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key() === 'page-1' ? Promise.resolve(['a', 'b']) : next.promise))
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['list', key()],
        principal: 'public',
        keepPreviousData: true,
        fetch,
      })),
    )
    await settle()
    expect(h.value().data).toEqual(['a', 'b'])

    setKey('page-2')
    await settle()
    expect(h.value().data).toEqual(['a', 'b'])
    expect(h.value().isPreviousData).toBe(true)
    expect(h.value().isFetching).toBe(true)

    next.resolve(['c'])
    await settle()
    expect(h.value().data).toEqual(['c'])
    expect(h.value().isPreviousData).toBeUndefined()
    await h.unmount()
  })

  it('keeps the first page through rapid key changes until the last key answers', async () => {
    const [key, setKey] = createSignal('page-1')
    const pending = new Map<string, Deferred<string[]>>()
    const fetch = vi.fn(() => {
      if (key() === 'page-1') return Promise.resolve(['a'])
      const answer = deferred<string[]>()
      pending.set(key(), answer)
      return answer.promise
    })
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['list', key()],
        principal: 'public',
        keepPreviousData: true,
        fetch,
      })),
    )
    await settle()
    setKey('page-2')
    await settle()
    setKey('page-3')
    await settle()
    expect(h.value().data).toEqual(['a'])
    expect(h.value().isPreviousData).toBe(true)

    // The abandoned page answers late: it is not what the page shows.
    pending.get('page-2')?.resolve(['b'])
    await settle()
    expect(h.value().data).toEqual(['a'])

    pending.get('page-3')?.resolve(['c'])
    await settle()
    expect(h.value().data).toEqual(['c'])
    expect(h.value().isPreviousData).toBeUndefined()
    await h.unmount()
  })

  it('drops the previous document on a principal switch', async () => {
    const [principal, setPrincipal] = createSignal('alice')
    const next = deferred<string[]>()
    const fetch = vi.fn(() =>
      principal() === 'alice' ? Promise.resolve(['alice row']) : next.promise,
    )
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['inbox', principal()],
        principal: principal(),
        keepPreviousData: true,
        fetch,
      })),
    )
    await settle()
    expect(h.value().data).toEqual(['alice row'])

    setPrincipal('bob')
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()

    next.resolve(['bob row'])
    await settle()
    expect(h.value().data).toEqual(['bob row'])
    await h.unmount()
  })

  it('never relabels a document when the principal changes before the key', async () => {
    // The principal is read from the session while the key's account part lags one
    // render behind it (a route param, a profile query, a state synced in an effect).
    const [principal, setPrincipal] = createSignal('alice')
    const [account, setAccount] = createSignal('alice')
    const next = deferred<string[]>()
    const fetch = vi.fn(() =>
      account() === 'alice' ? Promise.resolve(['alice row']) : next.promise,
    )
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['inbox', account()],
        principal: principal(),
        keepPreviousData: true,
        fetch,
      })),
    )
    await settle()
    expect(h.value().data).toEqual(['alice row'])

    setPrincipal('bob')
    await settle()
    setAccount('bob')
    await settle()
    // Alice's answer was observed under Alice: it is not carried into Bob's key.
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()

    next.resolve(['bob row'])
    await settle()
    expect(h.value().data).toEqual(['bob row'])
    await h.unmount()
  })

  it('replaces the previous document with a completed empty response', async () => {
    const [key, setKey] = createSignal('page-1')
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key() === 'page-1' ? Promise.resolve(['a']) : next.promise))
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['list', key()],
        principal: 'public',
        keepPreviousData: true,
        fetch,
      })),
    )
    await settle()
    setKey('page-2')
    await settle()
    expect(h.value().isPreviousData).toBe(true)
    next.resolve([])
    await settle()
    expect(h.value().data).toEqual([])
    expect(h.value().status).toBe('success')
    expect(h.value().isPreviousData).toBeUndefined()
    await h.unmount()
  })

  it('drops the previous document when the next key fails', async () => {
    const [key, setKey] = createSignal('page-1')
    const fetch = vi.fn(() =>
      key() === 'page-1' ? Promise.resolve(['a']) : Promise.reject(new Error('down')),
    )
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['list', key()],
        principal: 'public',
        keepPreviousData: true,
        fetch,
      })),
    )
    await settle()
    setKey('page-2')
    await settle()
    expect(h.value().status).toBe('error')
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    await h.unmount()
  })

  it('forgets the document while the query is disabled', async () => {
    const [enabled, setEnabled] = createSignal(true)
    const [key, setKey] = createSignal('page-1')
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key() === 'page-1' ? Promise.resolve(['a']) : next.promise))
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> | null =>
        enabled()
          ? { key: ['list', key()], principal: 'public', keepPreviousData: true, fetch }
          : null,
      ),
    )
    await settle()
    setEnabled(false)
    await settle()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()

    // One render re-enables with the next page: both changes land together,
    // the way React re-renders with both at once.
    batch(() => {
      setEnabled(true)
      setKey('page-2')
    })
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    await h.unmount()
  })

  it('stops showing the previous document as soon as the option is turned off', async () => {
    const [key, setKey] = createSignal('page-1')
    const [keep, setKeep] = createSignal(true)
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key() === 'page-1' ? Promise.resolve(['a']) : next.promise))
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['list', key()],
        principal: 'public',
        keepPreviousData: keep(),
        fetch,
      })),
    )
    await settle()
    setKey('page-2')
    await settle()
    expect(h.value().isPreviousData).toBe(true)

    setKeep(false)
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    next.resolve(['c'])
    await settle()
    expect(h.value().data).toEqual(['c'])
    await h.unmount()
  })

  it('applies the same rules after the query provider is replaced', async () => {
    // A bond replaced at runtime: the next key is answered by the new provider's
    // client, and the rows kept meanwhile are still only the same principal's.
    const [principal, setPrincipal] = createSignal('alice')
    const [key, setKey] = createSignal('page-1')
    const pending = new Map<string, Deferred<string[]>>()
    const fetch = vi.fn(() => {
      if (key() === 'page-1') return Promise.resolve([`${principal()} 1`])
      const answer = deferred<string[]>()
      pending.set(`${principal()}/${key()}`, answer)
      return answer.promise
    })
    const h = renderHook(() =>
      useQuery((): QueryOptions<string[]> => ({
        key: ['list', principal(), key()],
        principal: principal(),
        keepPreviousData: true,
        fetch,
      })),
    )
    await settle()
    expect(h.value().data).toEqual(['alice 1'])

    setProvider(bond === memoryProvider ? tanstackProvider : memoryProvider)
    setKey('page-2')
    await settle()
    expect(h.value().data).toEqual(['alice 1'])
    expect(h.value().isPreviousData).toBe(true)
    pending.get('alice/page-2')?.resolve(['alice 2'])
    await settle()
    expect(h.value().data).toEqual(['alice 2'])
    expect(h.value().isPreviousData).toBeUndefined()

    setProvider(bond)
    // One render switches both at once, the way React re-renders with both.
    batch(() => {
      setPrincipal('bob')
      setKey('page-3')
    })
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    pending.get('bob/page-3')?.resolve(['bob 3'])
    await settle()
    expect(h.value().data).toEqual(['bob 3'])
    await h.unmount()
  })

  it('refuses retention without a principal', () => {
    // A caller that asserts a principal it does not have yet (a signed-in id read
    // before sign-in finishes): the types are satisfied, so only the hook's own
    // runtime guard stops it.
    const session: { userId?: string } = {}
    expect(() =>
      renderHook(() =>
        useQuery({
          key: ['list'],
          keepPreviousData: true,
          principal: session.userId!,
          fetch: async () => [],
        }),
      ),
    ).toThrow(/keepPreviousData requires principal/)
  })

  it('a key change without opting in still resets to the new key state', async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    const [key, setKey] = createSignal('a')
    const answer = deferred<string>()
    const h = renderHook((): QueryState<string> =>
      useQuery((): QueryOptions<string> => ({
        key: ['doc', key()],
        fetch: () => answer.promise,
      })),
    )
    expect(h.value().data).toBe('A')
    setKey('b')
    await h.rerender()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    answer.resolve('B')
    await settle()
    await h.unmount()
  })
})
