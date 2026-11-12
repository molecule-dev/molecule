import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { useQuery } from '../useQuery.js'

const roots: Root[] = []

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount())
  resetQueryClient()
})

/** Mount a real observer and retain its current actions across re-renders. */
function mount<T>(options: () => QueryOptions<T> | null) {
  let latest!: ReturnType<typeof useQuery<T>>
  let rerender!: () => void
  const container = document.createElement('div')
  const root = createRoot(container)
  roots.push(root)
  function Page() {
    const [, tick] = useState(0)
    rerender = () => act(() => tick((n) => n + 1))
    latest = useQuery(options())
    return createElement('output', null, JSON.stringify(latest.data))
  }
  act(() => root.render(createElement(Page)))
  return { value: () => latest, text: () => container.textContent, rerender: () => rerender() }
}

/** Flush both providers' cache notifications and React effects. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await act(async () => {})
}

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('mounted cache writes over %s', (_name, provider: QueryProvider) => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    setProvider(provider)
  })

  it('publishes a saved empty collection to every detail view and the next visit', async () => {
    const oldRecord = { id: 'invoice-1', labels: ['urgent', 'review'] }
    const saved = { id: 'invoice-1', labels: [] as string[] }
    const options = {
      key: ['invoices', 'agent-1', 'invoice-1'],
      fetch: vi.fn(async () => oldRecord),
    }
    const first = mount(() => options)
    const second = mount(() => options)
    await settle()
    expect(first.text()).toBe(JSON.stringify(oldRecord))
    // A custom save handler can publish the server's result without a second local snapshot.
    expect(first.value().setData).toEqual(expect.any(Function))
    act(() => first.value().setData(saved))
    await settle()
    expect(first.text()).toBe(JSON.stringify(saved))
    expect(second.text()).toBe(JSON.stringify(saved))
    const revisited = mount(() => options)
    expect(revisited.text()).toBe(JSON.stringify(saved))
    expect(options.fetch).toHaveBeenCalledOnce()

    // The displayed record stays subscribed after the save: a later server answer still wins.
    options.fetch.mockResolvedValue({ ...saved, labels: ['paid'] })
    await act(async () => {
      await first.value().refetch()
    })
    expect(first.value().data?.labels).toEqual(['paid'])
    expect(second.value().data?.labels).toEqual(['paid'])
  })

  it('applies functional writes to the current cached value and preserves another principal', async () => {
    const options = (viewer: string) => ({ key: ['stock', viewer], fetch: async () => 1 })
    const first = mount(() => options('warehouse-a'))
    const other = mount(() => options('warehouse-b'))
    await settle()
    expect(first.value().setData).toEqual(expect.any(Function))
    act(() => {
      first.value().setData((current) => (current ?? 0) + 1)
      first.value().setData((current) => (current ?? 0) + 1)
    })
    await settle()
    expect(first.value().data).toBe(3)
    expect(other.value().data).toBe(1)
  })

  it('supersedes an older pending read with the saved record', async () => {
    let finish!: (value: number) => void
    const page = mount(() => ({
      key: ['stock', 'pending'],
      fetch: () =>
        new Promise<number>((resolve) => {
          finish = resolve
        }),
    }))
    await settle()
    expect(page.value().isFetching).toBe(true)
    expect(page.value().setData).toEqual(expect.any(Function))
    act(() => page.value().setData(2))
    await act(async () => {
      finish(1)
    })
    await settle()
    expect(page.value()).toMatchObject({ data: 2, status: 'success', isFetching: false })
  })

  it('uses only the new key cache when previous-page rows are retained', async () => {
    let page = 1
    getQueryClient().set(['invoices', 1], ['first'])
    const view = mount(() => ({
      key: ['invoices', page],
      principal: 'agent-1',
      keepPreviousData: true,
      fetch: () => new Promise<string[]>(() => {}),
    }))
    page = 2
    view.rerender()
    expect(view.value().isPreviousData).toBe(true)
    expect(view.value().setData).toEqual(expect.any(Function))
    const update = vi.fn((current: string[] | undefined) => [...(current ?? []), 'second'])
    act(() => view.value().setData(update))
    await settle()
    expect(update).toHaveBeenCalledWith(undefined)
    expect(view.value().data).toEqual(['second'])
    expect(view.value().isPreviousData).not.toBe(true)
    expect(getQueryClient().get(['invoices', 1])).toEqual(['first'])
  })

  it('keeps a setter stable and binds a retained setter to its original key', async () => {
    let id = 'one'
    const view = mount(() => ({ key: ['stock', id], fetch: async () => 1 }))
    await settle()
    const oldSetter = view.value().setData
    expect(oldSetter).toEqual(expect.any(Function))
    view.rerender()
    expect(view.value().setData).toBe(oldSetter)
    id = 'two'
    view.rerender()
    await settle()
    expect(view.value().setData).not.toBe(oldSetter)
    act(() => oldSetter(7))
    expect(getQueryClient().get(['stock', 'one'])).toBe(7)
    expect(view.value().data).toBe(1)
  })

  it('does not call an updater or touch another key for a disabled query', () => {
    getQueryClient().set(['stock'], 5)
    const view = mount<number>(() => null)
    const update = vi.fn(() => 2)
    expect(view.value().setData).toEqual(expect.any(Function))
    act(() => view.value().setData(update))
    expect(update).not.toHaveBeenCalled()
    expect(view.value().status).toBe('idle')
    expect(getQueryClient().get(['stock'])).toBe(5)
  })

  it('supports an empty result and leaves the cache unchanged when an updater returns undefined', async () => {
    const view = mount<number | null>(() => ({ key: ['stock'], fetch: async () => 1 }))
    await settle()
    expect(view.value().setData).toEqual(expect.any(Function))
    act(() => view.value().setData(null))
    expect(view.value().data).toBeNull()
    act(() => view.value().setData(() => undefined))
    expect(view.value().data).toBeNull()
  })
})
