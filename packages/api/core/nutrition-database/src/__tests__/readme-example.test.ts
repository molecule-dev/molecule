/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the Open Food Facts bond,
 * with only the network (`fetch`) stubbed, as the bond's own tests do.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-nutrition-database-open-food-facts'

import { getFoodByBarcode, searchFood, setProvider } from '../index.js'

const product = {
  code: '3017620422003',
  _id: '3017620422003',
  product_name: 'Nutella',
  brands: 'Ferrero',
  serving_size: '1 tbsp (15g)',
  serving_quantity: 15,
  quantity: '350 g',
  product_quantity_unit: 'g',
  nutriments: {
    'energy-kcal_100g': 539,
    proteins_100g: 6.3,
    fat_100g: 30.9,
    carbohydrates_100g: 57.5,
    sodium_100g: 0.041,
  },
}

const jsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds Open Food Facts, searches, looks up a barcode, and scales a portion', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.includes('/cgi/search.pl')
        ? jsonResponse({ count: 1, page: 1, page_size: 10, products: [product] })
        : jsonResponse({ status: 1, code: product.code, product }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({ userAgent: process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'MyApp/1.0' }),
    )

    const results = await searchFood('nutella', { limit: 10, page: 1 })
    expect(results.map((r) => r.name)).toEqual(['Nutella'])

    const food = await getFoodByBarcode('3017620422003')
    expect(food?.brand).toBe('Ferrero')
    expect(food?.nutrition.referenceQuantity).toBe(100)
    expect(food?.nutrition.sodium).toBeCloseTo(41)

    const grams = 30
    const kcal =
      food && food.nutrition.calories !== null
        ? (food.nutrition.calories * grams) / food.nutrition.referenceQuantity
        : null
    expect(kcal).toBeCloseTo(161.7)

    const searchUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(searchUrl.searchParams.get('search_terms')).toBe('nutella')
    expect(searchUrl.searchParams.get('page_size')).toBe('10')
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers['User-Agent']).toBeTruthy()
  })

  it('returns null (not an error) for an unknown barcode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ status: 0, status_verbose: 'product not found' })),
    )
    setProvider(createProvider({ userAgent: 'MyApp/1.0' }))
    expect(await getFoodByBarcode('0000000000000')).toBeNull()
  })
})
