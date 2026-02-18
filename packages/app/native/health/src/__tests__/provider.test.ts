/**
 * `@molecule/app-health`
 * Provider management tests
 */

import { describe, expect, it, vi } from 'vitest'

import { getProvider, hasProvider, setProvider } from '../provider.js'
import type { HealthAuthStatus, HealthCapabilities, HealthProvider } from '../types.js'

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
  })
})
