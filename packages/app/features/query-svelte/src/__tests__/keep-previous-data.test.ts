// @vitest-environment jsdom
/**
 * The list lifecycle contract of `keepPreviousData`, driven through the real
 * hook and both query bonds: a same-principal key change keeps the rows on
 * screen until the next key answers; a principal change, a completed (even
 * empty) answer or a failure never shows the previous key's document — also
 * after the query provider is replaced. Ported from `@molecule/app-query-react`'s
 * own suite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import {
  type Deferred,
  deferred,
  type MountedQuery,
  renderHook,
  settle,
} from './helpers/harness.js'

/** The mounted hooks, unmounted after every test the way React's roots are. */
const mounted: MountedQuery<unknown>[] = []
afterEach(async () => {
  for (const hook of mounted.splice(0)) await hook.unmount()
})

/** Mounts the hook and tracks it for the afterEach cleanup. */
function hook<T>(initial: QueryOptions<T> | null): MountedQuery<T> {
  const mountedQuery = renderHook<T>(initial)
  mounted.push(mountedQuery as MountedQuery<unknown>)
  return mountedQuery
}

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('useQuery keepPreviousData over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('keeps the previous document while a same-principal key loads', async () => {
    let key = 'page-1'
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key === 'page-1' ? Promise.resolve(['a', 'b']) : next.promise))
    const h = hook({
      key: ['list', key],
      principal: 'public',
      keepPreviousData: true,
      fetch,
    })
    await settle()
    expect(h.value().data).toEqual(['a', 'b'])

    key = 'page-2'
    h.setOptions({ key: ['list', key], principal: 'public', keepPreviousData: true, fetch })
    await settle()
    expect(h.value().data).toEqual(['a', 'b'])
    expect(h.value().isPreviousData).toBe(true)
    expect(h.value().isFetching).toBe(true)

    next.resolve(['c'])
    await settle()
    expect(h.value().data).toEqual(['c'])
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('keeps the first page through rapid key changes until the last key answers', async () => {
    let key = 'page-1'
    const pending = new Map<string, Deferred<string[]>>()
    const fetch = vi.fn(() => {
      if (key === 'page-1') return Promise.resolve(['a'])
      const answer = deferred<string[]>()
      pending.set(key, answer)
      return answer.promise
    })
    const options = (): QueryOptions<string[]> => ({
      key: ['list', key],
      principal: 'public',
      keepPreviousData: true,
      fetch,
    })
    const h = hook(options())
    await settle()
    key = 'page-2'
    h.setOptions(options())
    await settle()
    key = 'page-3'
    h.setOptions(options())
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
  })

  it('drops the previous document on a principal switch', async () => {
    let principal = 'alice'
    const next = deferred<string[]>()
    const fetch = vi.fn(() =>
      principal === 'alice' ? Promise.resolve(['alice row']) : next.promise,
    )
    const h = hook({ key: ['inbox', principal], principal, keepPreviousData: true, fetch })
    await settle()
    expect(h.value().data).toEqual(['alice row'])

    principal = 'bob'
    h.setOptions({ key: ['inbox', principal], principal, keepPreviousData: true, fetch })
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()

    next.resolve(['bob row'])
    await settle()
    expect(h.value().data).toEqual(['bob row'])
  })

  it('never relabels a document when the principal changes before the key', async () => {
    // The principal is read from the session while the key's account part lags one
    // update behind it (a route param, a profile query, a state synced in an effect).
    let principal = 'alice'
    let account = 'alice'
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (account === 'alice' ? Promise.resolve(['alice row']) : next.promise))
    const options = (): QueryOptions<string[]> => ({
      key: ['inbox', account],
      principal,
      keepPreviousData: true,
      fetch,
    })
    const h = hook(options())
    await settle()
    expect(h.value().data).toEqual(['alice row'])

    principal = 'bob'
    h.setOptions(options())
    await settle()
    account = 'bob'
    h.setOptions(options())
    await settle()
    // Alice's answer was observed under Alice: it is not carried into Bob's key.
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()

    next.resolve(['bob row'])
    await settle()
    expect(h.value().data).toEqual(['bob row'])
  })

  it('replaces the previous document with a completed empty response', async () => {
    let key = 'page-1'
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key === 'page-1' ? Promise.resolve(['a']) : next.promise))
    const h = hook({ key: ['list', key], principal: 'public', keepPreviousData: true, fetch })
    await settle()
    key = 'page-2'
    h.setOptions({ key: ['list', key], principal: 'public', keepPreviousData: true, fetch })
    await settle()
    expect(h.value().isPreviousData).toBe(true)
    next.resolve([])
    await settle()
    expect(h.value().data).toEqual([])
    expect(h.value().status).toBe('success')
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('drops the previous document when the next key fails', async () => {
    let key = 'page-1'
    const fetch = vi.fn(() =>
      key === 'page-1' ? Promise.resolve(['a']) : Promise.reject(new Error('down')),
    )
    const h = hook({ key: ['list', key], principal: 'public', keepPreviousData: true, fetch })
    await settle()
    key = 'page-2'
    h.setOptions({ key: ['list', key], principal: 'public', keepPreviousData: true, fetch })
    await settle()
    expect(h.value().status).toBe('error')
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('forgets the document while the query is disabled', async () => {
    let enabled = true
    let key = 'page-1'
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key === 'page-1' ? Promise.resolve(['a']) : next.promise))
    const options = (): QueryOptions<string[]> | null =>
      enabled ? { key: ['list', key], principal: 'public', keepPreviousData: true, fetch } : null
    const h = hook<string[]>(options())
    await settle()
    enabled = false
    h.setOptions(options())
    await settle()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()

    enabled = true
    key = 'page-2'
    h.setOptions(options())
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('stops showing the previous document as soon as the option is turned off', async () => {
    let key = 'page-1'
    let keep = true
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (key === 'page-1' ? Promise.resolve(['a']) : next.promise))
    const options = (): QueryOptions<string[]> => ({
      key: ['list', key],
      principal: 'public',
      keepPreviousData: keep,
      fetch,
    })
    const h = hook(options())
    await settle()
    key = 'page-2'
    h.setOptions(options())
    await settle()
    expect(h.value().isPreviousData).toBe(true)

    keep = false
    h.setOptions(options())
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    next.resolve(['c'])
    await settle()
    expect(h.value().data).toEqual(['c'])
  })

  it('applies the same rules after the query provider is replaced', async () => {
    // A bond replaced at runtime: the next key is answered by the new provider's
    // client, and the rows kept meanwhile are still only the same principal's.
    let principal = 'alice'
    let key = 'page-1'
    const pending = new Map<string, Deferred<string[]>>()
    const fetch = vi.fn(() => {
      if (key === 'page-1') return Promise.resolve([`${principal} 1`])
      const answer = deferred<string[]>()
      pending.set(`${principal}/${key}`, answer)
      return answer.promise
    })
    const options = (): QueryOptions<string[]> => ({
      key: ['list', principal, key],
      principal,
      keepPreviousData: true,
      fetch,
    })
    const h = hook(options())
    await settle()
    expect(h.value().data).toEqual(['alice 1'])

    setProvider(bond === memoryProvider ? tanstackProvider : memoryProvider)
    key = 'page-2'
    h.setOptions(options())
    await settle()
    expect(h.value().data).toEqual(['alice 1'])
    expect(h.value().isPreviousData).toBe(true)
    pending.get('alice/page-2')?.resolve(['alice 2'])
    await settle()
    expect(h.value().data).toEqual(['alice 2'])
    expect(h.value().isPreviousData).toBeUndefined()

    setProvider(bond)
    principal = 'bob'
    key = 'page-3'
    h.setOptions(options())
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    pending.get('bob/page-3')?.resolve(['bob 3'])
    await settle()
    expect(h.value().data).toEqual(['bob 3'])
  })

  it('refuses retention without a principal', () => {
    expect(() =>
      hook({
        key: ['list'],
        keepPreviousData: true,
        fetch: async () => [],
      }),
    ).toThrow(/keepPreviousData requires principal/)
  })

  it('a key change without opting in still resets to the new key state', async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    let key = 'a'
    const fetch = vi.fn(async () => 'B')
    const h = hook({ key: ['doc', key], fetch })
    expect(h.value().data).toBe('A')
    key = 'b'
    h.setOptions({ key: ['doc', key], fetch })
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    await settle()
    expect(h.value().data).toBe('B')
  })
})
