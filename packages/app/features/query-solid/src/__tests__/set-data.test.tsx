// @vitest-environment jsdom
/**
 * Mounted cache writes over both query bonds — the counterparts of the React
 * package's own setData tests: a saved response reaches every observer and the
 * next visit, functional writes see the cached document, a write supersedes an
 * older in-flight read, and a retained setter stays bound to its key.
 */
import { createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { mountPage, settle } from './helpers.js'

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('mounted cache writes over %s', (_name, queryProvider: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(queryProvider)
  })

  it('publishes a saved empty collection to every detail view and the next visit', async () => {
    const oldRecord = { id: 'invoice-1', labels: ['urgent', 'review'] }
    const saved = { id: 'invoice-1', labels: [] as string[] }
    const options = {
      key: ['invoices', 'agent-1', 'invoice-1'],
      fetch: vi.fn(async () => oldRecord),
    }
    const first = mountPage<{ id: string; labels: string[] }>(() => options)
    const second = mountPage<{ id: string; labels: string[] }>(() => options)
    await settle()
    expect(first.text()).toBe(JSON.stringify(oldRecord))
    // A custom save handler can publish the server's result without a second local snapshot.
    expect(first.value().setData).toEqual(expect.any(Function))
    first.value().setData(saved)
    await settle()
    expect(first.text()).toBe(JSON.stringify(saved))
    expect(second.text()).toBe(JSON.stringify(saved))
    const revisited = mountPage<{ id: string; labels: string[] }>(() => options)
    expect(revisited.text()).toBe(JSON.stringify(saved))
    expect(options.fetch).toHaveBeenCalledOnce()

    // The displayed record stays subscribed after the save: a later server answer still wins.
    options.fetch.mockResolvedValue({ ...saved, labels: ['paid'] })
    await first.value().refetch()
    await settle()
    expect(first.value().data?.labels).toEqual(['paid'])
    expect(second.value().data?.labels).toEqual(['paid'])
    await first.unmount()
    await second.unmount()
    await revisited.unmount()
  })

  it('applies functional writes to the current cached value and preserves another principal', async () => {
    const options = (viewer: string): QueryOptions<number> => ({
      key: ['stock', viewer],
      fetch: async () => 1,
    })
    const first = mountPage<number>(() => options('warehouse-a'))
    const other = mountPage<number>(() => options('warehouse-b'))
    await settle()
    expect(first.value().setData).toEqual(expect.any(Function))
    first.value().setData((current) => (current ?? 0) + 1)
    first.value().setData((current) => (current ?? 0) + 1)
    await settle()
    expect(first.value().data).toBe(3)
    expect(other.value().data).toBe(1)
    await first.unmount()
    await other.unmount()
  })

  it('supersedes an older pending read with the saved record', async () => {
    let finish!: (value: number) => void
    const page = mountPage<number>(() => ({
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
    await page.unmount()
  })

  it('uses only the new key cache when previous-page rows are retained', async () => {
    const [page, setPage] = createSignal(1)
    getQueryClient().set(['invoices', 1], ['first'])
    const view = mountPage<string[]>(() => ({
      key: ['invoices', page()],
      principal: 'agent-1',
      keepPreviousData: true,
      fetch: () => new Promise<string[]>(() => {}),
    }))
    setPage(2)
    await settle()
    expect(view.value().isPreviousData).toBe(true)
    expect(view.value().setData).toEqual(expect.any(Function))
    const update = vi.fn((current: string[] | undefined) => [...(current ?? []), 'second'])
    view.value().setData(update)
    await settle()
    expect(update).toHaveBeenCalledWith(undefined)
    expect(view.value().data).toEqual(['second'])
    expect(view.value().isPreviousData).not.toBe(true)
    expect(getQueryClient().get(['invoices', 1])).toEqual(['first'])
    await view.unmount()
  })

  it('keeps a setter stable and binds a retained setter to its original key', async () => {
    const [id, setId] = createSignal('one')
    const view = mountPage<number>(() => ({ key: ['stock', id()], fetch: async () => 1 }))
    await settle()
    const oldSetter = view.value().setData
    expect(oldSetter).toEqual(expect.any(Function))
    await view.rerender()
    expect(view.value().setData).toBe(oldSetter)
    setId('two')
    await settle()
    expect(view.value().setData).not.toBe(oldSetter)
    oldSetter(7)
    expect(getQueryClient().get(['stock', 'one'])).toBe(7)
    expect(view.value().data).toBe(1)
    await view.unmount()
  })

  it('does not call an updater or touch another key for a disabled query', () => {
    getQueryClient().set(['stock'], 5)
    const view = mountPage<number>(() => null)
    const update = vi.fn(() => 2)
    expect(view.value().setData).toEqual(expect.any(Function))
    view.value().setData(update)
    expect(update).not.toHaveBeenCalled()
    expect(view.value().status).toBe('idle')
    expect(getQueryClient().get(['stock'])).toBe(5)
  })

  it('supports an empty result and leaves the cache unchanged when an updater returns undefined', async () => {
    const view = mountPage<number | null>(() => ({ key: ['stock'], fetch: async () => 1 }))
    await settle()
    expect(view.value().setData).toEqual(expect.any(Function))
    view.value().setData(null)
    expect(view.value().data).toBeNull()
    view.value().setData(() => undefined)
    expect(view.value().data).toBeNull()
    await view.unmount()
  })
})
