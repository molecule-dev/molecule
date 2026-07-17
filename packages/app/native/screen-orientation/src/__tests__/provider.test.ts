import { bond, get, reset } from '@molecule/app-bond'
import { beforeEach, describe, expect, it } from 'vitest'

import { getProvider, hasProvider, setProvider } from '../provider.js'
import type { OrientationLock, OrientationType, ScreenOrientationProvider } from '../types.js'

const createMockProvider = (): ScreenOrientationProvider => ({
  getOrientation: async () => 'portrait-primary' as OrientationType,
  getState: async () => ({
    type: 'portrait-primary' as OrientationType,
    angle: 0,
    isLocked: false,
  }),
  getDimensions: async () => ({
    width: 375,
    height: 812,
    pixelRatio: 3,
    isLandscape: false,
    isPortrait: true,
  }),
  lock: async () => {},
  unlock: async () => {},
  isLocked: async () => false,
  onChange: () => () => {},
  getCapabilities: async () => ({
    supported: true,
    canLock: true,
    supportedLockTypes: ['portrait', 'landscape', 'any'] as OrientationLock[],
    canDetectChanges: true,
  }),
})

describe('Provider Management', () => {
  // Storage is now the shared @molecule/app-bond registry, so we CAN reset
  // it between tests for real isolation.
  beforeEach(() => {
    reset()
  })

  describe('setProvider', () => {
    it('should set a provider', () => {
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

    it('should throw a descriptive error when no provider is set', () => {
      expect(() => getProvider()).toThrow(/No provider set/)
    })
  })

  describe('hasProvider', () => {
    it('should return true when a provider is set', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('should return false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })
  })

  // The exact bug behind finding L138: a provider wired through the shared
  // @molecule/app-bond registry must be visible via this core's accessors.
  describe('shared @molecule/app-bond registry', () => {
    it('bond("screen-orientation", provider) is visible through getProvider()/hasProvider()', () => {
      const mockProvider = createMockProvider()
      bond('screen-orientation', mockProvider)
      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)
    })

    it('setProvider() writes the same slot app-bond get("screen-orientation") reads', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(get('screen-orientation')).toBe(mockProvider)
    })
  })
})
