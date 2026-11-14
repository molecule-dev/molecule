// @vitest-environment jsdom
/**
 * Mounted `refetch()` over both query bonds — the counterparts of the React
 * package's own refetch tests: a disabled query stays idle, an in-flight
 * refresh is shared, a failed refresh resolves as state, and a changed key
 * binds a new action.
 */
import { createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider, QueryState } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { mountPage, settle } from './helpers.js'

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('mounted refetch over %s', (_name, queryProvider: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(queryProvider)
  })

  it('refreshes the rendered collection through the optional-method wrapper used by l2433', async () => {
    let serverRows = ['existing']
    const fetch = vi.fn(async () => [...serverRows])
    const page = mountPage<string>(() => ({ key: ['comments', 'viewer', 'record'], fetch }))
    await settle()
    expect(page.text()).toBe('["existing"]')
    // The retained wrapper casts the query to { refetch?: () => Promise<unknown> } and calls
    // it optionally. Before the hook supplied this method, a successful write was a no-op.
    const refresh = async (): Promise<void> => {
      const target: { refetch?: () => Promise<unknown> } = page.value()
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
    await page.unmount()
  })

  it('refreshes a fresh inventory document in every observer without refetching another viewer', async () => {
    const client = getQueryClient()
    client.set(['stock', 'warehouse-a'], 1)
    client.set(['stock', 'warehouse-b'], 7)
    const fetch = vi.fn(async () => 2)
    const otherFetch = vi.fn(async () => 8)
    const first = mountPage<number>(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    const second = mountPage<number>(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    const other = mountPage<number>(() => ({ key: ['stock', 'warehouse-b'], fetch: otherFetch }))
    expect(fetch).not.toHaveBeenCalled()
    expect(first.value().refetch).toEqual(expect.any(Function))
    const result: QueryState<number> = await first.value().refetch()
    await settle()
    expect(result).toMatchObject({ data: 2, status: 'success' })
    expect(first.text()).toBe('2')
    expect(second.text()).toBe('2')
    expect(other.text()).toBe('7')
    expect(fetch).toHaveBeenCalledOnce()
    expect(otherFetch).not.toHaveBeenCalled()
    await first.unmount()
    await second.unmount()
    await other.unmount()
  })

  it('retries a failed read and reports a failed refresh as state without rejecting', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2)
    const page = mountPage<number>(() => ({ key: ['stock', 'retry'], fetch }))
    await settle()
    expect(page.value().status).toBe('error')
    expect(page.value().refetch).toEqual(expect.any(Function))
    await page.value().refetch()
    await settle()
    expect(page.value().data).toBe(2)
    fetch.mockRejectedValueOnce(new Error('still offline'))
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'error' })
    await settle()
    expect(page.value().error).toEqual(new Error('still offline'))
    expect(page.text()).toBe('2')
    await page.unmount()
  })

  it('leaves a disabled query idle without fetching or invalidating another document', async () => {
    getQueryClient().set(['stock', 'disabled'], 5)
    const page = mountPage<number>(() => null)
    expect(page.value().refetch).toEqual(expect.any(Function))
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'idle' })
    await settle()
    expect(page.value().data).toBeUndefined()
    expect(getQueryClient().get(['stock', 'disabled'])).toBe(5)
    await page.unmount()
  })

  it('keeps the refresh action stable across renders and binds a new action to a changed key', async () => {
    const [id, setId] = createSignal('one')
    let count = 0
    const page = mountPage<number>(() => ({
      key: ['stock', id()],
      fetch: async () => ++count,
    }))
    await settle()
    const first = page.value().refetch
    expect(first).toEqual(expect.any(Function))
    await page.rerender()
    expect(page.value().refetch).toBe(first)
    expect(count).toBe(1)
    setId('two')
    await settle()
    expect(page.value().refetch).not.toBe(first)
    await page.value().refetch()
    await settle()
    expect(page.text()).toBe('3')
    expect(getQueryClient().get(['stock', 'one'])).toBe(1)
    await page.unmount()
  })

  it('shares an in-flight refresh without blanking the loaded document', async () => {
    const client = getQueryClient()
    client.set(['stock', 'pending'], 1)
    let resolve!: (value: number) => void
    const fetch = vi.fn(
      () =>
        new Promise<number>((r) => {
          resolve = r
        }),
    )
    const page = mountPage<number>(() => ({ key: ['stock', 'pending'], fetch }))
    expect(page.value().refetch).toEqual(expect.any(Function))
    const first = page.value().refetch()
    const second = page.value().refetch()
    expect(page.text()).toBe('1')
    expect(fetch).toHaveBeenCalledOnce()
    resolve(2)
    await Promise.all([first, second])
    await settle()
    expect(page.text()).toBe('2')
    expect(page.value().isFetching).toBe(false)
    await page.unmount()
  })
})
