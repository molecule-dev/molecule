// @vitest-environment jsdom
/**
 * `refetch()` through the real Angular hook and both query bonds: a mounted
 * page refreshes its document, shares an in-flight refresh, reports a failure
 * as state, and rebinds to a changed key.
 *
 * @module
 */
import '@angular/compiler'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { drain } from './harness.js'
import { destroyQueryMounts, mountQuery } from './query-harness.js'

afterEach(async () => {
  await destroyQueryMounts()
  resetQueryClient()
})

/** Flush cache notifications from both supported bonds. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await drain()
}

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('mounted refetch over %s', (_name, provider: QueryProvider) => {
  beforeEach(() => setProvider(provider))

  it('refreshes the rendered collection through the optional-method wrapper used by l2433', async () => {
    let serverRows = ['existing']
    const fetch = vi.fn(async () => [...serverRows])
    const page = await mountQuery(() => ({ key: ['comments', 'viewer', 'record'], fetch }))
    await settle()
    expect(page.value().data).toEqual(['existing'])
    // The retained wrapper casts the query to { refetch?: () => Promise<unknown> } and calls
    // it optionally. Before the hook supplied this method, a successful write was a no-op.
    const refresh = async (): Promise<void> => {
      await page.value().refetch()
    }
    serverRows = ['new', 'existing']
    await refresh()
    await settle()
    expect(page.value().data).toEqual(['new', 'existing'])
    serverRows = ['existing']
    await refresh()
    await settle()
    expect(page.value().data).toEqual(['existing'])
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('refreshes a fresh inventory document in every observer without refetching another viewer', async () => {
    const client = getQueryClient()
    client.set(['stock', 'warehouse-a'], 1)
    client.set(['stock', 'warehouse-b'], 7)
    const fetch = vi.fn(async () => 2)
    const otherFetch = vi.fn(async () => 8)
    const first = await mountQuery(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    const second = await mountQuery(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    const other = await mountQuery(() => ({ key: ['stock', 'warehouse-b'], fetch: otherFetch }))
    expect(fetch).not.toHaveBeenCalled()
    const result = await first.value().refetch()
    expect(result).toMatchObject({ data: 2, status: 'success' })
    expect(first.value().data).toBe(2)
    expect(second.value().data).toBe(2)
    expect(other.value().data).toBe(7)
    expect(fetch).toHaveBeenCalledOnce()
    expect(otherFetch).not.toHaveBeenCalled()
  })

  it('retries a failed read and reports a failed refresh as state without rejecting', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2)
    const page = await mountQuery(() => ({ key: ['stock', 'retry'], fetch }))
    await settle()
    expect(page.value().status).toBe('error')
    await page.value().refetch()
    expect(page.value().data).toBe(2)
    fetch.mockRejectedValueOnce(new Error('still offline'))
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'error' })
    expect(page.value().error).toEqual(new Error('still offline'))
    expect(page.value().data).toBe(2)
  })

  it('leaves a disabled query idle without fetching or invalidating another document', async () => {
    getQueryClient().set(['stock', 'disabled'], 5)
    const page = await mountQuery<number>(() => null)
    await expect(page.value().refetch()).resolves.toMatchObject({ status: 'idle' })
    expect(page.value().data).toBeUndefined()
    expect(getQueryClient().get(['stock', 'disabled'])).toBe(5)
  })

  it('keeps the refresh action stable across renders and binds a new action to a changed key', async () => {
    let id = 'one'
    let count = 0
    const page = await mountQuery(() => ({ key: ['stock', id], fetch: async () => ++count }))
    await settle()
    const first = page.value().refetch
    await page.rerender()
    expect(page.value().refetch).toBe(first)
    expect(count).toBe(1)
    id = 'two'
    await page.rerender()
    await settle()
    expect(page.value().refetch).not.toBe(first)
    await page.value().refetch()
    expect(page.value().data).toBe(3)
    expect(getQueryClient().get(['stock', 'one'])).toBe(1)
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
    const page = await mountQuery(() => ({ key: ['stock', 'pending'], fetch }))
    const first = page.value().refetch()
    const second = page.value().refetch()
    expect(page.value().data).toBe(1)
    expect(fetch).toHaveBeenCalledOnce()
    resolve(2)
    await Promise.all([first, second])
    await settle()
    expect(page.value().data).toBe(2)
    expect(page.value().isFetching).toBe(false)
  })
})
