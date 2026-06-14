import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NutritionDatabaseProvider } from '@molecule/api-nutrition-database'

import { createProvider } from '../provider.js'
import { OpenFoodFactsRateLimitedError, RATE_LIMITED } from '../types.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
 *
 * @param data - JSON body the response should resolve to.
 * @param status - HTTP status. Defaults to `200`.
 * @param headers - Response headers (lower-case keys).
 * @returns A minimal `Response` stub.
 */
const mockFetchResponse = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string): string | null => headers[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(data),
  }) as unknown as Response

// Realistic fragment of an Open Food Facts /api/v2/product/:code.json
// response for Nutella (3017620422003). Fields are taken verbatim from
// the published API; only the fields the provider reads are populated.
const NUTELLA_PRODUCT_FIXTURE = {
  status: 1,
  status_verbose: 'product found',
  code: '3017620422003',
  product: {
    code: '3017620422003',
    _id: '3017620422003',
    product_name: 'Nutella',
    product_name_en: 'Nutella',
    brands: 'Ferrero, Nutella',
    image_front_url:
      'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.jpg',
    image_url: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front.jpg',
    ingredients_text: 'sugar, palm oil, hazelnuts 13%, skimmed milk powder...',
    serving_size: '1 tbsp (15g)',
    serving_quantity: 15,
    quantity: '350 g',
    product_quantity_unit: 'g',
    nutriments: {
      'energy-kcal_100g': 539,
      'energy-kcal_serving': 80.85,
      proteins_100g: 6.3,
      proteins_serving: 0.945,
      fat_100g: 30.9,
      fat_serving: 4.635,
      'saturated-fat_100g': 10.6,
      'saturated-fat_serving': 1.59,
      carbohydrates_100g: 57.5,
      carbohydrates_serving: 8.625,
      sugars_100g: 56.3,
      sugars_serving: 8.445,
      fiber_100g: 3.4,
      fiber_serving: 0.51,
      sodium_100g: 0.041,
      sodium_serving: 0.00615,
    },
  },
}

const SEARCH_FIXTURE = {
  count: 2,
  page: 1,
  page_size: 20,
  products: [
    {
      code: '3017620422003',
      product_name: 'Nutella',
      brands: 'Ferrero',
      image_front_url: 'https://example.test/nutella.jpg',
      ingredients_text: 'sugar, palm oil...',
      serving_size: '1 tbsp (15g)',
      serving_quantity: 15,
      product_quantity_unit: 'g',
      quantity: '350 g',
      nutriments: {
        'energy-kcal_100g': 539,
        proteins_100g: 6.3,
        fat_100g: 30.9,
        'saturated-fat_100g': 10.6,
        carbohydrates_100g: 57.5,
        sugars_100g: 56.3,
        fiber_100g: 3.4,
        sodium_100g: 0.041,
      },
    },
    {
      code: '5012345678900',
      product_name: 'Generic Hazelnut Spread',
      brands: 'Store Brand',
      ingredients_text: 'sugar, vegetable oil, hazelnuts...',
      product_quantity_unit: 'g',
      quantity: '400 g',
      nutriments: {
        'energy-kcal_100g': 510,
        proteins_100g: 5.2,
        fat_100g: 28.0,
        carbohydrates_100g: 60.0,
        sugars_100g: 55.0,
        sodium_100g: 0.05,
      },
    },
  ],
}

// Liquid product (uses ml) — sparkling water. Open Food Facts uses
// `product_quantity_unit: 'ml'` for liquids and reports per-100g keys
// that are actually per-100ml in this case.
const SPARKLING_WATER_PRODUCT_FIXTURE = {
  status: 1,
  code: '5449000000996',
  product: {
    code: '5449000000996',
    product_name: 'Sparkling Water',
    brands: 'AcmeAqua',
    serving_size: '250 ml',
    serving_quantity: 250,
    quantity: '500 ml',
    product_quantity_unit: 'ml',
    nutriments: {
      'energy-kcal_100g': 0,
      'energy-kcal_serving': 0,
      proteins_100g: 0,
      fat_100g: 0,
      carbohydrates_100g: 0,
      sodium_100g: 0.012,
    },
  },
}

// Salt-only product — provider should convert to sodium via /2.5.
const SALT_ONLY_FIXTURE = {
  status: 1,
  code: '1111111111111',
  product: {
    code: '1111111111111',
    product_name: 'Salty Snack',
    quantity: '100 g',
    nutriments: {
      'energy-kcal_100g': 500,
      salt_100g: 2.5, // → sodium = 1g = 1000mg
    },
  },
}

const NOT_FOUND_FIXTURE = {
  status: 0,
  status_verbose: 'product not found',
  code: '0000000000000',
}

describe('open-food-facts nutrition-database provider', () => {
  let provider: NutritionDatabaseProvider

  beforeEach(() => {
    provider = createProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with the expected methods', () => {
      expect(provider).toBeDefined()
      expect(provider.searchFood).toBeInstanceOf(Function)
      expect(provider.getFoodByBarcode).toBeInstanceOf(Function)
      expect(provider.getFood).toBeInstanceOf(Function)
    })
  })

  describe('User-Agent', () => {
    it('should send a default polite, brand-neutral User-Agent', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await provider.getFoodByBarcode('3017620422003')

      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
      const headers = init?.headers as Record<string, string> | undefined
      // A shared package must not brand outbound traffic as any specific product
      // (e.g. molecule.dev) — the default UA is generic; hosts override it.
      expect(headers?.['User-Agent']).toBe('OpenFoodFactsClient/1.0')
      expect(headers?.['User-Agent']).not.toMatch(/molecule\.dev/i)
      expect(headers?.['Accept']).toBe('application/json')
    })

    it('should send the configured User-Agent when supplied', async () => {
      const customProvider = createProvider({
        userAgent: 'my-app/2.3 (mailto:dev@example.test)',
      })
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await customProvider.getFoodByBarcode('3017620422003')

      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
      const headers = init?.headers as Record<string, string> | undefined
      expect(headers?.['User-Agent']).toBe('my-app/2.3 (mailto:dev@example.test)')
    })
  })

  describe('getFoodByBarcode', () => {
    it('should map a /api/v2/product/:code response into a normalized record', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      const food = await provider.getFoodByBarcode('3017620422003')

      expect(food).not.toBeNull()
      expect(food?.id).toBe('3017620422003')
      expect(food?.barcode).toBe('3017620422003')
      expect(food?.name).toBe('Nutella')
      expect(food?.brand).toBe('Ferrero')
      expect(food?.imageUrl).toContain('front_en.jpg')
      expect(food?.ingredientsText).toContain('hazelnuts')
      expect(food?.source).toBe('open-food-facts')

      expect(food?.nutrition.referenceQuantity).toBe(100)
      expect(food?.nutrition.referenceUnit).toBe('g')
      expect(food?.nutrition.calories).toBe(539)
      expect(food?.nutrition.protein).toBe(6.3)
      expect(food?.nutrition.fat).toBe(30.9)
      expect(food?.nutrition.saturatedFat).toBe(10.6)
      expect(food?.nutrition.carbs).toBe(57.5)
      expect(food?.nutrition.sugar).toBe(56.3)
      expect(food?.nutrition.fiber).toBe(3.4)
      // sodium reported as 0.041 g → 41 mg
      expect(food?.nutrition.sodium).toBeCloseTo(41, 5)
    })

    it('should populate the per-serving panel when serving_quantity is supplied', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE)))

      const food = await provider.getFoodByBarcode('3017620422003')

      expect(food?.perServing).not.toBeNull()
      expect(food?.perServing?.serving.quantity).toBe(15)
      expect(food?.perServing?.serving.unit).toBe('g')
      expect(food?.perServing?.serving.label).toBe('1 tbsp (15g)')
      expect(food?.perServing?.calories).toBeCloseTo(80.85, 5)
      expect(food?.perServing?.protein).toBeCloseTo(0.945, 5)
      // 0.00615 g sodium → 6.15 mg
      expect(food?.perServing?.sodium).toBeCloseTo(6.15, 5)
    })

    it('should call the canonical product URL with the barcode encoded', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await provider.getFoodByBarcode('3017620422003')

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toBe('https://world.openfoodfacts.org/api/v2/product/3017620422003.json')
    })

    it('should return null when the upstream API reports status: 0', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(NOT_FOUND_FIXTURE)))

      const food = await provider.getFoodByBarcode('0000000000000')

      expect(food).toBeNull()
    })

    it('should detect liquid products and use ml as the reference unit', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(SPARKLING_WATER_PRODUCT_FIXTURE)),
      )

      const food = await provider.getFoodByBarcode('5449000000996')

      expect(food?.nutrition.referenceUnit).toBe('ml')
      expect(food?.nutrition.referenceQuantity).toBe(100)
      expect(food?.perServing?.serving.unit).toBe('ml')
      expect(food?.perServing?.serving.quantity).toBe(250)
    })

    it('should derive sodium from salt when sodium is missing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(SALT_ONLY_FIXTURE)))

      const food = await provider.getFoodByBarcode('1111111111111')

      // salt 2.5g → sodium = 1g = 1000mg
      expect(food?.nutrition.sodium).toBeCloseTo(1000, 5)
    })

    it('should pick only the first brand when multiple are listed', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE)))

      const food = await provider.getFoodByBarcode('3017620422003')

      expect(food?.brand).toBe('Ferrero')
    })

    it('should raise OpenFoodFactsRateLimitedError on HTTP 429', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': '30' })),
      )

      await expect(provider.getFoodByBarcode('3017620422003')).rejects.toMatchObject({
        name: 'OpenFoodFactsRateLimitedError',
        code: RATE_LIMITED,
        retryAfterSeconds: 30,
      })
    })

    it('should raise on other HTTP errors', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 503)))

      await expect(provider.getFoodByBarcode('3017620422003')).rejects.toThrow(
        /Open Food Facts API request failed with status 503/,
      )
    })
  })

  describe('getFood', () => {
    it('should alias getFoodByBarcode (Open Food Facts ids are barcodes)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      const food = await provider.getFood('3017620422003')

      expect(food?.id).toBe('3017620422003')
      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toBe('https://world.openfoodfacts.org/api/v2/product/3017620422003.json')
    })

    it('should return null when the id is unknown', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(NOT_FOUND_FIXTURE)))

      const food = await provider.getFood('0000000000000')

      expect(food).toBeNull()
    })
  })

  describe('searchFood', () => {
    it('should map /cgi/search.pl into normalized records', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(SEARCH_FIXTURE)))

      const results = await provider.searchFood('hazelnut spread')

      expect(results).toHaveLength(2)
      expect(results[0]?.name).toBe('Nutella')
      expect(results[0]?.brand).toBe('Ferrero')
      expect(results[0]?.nutrition.calories).toBe(539)
      expect(results[1]?.name).toBe('Generic Hazelnut Spread')
      expect(results[1]?.barcode).toBe('5012345678900')
    })

    it('should call the search URL with query, page_size, page, and json=1', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ products: [] }))
      vi.stubGlobal('fetch', fetchMock)

      await provider.searchFood('granola bar', { limit: 5, page: 3 })

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toMatch(/^https:\/\/world\.openfoodfacts\.org\/cgi\/search\.pl\?/)
      expect(url).toContain('search_terms=granola+bar')
      expect(url).toContain('json=1')
      expect(url).toContain('page_size=5')
      expect(url).toContain('page=3')
      expect(url).toContain('fields=')
    })

    it('should default to page_size=20 and page=1 when options are omitted', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ products: [] }))
      vi.stubGlobal('fetch', fetchMock)

      await provider.searchFood('milk')

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toContain('page_size=20')
      expect(url).toContain('page=1')
    })

    it('should return an empty array when the upstream response has no products', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ count: 0 })))

      const results = await provider.searchFood('nonexistent food')

      expect(results).toEqual([])
    })

    it('should drop per-serving panel when no per-serving values are present', async () => {
      // Search responses often omit serving data entirely.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(SEARCH_FIXTURE)))

      const results = await provider.searchFood('hazelnut spread')

      // Item index 1 has no serving_quantity → perServing should be null.
      expect(results[1]?.perServing).toBeNull()
    })
  })

  describe('createProvider with custom baseUrl', () => {
    it('should send requests to the configured base URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(NUTELLA_PRODUCT_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      const customProvider = createProvider({ baseUrl: 'https://us.openfoodfacts.org' })
      await customProvider.getFoodByBarcode('3017620422003')

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toBe('https://us.openfoodfacts.org/api/v2/product/3017620422003.json')
    })
  })

  describe('OpenFoodFactsRateLimitedError', () => {
    it('should expose retryAfterSeconds parsed from delta-seconds header', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': '120' })),
      )

      try {
        await provider.getFoodByBarcode('3017620422003')
        expect.unreachable()
      } catch (err) {
        expect(err).toBeInstanceOf(OpenFoodFactsRateLimitedError)
        expect((err as OpenFoodFactsRateLimitedError).retryAfterSeconds).toBe(120)
      }
    })

    it('should fall back to retryAfterSeconds=null when header is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      try {
        await provider.getFoodByBarcode('3017620422003')
        expect.unreachable()
      } catch (err) {
        expect(err).toBeInstanceOf(OpenFoodFactsRateLimitedError)
        expect((err as OpenFoodFactsRateLimitedError).retryAfterSeconds).toBeNull()
      }
    })
  })
})
