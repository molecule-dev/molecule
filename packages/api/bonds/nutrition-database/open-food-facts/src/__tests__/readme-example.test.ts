/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the network (`fetch` to Open Food Facts)
 * is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getFoodByBarcode, searchFood, setProvider } from '@molecule/api-nutrition-database'

import { createProvider } from '../index.js'

const nutella = {
  code: '3017620422003',
  product_name: 'Nutella',
  brands: 'Ferrero, Nutella',
  quantity: '400 g',
  nutriments: { 'energy-kcal_100g': 539, sodium_100g: 0.041, proteins_100g: 6.3 },
}

const yogurt = {
  code: '0000000000017',
  product_name: 'Greek Yogurt',
  brands: 'Acme Dairy',
  nutriments: { 'energy-kcal_100g': 97 },
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('searches and looks up by barcode through the core, normalizing units', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      const body = url.includes('/cgi/search.pl')
        ? { count: 1, products: [yogurt] }
        : { status: 1, product: nutella }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        userAgent: process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'AcmeFit/1.0 (support@acme.example)',
        timeout: 10_000,
      }),
    )

    const results = await searchFood('greek yogurt', { limit: 10, page: 1 })
    const food = await getFoodByBarcode('3017620422003')

    expect(results.map((item) => item.name)).toEqual(['Greek Yogurt'])
    expect(food).not.toBeNull()
    expect(food?.name).toBe('Nutella')
    expect(food?.brand).toBe('Ferrero')
    expect(food?.nutrition.calories).toBe(539)
    expect(food?.nutrition.sodium).toBeCloseTo(41)
    expect(food?.nutrition.fat).toBeNull()

    const [searchUrl, searchInit] = fetchMock.mock.calls[0] ?? []
    expect(String(searchUrl)).toContain('search_terms=greek+yogurt')
    expect(String(searchUrl)).toContain('page_size=10')
    expect((searchInit?.headers as Record<string, string>)['User-Agent']).toBe(
      process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'AcmeFit/1.0 (support@acme.example)',
    )
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      'https://world.openfoodfacts.org/api/v2/product/3017620422003.json',
    )
  })
})
