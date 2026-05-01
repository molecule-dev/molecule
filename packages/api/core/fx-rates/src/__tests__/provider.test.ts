import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { FxDailyRates, FxRatesOptions, FxRatesProvider } from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getRate: typeof ProviderModule.getRate
let getDailyRates: typeof ProviderModule.getDailyRates
let convert: typeof ProviderModule.convert
let listSupportedCurrencies: typeof ProviderModule.listSupportedCurrencies

const buildProvider = (overrides: Partial<FxRatesProvider> = {}): FxRatesProvider => ({
  getRate: vi.fn(),
  getDailyRates: vi.fn(),
  convert: vi.fn(),
  listSupportedCurrencies: vi.fn(),
  ...overrides,
})

describe('fx-rates provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    getRate = providerModule.getRate
    getDailyRates = providerModule.getDailyRates
    convert = providerModule.convert
    listSupportedCurrencies = providerModule.listSupportedCurrencies
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'FX-rates provider not configured. Call setProvider() first.',
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

  describe('getRate', () => {
    it('should throw when no provider is set', async () => {
      await expect(getRate('USD', 'EUR')).rejects.toThrow('FX-rates provider not configured')
    })

    it('should call provider getRate without options', async () => {
      const mockGetRate = vi.fn().mockResolvedValue(0.92)
      setProvider(buildProvider({ getRate: mockGetRate }))

      const result = await getRate('USD', 'EUR')

      expect(mockGetRate).toHaveBeenCalledWith('USD', 'EUR', undefined)
      expect(result).toBe(0.92)
    })

    it('should pass asOf options through to provider getRate', async () => {
      const mockGetRate = vi.fn().mockResolvedValue(1.08)
      setProvider(buildProvider({ getRate: mockGetRate }))

      const asOf = new Date('2024-01-15T00:00:00Z')
      const opts: FxRatesOptions = { asOf }
      const result = await getRate('EUR', 'USD', opts)

      expect(mockGetRate).toHaveBeenCalledWith('EUR', 'USD', opts)
      expect(result).toBe(1.08)
    })
  })

  describe('getDailyRates', () => {
    it('should throw when no provider is set', async () => {
      await expect(getDailyRates()).rejects.toThrow('FX-rates provider not configured')
    })

    it('should call provider getDailyRates and return the snapshot', async () => {
      const snapshot: FxDailyRates = {
        pivot: 'EUR',
        asOf: new Date('2024-01-15T00:00:00Z'),
        rates: { EUR: 1, USD: 1.08, JPY: 160.5 },
      }
      const mockGetDailyRates = vi.fn().mockResolvedValue(snapshot)
      setProvider(buildProvider({ getDailyRates: mockGetDailyRates }))

      const result = await getDailyRates()

      expect(mockGetDailyRates).toHaveBeenCalledWith(undefined)
      expect(result).toBe(snapshot)
    })

    it('should pass asOf options through', async () => {
      const snapshot: FxDailyRates = {
        pivot: 'USD',
        asOf: new Date('2023-06-01T00:00:00Z'),
        rates: { USD: 1, EUR: 0.92 },
      }
      const mockGetDailyRates = vi.fn().mockResolvedValue(snapshot)
      setProvider(buildProvider({ getDailyRates: mockGetDailyRates }))

      const opts: FxRatesOptions = { asOf: new Date('2023-06-01T00:00:00Z') }
      await getDailyRates(opts)

      expect(mockGetDailyRates).toHaveBeenCalledWith(opts)
    })
  })

  describe('convert', () => {
    it('should throw when no provider is set', async () => {
      await expect(convert(100, 'USD', 'EUR')).rejects.toThrow('FX-rates provider not configured')
    })

    it('should call provider convert with minor units', async () => {
      const mockConvert = vi.fn().mockResolvedValue(9_200)
      setProvider(buildProvider({ convert: mockConvert }))

      const result = await convert(10_000, 'USD', 'EUR')

      expect(mockConvert).toHaveBeenCalledWith(10_000, 'USD', 'EUR', undefined)
      expect(result).toBe(9_200)
    })

    it('should pass asOf options through', async () => {
      const mockConvert = vi.fn().mockResolvedValue(10_800)
      setProvider(buildProvider({ convert: mockConvert }))

      const opts: FxRatesOptions = { asOf: new Date('2024-01-15T00:00:00Z') }
      await convert(10_000, 'EUR', 'USD', opts)

      expect(mockConvert).toHaveBeenCalledWith(10_000, 'EUR', 'USD', opts)
    })
  })

  describe('listSupportedCurrencies', () => {
    it('should throw when no provider is set', async () => {
      await expect(listSupportedCurrencies()).rejects.toThrow('FX-rates provider not configured')
    })

    it('should return the list from the provider', async () => {
      const codes = ['USD', 'EUR', 'GBP', 'JPY']
      const mockList = vi.fn().mockResolvedValue(codes)
      setProvider(buildProvider({ listSupportedCurrencies: mockList }))

      const result = await listSupportedCurrencies()

      expect(mockList).toHaveBeenCalledTimes(1)
      expect(result).toEqual(codes)
    })
  })
})

describe('fx-rates types', () => {
  it('should accept a minimal FxRatesProvider implementation', () => {
    const provider: FxRatesProvider = {
      getRate: async () => 1,
      getDailyRates: async () => ({
        pivot: 'EUR',
        asOf: new Date(0),
        rates: { EUR: 1 },
      }),
      convert: async (amount) => amount,
      listSupportedCurrencies: async () => ['EUR'],
    }
    expect(typeof provider.getRate).toBe('function')
    expect(typeof provider.getDailyRates).toBe('function')
    expect(typeof provider.convert).toBe('function')
    expect(typeof provider.listSupportedCurrencies).toBe('function')
  })

  it('should accept an FxDailyRates value', () => {
    const snapshot: FxDailyRates = {
      pivot: 'EUR',
      asOf: new Date('2024-01-15T00:00:00Z'),
      rates: { EUR: 1, USD: 1.08, JPY: 160.5 },
    }
    expect(snapshot.pivot).toBe('EUR')
    expect(snapshot.rates.USD).toBeCloseTo(1.08)
  })
})
