/**
 * `@molecule/app-health`
 * Provider management tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { getProvider, hasProvider, querySamples, setProvider } from '../provider.js'
import type { HealthAuthStatus, HealthCapabilities, HealthProvider } from '../types.js'
import { getStepsToday } from '../utilities.js'

// Create a mock provider
function createMockProvider(): HealthProvider {
  return {
    requestAuthorization: vi.fn().mockResolvedValue(true),
    getAuthorizationStatus: vi.fn().mockResolvedValue('authorized' as HealthAuthStatus),
    querySamples: vi.fn().mockResolvedValue([]),
    queryStatistics: vi.fn().mockResolvedValue({ count: 0 }),
    writeSample: vi.fn().mockResolvedValue(undefined),
    queryWorkouts: vi.fn().mockResolvedValue([]),
    writeWorkout: vi.fn().mockResolvedValue(undefined),
    querySleep: vi.fn().mockResolvedValue([]),
    deleteSamples: vi.fn().mockResolvedValue(undefined),
    openHealthApp: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      platform: 'ios',
      readableTypes: ['steps', 'heartRate'],
      writableTypes: ['steps'],
      supportsBackgroundDelivery: true,
    } as HealthCapabilities),
  }
}

describe('Provider Management', () => {
  // Bond state is a module-level singleton shared across tests, so start every
  // test from a known-unbonded state (the honest default: no provider ships).
  beforeEach(() => {
    unbond('health')
  })

  describe('setProvider', () => {
    it('should set the provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('hasProvider', () => {
    it('should return true when provider is set', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })

    it('should return false when no provider is bonded (feature-detectable)', () => {
      // No provider ships with the fleet — apps must be able to detect this and
      // hide the feature instead of hitting a throw.
      expect(hasProvider()).toBe(false)
    })
  })

  describe('unbonded (no provider ships with the fleet)', () => {
    it('getProvider() throws an actionable error naming the gap and the fix', () => {
      expect(hasProvider()).toBe(false)
      // Names the gap...
      expect(() => getProvider()).toThrow('No health provider bonded')
      expect(() => getProvider()).toThrow('No provider ships with the fleet')
      // ...and the fix.
      expect(() => getProvider()).toThrow('HealthProvider')
      expect(() => getProvider()).toThrow('setProvider()')
      // Does NOT reference a provider package that doesn't exist.
      expect(() => getProvider()).not.toThrow('app-health-capacitor')
    })

    it('a data read (querySamples) surfaces the same actionable throw, not fake data', async () => {
      await expect(
        querySamples('steps', { startDate: '2026-01-01', endDate: '2026-01-02' }),
      ).rejects.toThrow(/No health provider bonded/)
    })

    it('a convenience read (getStepsToday) throws rather than return a fake zero', async () => {
      await expect(getStepsToday()).rejects.toThrow(/No health provider bonded/)
    })
  })
})
