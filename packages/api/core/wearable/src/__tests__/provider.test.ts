/**
 * Tests for the wearable core provider wiring.
 *
 * @module
 */

vi.mock('@molecule/api-bond', () => {
  let store: Record<string, Map<string, unknown>> = {}
  return {
    bond: vi.fn((type: string, nameOrProvider: unknown, provider?: unknown) => {
      // Named multi-provider only path is exercised by this core.
      if (typeof nameOrProvider === 'string' && provider !== undefined) {
        if (!store[type]) store[type] = new Map()
        store[type].set(nameOrProvider, provider)
      }
    }),
    get: vi.fn((type: string, name?: string) => {
      if (name === undefined) return undefined
      return store[type]?.get(name)
    }),
    getAll: vi.fn((type: string) => {
      return store[type] ?? new Map()
    }),
    isBonded: vi.fn((type: string, name?: string) => {
      if (name === undefined) return Boolean(store[type] && store[type].size > 0)
      return Boolean(store[type]?.has(name))
    }),
    require: vi.fn((type: string, name?: string) => {
      if (name === undefined || !store[type]?.has(name)) {
        throw new Error(`No '${type}:${name}' provider bonded`)
      }
      return store[type].get(name)
    }),
    __reset: () => {
      store = {}
    },
  }
})

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  ),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type {
  DailyActivity,
  HeartRateSummary,
  SleepSession,
  UserConnection,
  WearableProvider,
  WeightEntry,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let getOptionalProvider: typeof ProviderModule.getOptionalProvider
let hasProvider: typeof ProviderModule.hasProvider
let listProviders: typeof ProviderModule.listProviders

const stubConnection = (overrides: Partial<UserConnection> = {}): UserConnection => ({
  userId: 'user-1',
  providerAccountId: 'fitbit-acct',
  accessToken: 'access',
  refreshToken: 'refresh',
  connectedAt: 1_700_000_000_000,
  ...overrides,
})

const stubActivity = (date: string): DailyActivity => ({
  date,
  steps: 0,
  distanceMeters: 0,
  caloriesOut: 0,
  activeMinutes: 0,
})

const stubHr = (date: string): HeartRateSummary => ({ date })

const createMockProvider = (
  name: string,
  overrides: Partial<WearableProvider> = {},
): WearableProvider => ({
  providerName: name,
  getDailyActivity: vi.fn().mockResolvedValue(stubActivity('2026-05-01')),
  getDailySleep: vi.fn().mockResolvedValue([] as SleepSession[]),
  getDailyHeartRate: vi.fn().mockResolvedValue(stubHr('2026-05-01')),
  getWeight: vi.fn().mockResolvedValue([] as WeightEntry[]),
  connect: vi.fn().mockResolvedValue(stubConnection()),
  refreshConnection: vi.fn().mockResolvedValue(stubConnection()),
  disconnect: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('wearable provider', () => {
  beforeEach(async () => {
    vi.resetModules()

    const bondModule = (await import('@molecule/api-bond')) as typeof BondModule & {
      __reset: () => void
    }
    bondModule.__reset()

    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    getOptionalProvider = providerModule.getOptionalProvider
    hasProvider = providerModule.hasProvider
    listProviders = providerModule.listProviders
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('throws an i18n message when the named provider is not bonded', () => {
      expect(() => getProvider('fitbit')).toThrow(/Wearable provider 'fitbit' not configured/)
    })

    it('bonds and retrieves a named provider', () => {
      const fitbit = createMockProvider('fitbit')
      setProvider('fitbit', fitbit)

      expect(hasProvider('fitbit')).toBe(true)
      expect(hasProvider('oura')).toBe(false)
      expect(getProvider('fitbit')).toBe(fitbit)
    })

    it('supports multiple named providers concurrently', () => {
      const fitbit = createMockProvider('fitbit')
      const oura = createMockProvider('oura')
      setProvider('fitbit', fitbit)
      setProvider('oura', oura)

      expect(getProvider('fitbit')).toBe(fitbit)
      expect(getProvider('oura')).toBe(oura)
    })

    it('returns null from getOptionalProvider when not bonded', () => {
      expect(getOptionalProvider('fitbit')).toBeNull()
    })

    it('returns the bonded provider from getOptionalProvider when present', () => {
      const fitbit = createMockProvider('fitbit')
      setProvider('fitbit', fitbit)
      expect(getOptionalProvider('fitbit')).toBe(fitbit)
    })
  })

  describe('listProviders', () => {
    it('returns an empty list when nothing is bonded', () => {
      expect(listProviders()).toEqual([])
    })

    it('returns every bonded provider name', () => {
      setProvider('fitbit', createMockProvider('fitbit'))
      setProvider('oura', createMockProvider('oura'))

      const names = listProviders().sort()
      expect(names).toEqual(['fitbit', 'oura'])
    })
  })
})
