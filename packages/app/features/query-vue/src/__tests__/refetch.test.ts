// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/refetch.test.tsx`: an explicit refetch
 * refreshes even a fresh document, updates every observer of that key and no
 * other, resolves with the resulting state (error included), stays idle for a
 * disabled query, keeps one identity per key, and shares an in-flight refresh.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider, QueryState } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { deferred, mountQuery, settle, unmountAll } from './helpers.js'

afterEach(async () => {
  await unmountAll()
  resetQueryClient()
})

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('mounted refetch over %s', (_name, bond: QueryProvider) => {
  beforeEach(() => setProvider(bond))

  it('refreshes the rendered collection through the optional-method wrapper used by l2433', async () => {
    let serverRows = ['existing']
    const fetch = vi.fn(async () => [...serverRows])
    const page = mountQuery<string[]>({ key: ['comments', 'viewer', 'record'], fetch })
    await settle()
    expect(page.value().data).toEqual(['existing'])
    expect(page.text()).toBe('["existing"]')
    // The retained wrapper casts the query to { refetch?: () => Promise<unknown> } and calls
    // it optionally. Before the hook supplied this method, a successful write was a no-op.
    const refresh = async (): Promise<void> => {
      const target = page.value() as { refetch?: () => Promise<unknown> }
      await target.refetch?.()
    }
    serverRows = ['new', 'existing']
    await refresh()
    await settle()
    expect(page.text()).toBe('["new","existing"]')
    serverRows = ['existing']
    await refresh()
    await settle()
    expect(page.text()).toBe('["existing"]')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('refreshes a fresh inventory document in every observer without refetching another viewer', async () => {
    const client = getQueryClient()
    client.set(['stock', 'warehouse-a'], 1)
    client.set(['stock', 'warehouse-b'], 7)
    const fetch = vi.fn(async () => 2)
    const otherFetch = vi.fn(async () => 8)
    const first = mountQuery<number>({ key: ['stock', 'warehouse-a'], fetch })
    const second = mountQuery<number>({ key: ['stock', 'warehouse-a'], fetch })
    const other = mountQuery<number>({ key: ['stock', 'warehouse-b'], fetch: otherFetch })
    expect(fetch).not.toHaveBeenCalled()
    expect(first.value().refetch).toEqual(expect.any(Function))
    const result: QueryState<number> = await first.value().refetch()
    await settle()
    expect(result).toMatchObject({ data: 2, status: 'success' })
    expect(first.value().data).toBe(2)
    expect(second.value().data).toBe(2)
    expect(other.value().data).toBe(7)
    expect(fetch).toHaveBeenCalledOnce()
    expect(otherFetch).not.toHaveBeenCalled()
  })

  it('retries a failed read and reports a failed refresh as state without rejecting', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2)
    const page = mountQuery<number>({ key: ['stock', 'retry'], fetch })
    await settle()
    expect(page.value().status).toBe('error')
    expect(page.value().refetch).toEqual(expect.any(Function))
    await page.value().refetch()
    await settle()
    expect(page.value().data).toBe(2)
    fetch.mockRejectedValueOnce(new Error('still offline'))
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'error' })
    expect(page.value().error).toEqual(new Error('still offline'))
    expect(page.value().data).toBe(2)
  })

  it('leaves a disabled query idle without fetching or invalidating another document', async () => {
    getQueryClient().set(['stock', 'disabled'], 5)
    const page = mountQuery<number>(null)
    expect(page.value().refetch).toEqual(expect.any(Function))
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'idle' })
    expect(page.value().data).toBeUndefined()
    expect(getQueryClient().get(['stock', 'disabled'])).toBe(5)
  })

  it('keeps the refresh action stable across renders and binds a new action to a changed key', async () => {
    let count = 0
    const options = (id: string): QueryOptions<number> => ({
      key: ['stock', id],
      fetch: async () => ++count,
    })
    let id = 'one'
    const page = mountQuery<number>(options(id))
    await settle()
    const first = page.value().refetch
    expect(first).toEqual(expect.any(Function))
    await page.rerender()
    expect(page.value().refetch).toBe(first)
    expect(count).toBe(1)
    id = 'two'
    await page.setOptions(options(id))
    await settle()
    expect(page.value().refetch).not.toBe(first)
    await page.value().refetch()
    await settle()
    expect(page.value().data).toBe(3)
    expect(getQueryClient().get(['stock', 'one'])).toBe(1)
  })

  it('shares an in-flight refresh without blanking the loaded document', async () => {
    const client = getQueryClient()
    client.set(['stock', 'pending'], 1)
    const request = deferred<number>()
    const fetch = vi.fn(() => request.promise)
    const page = mountQuery<number>({ key: ['stock', 'pending'], fetch })
    expect(page.value().refetch).toEqual(expect.any(Function))
    const first = page.value().refetch()
    const second = page.value().refetch()
    expect(page.value().data).toBe(1)
    expect(fetch).toHaveBeenCalledOnce()
    request.resolve(2)
    await Promise.all([first, second])
    await settle()
    expect(page.value().data).toBe(2)
    expect(page.value().isFetching).toBe(false)
  })
})
