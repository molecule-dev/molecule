// @vitest-environment jsdom
/**
 * Mounted cache writes, ported from `@molecule/app-query-react`'s own suite:
 * `setData` publishes to every observer and the next visit, applies functional
 * writes, supersedes a pending read, and stays bound to its original key.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { type MountedQuery, renderHook, settle } from './helpers/harness.js'

/** The mounted hooks, unmounted after every test the way React's roots are. */
const mounted: MountedQuery<unknown>[] = []
afterEach(async () => {
  for (const hook of mounted.splice(0)) await hook.unmount()
  resetQueryClient()
})

/** Mount a real observer and retain its current actions across option changes. */
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
] as const)('mounted cache writes over %s', (_name, provider: QueryProvider) => {
  beforeEach(() => {
    setProvider(provider)
  })

  it('publishes a saved empty collection to every detail view and the next visit', async () => {
    const oldRecord = { id: 'invoice-1', labels: ['urgent', 'review'] }
    const saved = { id: 'invoice-1', labels: [] as string[] }
    const options = {
      key: ['invoices', 'agent-1', 'invoice-1'],
      fetch: vi.fn(async () => oldRecord),
    }
    const first = mountHook(() => options)
    const second = mountHook(() => options)
    await settle()
    expect(first.text()).toBe(JSON.stringify(oldRecord))
    // A custom save handler can publish the server's result without a second local snapshot.
    expect(first.value().setData).toEqual(expect.any(Function))
    first.value().setData(saved)
    await settle()
    expect(first.text()).toBe(JSON.stringify(saved))
    expect(second.text()).toBe(JSON.stringify(saved))
    const revisited = mountHook(() => options)
    expect(revisited.text()).toBe(JSON.stringify(saved))
    expect(options.fetch).toHaveBeenCalledOnce()

    // The displayed record stays subscribed after the save: a later server answer still wins.
    options.fetch.mockResolvedValue({ ...saved, labels: ['paid'] })
    await first.value().refetch()
    await settle()
    expect(first.value().data?.labels).toEqual(['paid'])
    expect(second.value().data?.labels).toEqual(['paid'])
  })

  it('applies functional writes to the current cached value and preserves another principal', async () => {
    const options = (viewer: string): QueryOptions<number> => ({
      key: ['stock', viewer],
      fetch: async () => 1,
    })
    const first = mountHook(() => options('warehouse-a'))
    const other = mountHook(() => options('warehouse-b'))
    await settle()
    first.value().setData((current) => (current ?? 0) + 1)
    first.value().setData((current) => (current ?? 0) + 1)
    await settle()
    expect(first.value().data).toBe(3)
    expect(other.value().data).toBe(1)
  })

  it('supersedes an older pending read with the saved record', async () => {
    let finish!: (value: number) => void
    const page = mountHook<number>(() => ({
      key: ['stock', 'pending'],
      fetch: () =>
        new Promise<number>((resolve) => {
          finish = resolve
        }),
    }))
    await settle()
    expect(page.value().isFetching).toBe(true)
    page.value().setData(2)
    finish(1)
    await settle()
    expect(page.value()).toMatchObject({ data: 2, status: 'success', isFetching: false })
  })

  it('uses only the new key cache when previous-page rows are retained', async () => {
    let page = 1
    getQueryClient().set(['invoices', 1], ['first'])
    const view = mountHook<string[]>(() => ({
      key: ['invoices', page],
      principal: 'agent-1',
      keepPreviousData: true,
      fetch: () => new Promise<string[]>(() => {}),
    }))
    page = 2
    view.rerender()
    expect(view.value().isPreviousData).toBe(true)
    const update = vi.fn((current: string[] | undefined) => [...(current ?? []), 'second'])
    view.value().setData(update)
    await settle()
    expect(update).toHaveBeenCalledWith(undefined)
    expect(view.value().data).toEqual(['second'])
    expect(view.value().isPreviousData).not.toBe(true)
    expect(getQueryClient().get(['invoices', 1])).toEqual(['first'])
  })

  it('keeps a setter stable and binds a retained setter to its original key', async () => {
    let id = 'one'
    const view = mountHook<number>(() => ({ key: ['stock', id], fetch: async () => 1 }))
    await settle()
    const oldSetter = view.value().setData
    view.rerender()
    expect(view.value().setData).toBe(oldSetter)
    id = 'two'
    view.rerender()
    await settle()
    expect(view.value().setData).not.toBe(oldSetter)
    oldSetter(7)
    await settle()
    expect(getQueryClient().get(['stock', 'one'])).toBe(7)
    expect(view.value().data).toBe(1)
  })

  it('does not call an updater or touch another key for a disabled query', () => {
    getQueryClient().set(['stock'], 5)
    const view = mountHook<number>(() => null)
    const update = vi.fn(() => 2)
    view.value().setData(update)
    expect(update).not.toHaveBeenCalled()
    expect(view.value().status).toBe('idle')
    expect(getQueryClient().get(['stock'])).toBe(5)
  })

  it('supports an empty result and leaves the cache unchanged when an updater returns undefined', async () => {
    const view = mountHook<number | null>(() => ({ key: ['stock'], fetch: async () => 1 }))
    await settle()
    view.value().setData(null)
    expect(view.value().data).toBeNull()
    view.value().setData(() => undefined)
    expect(view.value().data).toBeNull()
  })
})
