// @vitest-environment jsdom
/**
 * Cache writes from a mounted page's own actions, driven through the real
 * Angular hook and both query bonds: `setData` publishes a saved document to
 * every observer, stays bound to its original key, and leaves another
 * principal's document alone.
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

/** Flush both providers' cache notifications and the Angular work they schedule. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await drain()
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
    const first = await mountQuery(() => options)
    const second = await mountQuery(() => options)
    await settle()
    expect(first.value().data).toEqual(oldRecord)
    // A custom save handler can publish the server's result without a second local snapshot.
    expect(first.value().setData).toEqual(expect.any(Function))
    first.value().setData(saved)
    await settle()
    expect(first.value().data).toEqual(saved)
    expect(second.value().data).toEqual(saved)
    const revisited = await mountQuery(() => options)
    expect(revisited.value().data).toEqual(saved)
    expect(options.fetch).toHaveBeenCalledOnce()

    // The displayed record stays subscribed after the save: a later server answer still wins.
    options.fetch.mockResolvedValue({ ...saved, labels: ['paid'] })
    await first.value().refetch()
    expect(first.value().data?.labels).toEqual(['paid'])
    expect(second.value().data?.labels).toEqual(['paid'])
  })

  it('applies functional writes to the current cached value and preserves another principal', async () => {
    const options = (viewer: string) => ({ key: ['stock', viewer], fetch: async () => 1 })
    const first = await mountQuery(() => options('warehouse-a'))
    const other = await mountQuery(() => options('warehouse-b'))
    await settle()
    expect(first.value().setData).toEqual(expect.any(Function))
    first.value().setData((current) => (current ?? 0) + 1)
    first.value().setData((current) => (current ?? 0) + 1)
    await settle()
    expect(first.value().data).toBe(3)
    expect(other.value().data).toBe(1)
  })

  it('supersedes an older pending read with the saved record', async () => {
    let finish!: (value: number) => void
    const page = await mountQuery(() => ({
      key: ['stock', 'pending'],
      fetch: () =>
        new Promise<number>((resolve) => {
          finish = resolve
        }),
    }))
    await settle()
    expect(page.value().isFetching).toBe(true)
    expect(page.value().setData).toEqual(expect.any(Function))
    page.value().setData(2)
    finish(1)
    await settle()
    expect(page.value()).toMatchObject({ data: 2, status: 'success', isFetching: false })
  })

  it('uses only the new key cache when previous-page rows are retained', async () => {
    let page = 1
    getQueryClient().set(['invoices', 1], ['first'])
    const view = await mountQuery(() => ({
      key: ['invoices', page],
      principal: 'agent-1',
      keepPreviousData: true,
      fetch: () => new Promise<string[]>(() => {}),
    }))
    page = 2
    await view.rerender()
    expect(view.value().isPreviousData).toBe(true)
    expect(view.value().setData).toEqual(expect.any(Function))
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
    const view = await mountQuery(() => ({ key: ['stock', id], fetch: async () => 1 }))
    await settle()
    const oldSetter = view.value().setData
    expect(oldSetter).toEqual(expect.any(Function))
    await view.rerender()
    expect(view.value().setData).toBe(oldSetter)
    id = 'two'
    await view.rerender()
    await settle()
    expect(view.value().setData).not.toBe(oldSetter)
    oldSetter(7)
    expect(getQueryClient().get(['stock', 'one'])).toBe(7)
    expect(view.value().data).toBe(1)
  })

  it('does not call an updater or touch another key for a disabled query', async () => {
    getQueryClient().set(['stock'], 5)
    const view = await mountQuery<number>(() => null)
    const update = vi.fn(() => 2)
    expect(view.value().setData).toEqual(expect.any(Function))
    view.value().setData(update)
    expect(update).not.toHaveBeenCalled()
    expect(view.value().status).toBe('idle')
    expect(getQueryClient().get(['stock'])).toBe(5)
  })

  it('supports an empty result and leaves the cache unchanged when an updater returns undefined', async () => {
    const view = await mountQuery<number | null>(() => ({ key: ['stock'], fetch: async () => 1 }))
    await settle()
    expect(view.value().setData).toEqual(expect.any(Function))
    view.value().setData(null)
    expect(view.value().data).toBeNull()
    view.value().setData(() => undefined)
    expect(view.value().data).toBeNull()
  })
})
