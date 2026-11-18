// @vitest-environment jsdom
/**
 * Mounted refetch, ported from `@molecule/app-query-react`'s own suite:
 * `refetch()` refreshes every observer of its key, retries a failed read,
 * reports a failed refresh as state without rejecting, and stays bound to its
 * original key.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider, QueryState } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { deferred, type MountedQuery, renderHook, settle } from './helpers/harness.js'

/** The mounted hooks, unmounted after every test the way React's roots are. */
const mounted: MountedQuery<unknown>[] = []
afterEach(async () => {
  for (const hook of mounted.splice(0)) await hook.unmount()
  resetQueryClient()
})

/** Mount the actual observer and read its visible document after an event. */
function mountHook<T>(
  options: () => QueryOptions<T> | null,
): MountedQuery<T> & { rerender: () => void } {
  const mountedQuery = renderHook<T>(options())
  mounted.push(mountedQuery as MountedQuery<unknown>)
  return {
    ...mountedQuery,
    // A fresh options object with the same key is React's parent re-render.
    rerender: () => mountedQuery.setOptions(options()),
  }
}

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('mounted refetch over %s', (_name, provider: QueryProvider) => {
  beforeEach(() => setProvider(provider))

  it('refreshes the rendered collection through the optional-method wrapper used by l2433', async () => {
    let serverRows = ['existing']
    const fetch = vi.fn(async () => [...serverRows])
    const page = mountHook<string[]>(() => ({ key: ['comments', 'viewer', 'record'], fetch }))
    await settle()
    expect(page.text()).toBe('["existing"]')
    // The wrapper calls the hook's own method optionally, as an app's view model does.
    const refresh = async (): Promise<void> => {
      await page.value().refetch?.()
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
    const first = mountHook(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    const second = mountHook(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    mountHook(() => ({ key: ['stock', 'warehouse-b'], fetch: otherFetch }))
    expect(fetch).not.toHaveBeenCalled()
    const result: QueryState<number> = await first.value().refetch()
    await settle()
    expect(result).toMatchObject({ data: 2, status: 'success' })
    expect(first.text()).toBe('2')
    expect(second.text()).toBe('2')
    expect(fetch).toHaveBeenCalledOnce()
    expect(otherFetch).not.toHaveBeenCalled()
  })

  it('retries a failed read and reports a failed refresh as state without rejecting', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2)
    const page = mountHook<number>(() => ({ key: ['stock', 'retry'], fetch }))
    await settle()
    expect(page.value().status).toBe('error')
    await page.value().refetch()
    await settle()
    expect(page.value().data).toBe(2)
    fetch.mockRejectedValueOnce(new Error('still offline'))
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'error' })
    await settle()
    expect((page.value().error as Error).message).toBe('still offline')
    expect(page.text()).toBe('2')
  })

  it('leaves a disabled query idle without fetching or invalidating another document', async () => {
    getQueryClient().set(['stock', 'disabled'], 5)
    const page = mountHook<number>(() => null)
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'idle' })
    expect(page.value().data).toBeUndefined()
    expect(getQueryClient().get(['stock', 'disabled'])).toBe(5)
  })

  it('keeps the refresh action stable across renders and binds a new action to a changed key', async () => {
    let id = 'one'
    let count = 0
    const page = mountHook<number>(() => ({ key: ['stock', id], fetch: async () => ++count }))
    await settle()
    const first = page.value().refetch
    page.rerender()
    expect(page.value().refetch).toBe(first)
    expect(count).toBe(1)
    id = 'two'
    page.rerender()
    await settle()
    expect(page.value().refetch).not.toBe(first)
    await page.value().refetch()
    await settle()
    expect(page.text()).toBe('3')
    expect(getQueryClient().get(['stock', 'one'])).toBe(1)
  })

  it('shares an in-flight refresh without blanking the loaded document', async () => {
    const client = getQueryClient()
    client.set(['stock', 'pending'], 1)
    const gate = deferred<number>()
    const fetch = vi.fn(() => gate.promise)
    const page = mountHook<number>(() => ({ key: ['stock', 'pending'], fetch }))
    const first = page.value().refetch()
    const second = page.value().refetch()
    expect(page.text()).toBe('1')
    expect(fetch).toHaveBeenCalledOnce()
    gate.resolve(2)
    await Promise.all([first, second])
    await settle()
    expect(page.text()).toBe('2')
    expect(page.value().isFetching).toBe(false)
  })
})
