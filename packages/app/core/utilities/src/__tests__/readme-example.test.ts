/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, with only `fetch` stubbed and fake
 * timers driving the debounce / retry delays.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getLocale, t } from '@molecule/app-i18n'

import { debounce, formatCurrency, getErrorMessage, retry, toQueryString } from '../index.js'

interface Product {
  name: string
  price: number
}

/**
 * Builds the example's debounced search handler around a render sink.
 *
 * @param render - Receives the rendered lines.
 * @returns The debounced input handler.
 */
const createSearch = (render: (lines: string[]) => void): ((value: unknown) => void) => {
  const loadProducts = async (query: string): Promise<Product[]> => {
    const response = await fetch(`/api/products${toQueryString({ q: query, limit: 5 })}`)
    if (!response.ok) throw new Error(`Search failed (${response.status})`)
    return (await response.json()) as Product[]
  }

  return debounce((value: unknown) => {
    retry(() => loadProducts(String(value)), { maxAttempts: 3, initialDelay: 500 })
      .then((products) =>
        render(products.map((p) => `${p.name} ${formatCurrency(p.price, 'EUR', getLocale())}`)),
      )
      .catch((error: unknown) => render([getErrorMessage(error, undefined, t)]))
  }, 300)
}

describe('README @example', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('debounces to the last input, fetches it once and renders localized prices', async () => {
    const fetchMock = vi.fn(async (_url: string) => {
      return new Response(JSON.stringify([{ name: 'Fern', price: 12.5 }]), {
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const rendered: string[][] = []
    const onSearchInput = createSearch((lines) => rendered.push(lines))

    onSearchInput('f')
    onSearchInput('fern')
    await vi.advanceTimersByTimeAsync(299)
    expect(fetchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await vi.waitFor(() => expect(rendered).toHaveLength(1))

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/products?q=fern&limit=5'])
    expect(rendered[0]).toEqual([`Fern ${formatCurrency(12.5, 'EUR', 'en')}`])
    expect(rendered[0]?.[0]).toMatch(/^Fern €12\.50$/)
  })

  it('retries failed requests, then renders the last error message', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response('down', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const rendered: string[][] = []
    const onSearchInput = createSearch((lines) => rendered.push(lines))

    onSearchInput('fern')
    await vi.advanceTimersByTimeAsync(300 + 500 + 1000)
    await vi.waitFor(() => expect(rendered).toHaveLength(1))

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(rendered).toEqual([['Search failed (503)']])
  })
})
