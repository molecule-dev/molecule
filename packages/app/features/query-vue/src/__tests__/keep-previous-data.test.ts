// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/keep-previous-data.test.tsx`: the list
 * lifecycle contract of `keepPreviousData`, driven through the real composable
 * and both query bonds — a same-principal key change keeps the rows on screen
 * until the next key answers; a principal change, a completed (even empty)
 * answer or a failure never shows the previous key's document — also after the
 * query provider is replaced.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { deferred, mountQuery, settle, unmountAll } from './helpers.js'

afterEach(async () => {
  await unmountAll()
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('useQuery keepPreviousData over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('keeps the previous document while a same-principal key loads', async () => {
    const next = deferred<string[]>()
    let page = 1
    const fetch = vi.fn(() => (page === 1 ? Promise.resolve(['a', 'b']) : next.promise))
    const h = mountQuery<string[]>({
      key: ['list', page],
      principal: 'public',
      keepPreviousData: true,
      fetch,
    })
    await settle()
    expect(h.value().data).toEqual(['a', 'b'])

    page = 2
    await h.setOptions({
      key: ['list', page],
      principal: 'public',
      keepPreviousData: true,
      fetch,
    })
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
    const pending = new Map<string, ReturnType<typeof deferred<string[]>>>()
    let page = 1
    const fetch = vi.fn(() => {
      if (page === 1) return Promise.resolve(['a'])
      const answer = deferred<string[]>()
      pending.set(String(page), answer)
      return answer.promise
    })
    const options = () => ({
      key: ['list', page],
      principal: 'public',
      keepPreviousData: true,
      fetch,
    })
    const h = mountQuery<string[]>(options())
    await settle()
    page = 2
    await h.setOptions(options())
    await settle()
    page = 3
    await h.setOptions(options())
    await settle()
    expect(h.value().data).toEqual(['a'])
    expect(h.value().isPreviousData).toBe(true)

    // The abandoned page answers late: it is not what the page shows.
    pending.get('2')?.resolve(['b'])
    await settle()
    expect(h.value().data).toEqual(['a'])

    pending.get('3')?.resolve(['c'])
    await settle()
    expect(h.value().data).toEqual(['c'])
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('drops the previous document on a principal switch', async () => {
    const next = deferred<string[]>()
    let principal = 'alice'
    const fetch = vi.fn(() =>
      principal === 'alice' ? Promise.resolve(['alice row']) : next.promise,
    )
    const h = mountQuery<string[]>({
      key: ['inbox', principal],
      principal,
      keepPreviousData: true,
      fetch,
    })
    await settle()
    expect(h.value().data).toEqual(['alice row'])

    principal = 'bob'
    await h.setOptions({ key: ['inbox', principal], principal, keepPreviousData: true, fetch })
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()

    next.resolve(['bob row'])
    await settle()
    expect(h.value().data).toEqual(['bob row'])
  })

  it('never relabels a document when the principal changes before the key', async () => {
    // The principal is read from the session while the key's account part lags one
    // update behind it (a route param, a profile query, a state synced in a watcher).
    const next = deferred<string[]>()
    let principal = 'alice'
    let account = 'alice'
    const fetch = vi.fn(() => (account === 'alice' ? Promise.resolve(['alice row']) : next.promise))
    const h = mountQuery<string[]>({
      key: ['inbox', account],
      principal,
      keepPreviousData: true,
      fetch,
    })
    await settle()
    expect(h.value().data).toEqual(['alice row'])

    principal = 'bob'
    await h.setOptions({ key: ['inbox', account], principal, keepPreviousData: true, fetch })
    await settle()
    account = 'bob'
    await h.setOptions({ key: ['inbox', account], principal, keepPreviousData: true, fetch })
    await settle()
    // Alice's answer was observed under Alice: it is not carried into Bob's key.
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()

    next.resolve(['bob row'])
    await settle()
    expect(h.value().data).toEqual(['bob row'])
  })

  it('replaces the previous document with a completed empty response', async () => {
    const next = deferred<string[]>()
    const fetch = vi.fn(() => (page === 1 ? Promise.resolve(['a']) : next.promise))
    let page = 1
    const h = mountQuery<string[]>({
      key: ['list', page],
      principal: 'public',
      keepPreviousData: true,
      fetch,
    })
    await settle()
    page = 2
    await h.setOptions({ key: ['list', page], principal: 'public', keepPreviousData: true, fetch })
    await settle()
    expect(h.value().isPreviousData).toBe(true)
    next.resolve([])
    await settle()
    expect(h.value().data).toEqual([])
    expect(h.value().status).toBe('success')
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('drops the previous document when the next key fails', async () => {
    let page = 1
    const fetch = vi.fn(() =>
      page === 1 ? Promise.resolve(['a']) : Promise.reject(new Error('down')),
    )
    const h = mountQuery<string[]>({
      key: ['list', page],
      principal: 'public',
      keepPreviousData: true,
      fetch,
    })
    await settle()
    page = 2
    await h.setOptions({ key: ['list', page], principal: 'public', keepPreviousData: true, fetch })
    await settle()
    expect(h.value().status).toBe('error')
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('forgets the document while the query is disabled', async () => {
    const next = deferred<string[]>()
    let enabled = true
    let page = 1
    const fetch = vi.fn(() => (page === 1 ? Promise.resolve(['a']) : next.promise))
    const options = () =>
      enabled
        ? { key: ['list', page] as const, principal: 'public', keepPreviousData: true, fetch }
        : null
    const h = mountQuery<string[]>(options())
    await settle()
    enabled = false
    await h.setOptions(options())
    await settle()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()

    enabled = true
    page = 2
    await h.setOptions(options())
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
  })

  it('stops showing the previous document as soon as the option is turned off', async () => {
    const next = deferred<string[]>()
    let page = 1
    let keep = true
    const fetch = vi.fn(() => (page === 1 ? Promise.resolve(['a']) : next.promise))
    const options = () => ({
      key: ['list', page],
      principal: 'public',
      keepPreviousData: keep,
      fetch,
    })
    const h = mountQuery<string[]>(options())
    await settle()
    page = 2
    await h.setOptions(options())
    await settle()
    expect(h.value().isPreviousData).toBe(true)

    keep = false
    await h.setOptions(options())
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    next.resolve(['c'])
    await settle()
    expect(h.value().data).toEqual(['c'])
  })

  it('applies the same rules after the query provider is replaced', async () => {
    // A bond replaced at runtime: the next key is answered by the new provider's
    // client, and the rows kept meanwhile are still only the same principal's.
    const pending = new Map<string, ReturnType<typeof deferred<string[]>>>()
    let principal = 'alice'
    let page = 1
    const fetch = vi.fn(() => {
      if (page === 1) return Promise.resolve([`${principal} 1`])
      const answer = deferred<string[]>()
      pending.set(`${principal}/${page}`, answer)
      return answer.promise
    })
    const options = () => ({
      key: ['list', principal, page],
      principal,
      keepPreviousData: true,
      fetch,
    })
    const h = mountQuery<string[]>(options())
    await settle()
    expect(h.value().data).toEqual(['alice 1'])

    setProvider(bond === memoryProvider ? tanstackProvider : memoryProvider)
    page = 2
    await h.setOptions(options())
    await settle()
    expect(h.value().data).toEqual(['alice 1'])
    expect(h.value().isPreviousData).toBe(true)
    pending.get('alice/2')?.resolve(['alice 2'])
    await settle()
    expect(h.value().data).toEqual(['alice 2'])
    expect(h.value().isPreviousData).toBeUndefined()

    setProvider(bond)
    principal = 'bob'
    page = 3
    await h.setOptions(options())
    await settle()
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    pending.get('bob/3')?.resolve(['bob 3'])
    await settle()
    expect(h.value().data).toEqual(['bob 3'])
  })

  it('refuses retention without a principal', async () => {
    const fetch = vi.fn(async () => [])
    const h = mountQuery<string[]>({ key: ['list'], keepPreviousData: true, fetch })
    // The composable refuses before anything subscribes: the result is the throw.
    expect(() => h.value()).toThrow(/keepPreviousData requires principal/)
    await h.unmount()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('a key change without opting in still resets to the new key state', async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    const fetch = vi.fn(async () => 'B')
    let key = 'a'
    const h = mountQuery<string>({ key: ['doc', key], fetch })
    expect(h.value().data).toBe('A')
    key = 'b'
    await h.setOptions({ key: ['doc', key], fetch })
    expect(h.value().data).toBeUndefined()
    expect(h.value().isPreviousData).toBeUndefined()
    await settle()
  })
})
