import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider, QueryState } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { useQuery } from '../useQuery.js'

const roots: Root[] = []
afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount())
  resetQueryClient()
})

/** Mount the actual observer and read its visible document after an event. */
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

/** Flush cache notifications from both supported bonds. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await act(async () => {})
}

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('mounted refetch over %s', (_name, provider: QueryProvider) => {
  beforeEach(() => setProvider(provider))

  it('refreshes the rendered collection through the optional-method wrapper used by l2433', async () => {
    let serverRows = ['existing']
    const fetch = vi.fn(async () => [...serverRows])
    const page = mount(() => ({ key: ['comments', 'viewer', 'record'], fetch }))
    await settle()
    expect(page.text()).toBe('["existing"]')
    // The retained wrapper casts the query to { refetch?: () => Promise<unknown> } and calls
    // it optionally. Before the hook supplied this method, a successful write was a no-op.
    const refresh = async (): Promise<void> => {
      const target = page.value() as unknown as { refetch?: () => Promise<unknown> }
      await target.refetch?.()
    }
    serverRows = ['new', 'existing']
    await act(refresh)
    expect(page.text()).toBe('["new","existing"]')
    serverRows = ['existing']
    await act(refresh)
    expect(page.text()).toBe('["existing"]')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('refreshes a fresh inventory document in every observer without refetching another viewer', async () => {
    const client = getQueryClient()
    client.set(['stock', 'warehouse-a'], 1)
    client.set(['stock', 'warehouse-b'], 7)
    const fetch = vi.fn(async () => 2)
    const otherFetch = vi.fn(async () => 8)
    const first = mount(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    const second = mount(() => ({ key: ['stock', 'warehouse-a'], fetch }))
    const other = mount(() => ({ key: ['stock', 'warehouse-b'], fetch: otherFetch }))
    expect(fetch).not.toHaveBeenCalled()
    expect(first.value().refetch).toEqual(expect.any(Function))
    let result: QueryState<number> | undefined
    await act(async () => {
      result = await first.value().refetch()
    })
    expect(result).toMatchObject({ data: 2, status: 'success' })
    expect(first.text()).toBe('2')
    expect(second.text()).toBe('2')
    expect(other.text()).toBe('7')
    expect(fetch).toHaveBeenCalledOnce()
    expect(otherFetch).not.toHaveBeenCalled()
  })

  it('retries a failed read and reports a failed refresh as state without rejecting', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2)
    const page = mount(() => ({ key: ['stock', 'retry'], fetch }))
    await settle()
    expect(page.value().status).toBe('error')
    expect(page.value().refetch).toEqual(expect.any(Function))
    await act(async () => {
      await page.value().refetch()
    })
    expect(page.value().data).toBe(2)
    fetch.mockRejectedValueOnce(new Error('still offline'))
    await act(async () => {
      await expect(page.value().refetch()).resolves.toMatchObject({ status: 'error' })
    })
    expect(page.value().error).toEqual(new Error('still offline'))
    expect(page.text()).toBe('2')
  })

  it('leaves a disabled query idle without fetching or invalidating another document', async () => {
    getQueryClient().set(['stock', 'disabled'], 5)
    const page = mount<number>(() => null)
    expect(page.value().refetch).toEqual(expect.any(Function))
    await act(async () => {
      await expect(page.value().refetch()).resolves.toMatchObject({ status: 'idle' })
    })
    expect(page.value().data).toBeUndefined()
    expect(getQueryClient().get(['stock', 'disabled'])).toBe(5)
  })

  it('keeps the refresh action stable across renders and binds a new action to a changed key', async () => {
    let id = 'one'
    let count = 0
    const page = mount(() => ({ key: ['stock', id], fetch: async () => ++count }))
    await settle()
    const first = page.value().refetch
    expect(first).toEqual(expect.any(Function))
    page.rerender()
    expect(page.value().refetch).toBe(first)
    expect(count).toBe(1)
    id = 'two'
    page.rerender()
    await settle()
    expect(page.value().refetch).not.toBe(first)
    await act(async () => {
      await page.value().refetch()
    })
    expect(page.text()).toBe('3')
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
    const page = mount(() => ({ key: ['stock', 'pending'], fetch }))
    expect(page.value().refetch).toEqual(expect.any(Function))
    let first!: Promise<QueryState<number>>
    let second!: Promise<QueryState<number>>
    act(() => {
      first = page.value().refetch()
      second = page.value().refetch()
    })
    expect(page.text()).toBe('1')
    expect(fetch).toHaveBeenCalledOnce()
    await act(async () => {
      resolve(2)
      await Promise.all([first, second])
    })
    expect(page.text()).toBe('2')
    expect(page.value().isFetching).toBe(false)
  })
})
