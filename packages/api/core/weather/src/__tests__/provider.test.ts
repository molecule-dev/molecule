import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherLocation,
  WeatherProvider,
} from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getCurrent: typeof ProviderModule.getCurrent
let getForecast: typeof ProviderModule.getForecast
let getHourly: typeof ProviderModule.getHourly

const buildProvider = (overrides: Partial<WeatherProvider> = {}): WeatherProvider => ({
  getCurrent: vi.fn(),
  getForecast: vi.fn(),
  getHourly: vi.fn(),
  ...overrides,
})

const sampleCurrent: CurrentWeather = {
  time: new Date('2026-05-01T12:00:00Z'),
  temperatureC: 18.5,
  feelsLikeC: 17.9,
  humidity: 64,
  precipitationMm: 0,
  wind: { speedKmh: 12.4, directionDeg: 215, gustKmh: 22.1 },
  code: 1,
  summary: 'Mainly clear',
}

const sampleDaily: DailyForecast = {
  date: new Date('2026-05-01T00:00:00Z'),
  temperatureMinC: 11.2,
  temperatureMaxC: 21.7,
  feelsLikeMinC: 10.5,
  feelsLikeMaxC: 21.0,
  humidity: 60,
  precipitationMm: 1.4,
  wind: { speedKmh: 18.0, directionDeg: 220, gustKmh: 35.0 },
  code: 61,
  summary: 'Light rain',
}

describe('weather provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    getCurrent = providerModule.getCurrent
    getForecast = providerModule.getForecast
    getHourly = providerModule.getHourly
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Weather provider not configured. Call setProvider() first.',
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

  describe('getCurrent', () => {
    const location: WeatherLocation = { lat: 40.7128, lon: -74.006 }

    it('should throw when no provider is set', async () => {
      await expect(getCurrent(location)).rejects.toThrow('Weather provider not configured')
    })

    it('should call provider getCurrent and return the reading', async () => {
      const mockGetCurrent = vi.fn().mockResolvedValue(sampleCurrent)
      setProvider(buildProvider({ getCurrent: mockGetCurrent }))

      const result = await getCurrent(location)

      expect(mockGetCurrent).toHaveBeenCalledWith(location)
      expect(result).toBe(sampleCurrent)
    })
  })

  describe('getForecast', () => {
    const location: WeatherLocation = { lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' }

    it('should throw when no provider is set', async () => {
      await expect(getForecast(location)).rejects.toThrow('Weather provider not configured')
    })

    it('should call provider getForecast without days', async () => {
      const mockGetForecast = vi.fn().mockResolvedValue([sampleDaily])
      setProvider(buildProvider({ getForecast: mockGetForecast }))

      const result = await getForecast(location)

      expect(mockGetForecast).toHaveBeenCalledWith(location, undefined)
      expect(result).toEqual([sampleDaily])
    })

    it('should pass days option through to provider getForecast', async () => {
      const mockGetForecast = vi.fn().mockResolvedValue([sampleDaily])
      setProvider(buildProvider({ getForecast: mockGetForecast }))

      const result = await getForecast(location, 14)

      expect(mockGetForecast).toHaveBeenCalledWith(location, 14)
      expect(result).toEqual([sampleDaily])
    })
  })

  describe('getHourly', () => {
    const location: WeatherLocation = { lat: 35.6762, lon: 139.6503 }

    it('should throw when no provider is set', async () => {
      await expect(getHourly(location)).rejects.toThrow('Weather provider not configured')
    })

    it('should call provider getHourly without hours', async () => {
      const hourly: HourlyForecast[] = [sampleCurrent]
      const mockGetHourly = vi.fn().mockResolvedValue(hourly)
      setProvider(buildProvider({ getHourly: mockGetHourly }))

      const result = await getHourly(location)

      expect(mockGetHourly).toHaveBeenCalledWith(location, undefined)
      expect(result).toBe(hourly)
    })

    it('should pass hours option through to provider getHourly', async () => {
      const hourly: HourlyForecast[] = [sampleCurrent]
      const mockGetHourly = vi.fn().mockResolvedValue(hourly)
      setProvider(buildProvider({ getHourly: mockGetHourly }))

      const result = await getHourly(location, 48)

      expect(mockGetHourly).toHaveBeenCalledWith(location, 48)
      expect(result).toBe(hourly)
    })
  })
})

describe('weather types', () => {
  it('should accept a minimal WeatherProvider implementation', () => {
    const provider: WeatherProvider = {
      getCurrent: async () => sampleCurrent,
      getForecast: async () => [sampleDaily],
      getHourly: async () => [sampleCurrent],
    }
    expect(typeof provider.getCurrent).toBe('function')
    expect(typeof provider.getForecast).toBe('function')
    expect(typeof provider.getHourly).toBe('function')
  })

  it('should accept WeatherLocation with timezone', () => {
    const location: WeatherLocation = {
      lat: 40.7128,
      lon: -74.006,
      timezone: 'America/New_York',
    }
    expect(location.timezone).toBe('America/New_York')
  })

  it('should accept WindReading with null direction', () => {
    const reading: CurrentWeather = {
      ...sampleCurrent,
      wind: { speedKmh: 0, directionDeg: null },
    }
    expect(reading.wind.directionDeg).toBeNull()
  })
})
