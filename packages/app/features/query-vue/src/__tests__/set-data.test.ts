// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/set-data.test.tsx`: what a mounted page
 * does when a custom mutation handler publishes its saved response — every
 * observer and the next visit receive it, functional writes see the cached
 * document, a write supersedes an older pending read, and a retained setter
 * stays bound to its original key.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
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
] as const)('mounted cache writes over %s', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    setProvider(bond)
  })

  it('publishes a saved empty collection to every detail view and the next visit', async () => {
    const oldRecord = { id: 'invoice-1', labels: ['urgent', 'review'] }
    const saved = { id: 'invoice-1', labels: [] as string[] }
    const options = {
      key: ['invoices', 'agent-1', 'invoice-1'],
      fetch: vi.fn(async () => oldRecord),
    }
    const first = mountQuery<typeof oldRecord>(options)
    const second = mountQuery<typeof oldRecord>(options)
    await settle()
    expect(first.value().data).toEqual(oldRecord)
    // A custom save handler can publish the server's result without a second local snapshot.
    expect(first.value().setData).toEqual(expect.any(Function))
    first.value().setData(saved)
    await settle()
    expect(first.value().data).toEqual(saved)
    expect(second.value().data).toEqual(saved)
    const revisited = mountQuery<typeof oldRecord>(options)
    expect(revisited.value().data).toEqual(saved)
    expect(options.fetch).toHaveBeenCalledOnce()

    // The displayed record stays subscribed after the save: a later server answer still wins.
    options.fetch.mockResolvedValue({ ...saved, labels: ['paid'] })
    await first.value().refetch()
    await settle()
    expect(first.value().data?.labels).toEqual(['paid'])
    expect(second.value().data?.labels).toEqual(['paid'])
  })

  it('applies functional writes to the current cached value and preserves another principal', async () => {
    const options = (viewer: string) => ({ key: ['stock', viewer], fetch: async () => 1 })
    const first = mountQuery<number>(options('warehouse-a'))
    const other = mountQuery<number>(options('warehouse-b'))
    await settle()
    expect(first.value().setData).toEqual(expect.any(Function))
    first.value().setData((current) => (current ?? 0) + 1)
    first.value().setData((current) => (current ?? 0) + 1)
    await settle()
    expect(first.value().data).toBe(3)
    expect(other.value().data).toBe(1)
  })

  it('supersedes an older pending read with the saved record', async () => {
    const request = deferred<number>()
    const page = mountQuery<number>({
      key: ['stock', 'pending'],
      fetch: () => request.promise,
    })
    await settle()
    expect(page.value().isFetching).toBe(true)
    expect(page.value().setData).toEqual(expect.any(Function))
    page.value().setData(2)
    request.resolve(1)
    await settle()
    expect(page.value()).toMatchObject({ data: 2, status: 'success', isFetching: false })
  })

  it('uses only the new key cache when previous-page rows are retained', async () => {
    getQueryClient().set(['invoices', 1], ['first'])
    const request = deferred<string[]>()
    const h = mountQuery<string[]>({
      key: ['invoices', 1],
      principal: 'agent-1',
      keepPreviousData: true,
      fetch: () => request.promise,
    })
    await h.setOptions({
      key: ['invoices', 2],
      principal: 'agent-1',
      keepPreviousData: true,
      fetch: () => request.promise,
    })
    expect(h.value().isPreviousData).toBe(true)
    expect(h.value().setData).toEqual(expect.any(Function))
    const update = vi.fn((current: string[] | undefined) => [...(current ?? []), 'second'])
    h.value().setData(update)
    await settle()
    expect(update).toHaveBeenCalledWith(undefined)
    expect(h.value().data).toEqual(['second'])
    expect(h.value().isPreviousData).not.toBe(true)
    expect(getQueryClient().get(['invoices', 1])).toEqual(['first'])
  })

  it('keeps a setter stable and binds a retained setter to its original key', async () => {
    const options = (id: string) => ({ key: ['stock', id], fetch: async () => 1 })
    let id = 'one'
    const view = mountQuery<number>(options(id))
    await settle()
    const oldSetter = view.value().setData
    expect(oldSetter).toEqual(expect.any(Function))
    await view.rerender()
    expect(view.value().setData).toBe(oldSetter)
    id = 'two'
    await view.setOptions(options(id))
    await settle()
    expect(view.value().setData).not.toBe(oldSetter)
    oldSetter(7)
    expect(getQueryClient().get(['stock', 'one'])).toBe(7)
    expect(view.value().data).toBe(1)
  })

  it('does not call an updater or touch another key for a disabled query', () => {
    getQueryClient().set(['stock'], 5)
    const view = mountQuery<number>(null)
    const update = vi.fn(() => 2)
    expect(view.value().setData).toEqual(expect.any(Function))
    view.value().setData(update)
    expect(update).not.toHaveBeenCalled()
    expect(view.value().status).toBe('idle')
    expect(getQueryClient().get(['stock'])).toBe(5)
  })

  it('supports an empty result and leaves the cache unchanged when an updater returns undefined', async () => {
    const view = mountQuery<number | null>({ key: ['stock'], fetch: async () => 1 })
    await settle()
    expect(view.value().setData).toEqual(expect.any(Function))
    view.value().setData(null)
    expect(view.value().data).toBeNull()
    view.value().setData(() => undefined)
    expect(view.value().data).toBeNull()
  })
})
