import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { FoodNutrition, NutritionDatabaseProvider } from '../types.js'

// Reset module state between tests so the bond registry is not
// contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let searchFood: typeof ProviderModule.searchFood
let getFoodByBarcode: typeof ProviderModule.getFoodByBarcode
let getFood: typeof ProviderModule.getFood

const buildProvider = (
  overrides: Partial<NutritionDatabaseProvider> = {},
): NutritionDatabaseProvider => ({
  searchFood: vi.fn(),
  getFoodByBarcode: vi.fn(),
  getFood: vi.fn(),
  ...overrides,
})

const buildFood = (overrides: Partial<FoodNutrition> = {}): FoodNutrition => ({
  id: '3017620422003',
  name: 'Nutella',
  brand: 'Ferrero',
  barcode: '3017620422003',
  nutrition: {
    referenceQuantity: 100,
    referenceUnit: 'g',
    calories: 539,
    protein: 6.3,
    fat: 30.9,
    saturatedFat: 10.6,
    carbs: 57.5,
    sugar: 56.3,
    fiber: 3.4,
    sodium: 41,
  },
  perServing: null,
  imageUrl: null,
  ingredientsText: '',
  source: 'open-food-facts',
  ...overrides,
})

describe('nutrition-database provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    searchFood = providerModule.searchFood
    getFoodByBarcode = providerModule.getFoodByBarcode
    getFood = providerModule.getFood
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Nutrition-database provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('searchFood', () => {
    it('should throw when no provider is set', async () => {
      await expect(searchFood('granola')).rejects.toThrow(
        'Nutrition-database provider not configured',
      )
    })

    it('should call provider searchFood without options', async () => {
      const food = buildFood({ id: 'a1', name: 'Granola Bar', barcode: null })
      const mockSearchFood = vi.fn().mockResolvedValue([food])
      setProvider(buildProvider({ searchFood: mockSearchFood }))

      const result = await searchFood('granola')

      expect(mockSearchFood).toHaveBeenCalledWith('granola', undefined)
      expect(result).toEqual([food])
    })

    it('should pass search options through to provider searchFood', async () => {
      const mockSearchFood = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ searchFood: mockSearchFood }))

      const opts = { limit: 5, page: 2 }
      await searchFood('milk', opts)

      expect(mockSearchFood).toHaveBeenCalledWith('milk', opts)
    })
  })

  describe('getFoodByBarcode', () => {
    it('should throw when no provider is set', async () => {
      await expect(getFoodByBarcode('3017620422003')).rejects.toThrow(
        'Nutrition-database provider not configured',
      )
    })

    it('should call provider getFoodByBarcode and return the record', async () => {
      const food = buildFood()
      const mockGetByBarcode = vi.fn().mockResolvedValue(food)
      setProvider(buildProvider({ getFoodByBarcode: mockGetByBarcode }))

      const result = await getFoodByBarcode('3017620422003')

      expect(mockGetByBarcode).toHaveBeenCalledWith('3017620422003')
      expect(result).toBe(food)
    })

    it('should pass through null when the barcode is unknown', async () => {
      const mockGetByBarcode = vi.fn().mockResolvedValue(null)
      setProvider(buildProvider({ getFoodByBarcode: mockGetByBarcode }))

      const result = await getFoodByBarcode('0000000000000')

      expect(result).toBeNull()
    })
  })

  describe('getFood', () => {
    it('should throw when no provider is set', async () => {
      await expect(getFood('xyz')).rejects.toThrow('Nutrition-database provider not configured')
    })

    it('should call provider getFood and return the record', async () => {
      const food = buildFood({ id: 'usda-12345', barcode: null, source: 'usda' })
      const mockGetFood = vi.fn().mockResolvedValue(food)
      setProvider(buildProvider({ getFood: mockGetFood }))

      const result = await getFood('usda-12345')

      expect(mockGetFood).toHaveBeenCalledWith('usda-12345')
      expect(result).toBe(food)
    })

    it('should pass through null when the id is unknown', async () => {
      const mockGetFood = vi.fn().mockResolvedValue(null)
      setProvider(buildProvider({ getFood: mockGetFood }))

      const result = await getFood('does-not-exist')

      expect(result).toBeNull()
    })
  })
})

describe('nutrition-database types', () => {
  it('should accept a minimal NutritionDatabaseProvider implementation', () => {
    const provider: NutritionDatabaseProvider = {
      searchFood: async () => [],
      getFoodByBarcode: async () => null,
      getFood: async () => null,
    }
    expect(typeof provider.searchFood).toBe('function')
    expect(typeof provider.getFoodByBarcode).toBe('function')
    expect(typeof provider.getFood).toBe('function')
  })

  it('should accept a fully-populated FoodNutrition value', () => {
    const food: FoodNutrition = buildFood({
      perServing: {
        referenceQuantity: 30,
        referenceUnit: 'g',
        calories: 162,
        protein: 1.9,
        fat: 9.3,
        saturatedFat: 3.2,
        carbs: 17.3,
        sugar: 16.9,
        fiber: 1.0,
        sodium: 12,
        serving: { quantity: 30, unit: 'g', label: '1 tbsp (30g)' },
      },
      imageUrl: 'https://example.test/img.jpg',
      ingredientsText: 'sugar, palm oil, hazelnuts...',
    })
    expect(food.nutrition.calories).toBe(539)
    expect(food.perServing?.serving.quantity).toBe(30)
    expect(food.source).toBe('open-food-facts')
  })
})
