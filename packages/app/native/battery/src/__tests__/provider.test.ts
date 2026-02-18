import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCapabilities,
  getLevel,
  getProvider,
  getStatus,
  hasProvider,
  isCharging,
  isLowPowerMode,
  onChange,
  onChargingChange,
  onCritical,
  onLow,
  setProvider,
} from '../provider.js'
import type { BatteryProvider } from '../types.js'

const createMockProvider = (overrides?: Partial<BatteryProvider>): BatteryProvider => ({
  getStatus: vi.fn().mockResolvedValue({
    level: 0.75,
    isCharging: false,
    chargingState: 'discharging',
    isLow: false,
    isCritical: false,
  }),
  getLevel: vi.fn().mockResolvedValue(0.75),
  isCharging: vi.fn().mockResolvedValue(false),
  isLowPowerMode: vi.fn().mockResolvedValue(false),
  onChange: vi.fn().mockReturnValue(() => {}),
  onChargingChange: vi.fn().mockReturnValue(() => {}),
  onLow: vi.fn().mockReturnValue(() => {}),
  onCritical: vi.fn().mockReturnValue(() => {}),
  getCapabilities: vi.fn().mockResolvedValue({
    supported: true,
    hasChargingTime: true,
    hasDischargingTime: true,
    hasLowPowerMode: true,
    hasChargingState: true,
  }),
  ...overrides,
})

describe('Provider Management', () => {
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
  })

  describe('hasProvider', () => {
    it('should return true when a provider is set', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })
})

describe('Convenience Functions', () => {
  let mockProvider: BatteryProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('getStatus', () => {
    it('should return battery status', async () => {
      const status = await getStatus()
      expect(status.level).toBe(0.75)
      expect(status.isCharging).toBe(false)
      expect(status.chargingState).toBe('discharging')
      expect(mockProvider.getStatus).toHaveBeenCalled()
    })
  })

  describe('getLevel', () => {
    it('should return battery level', async () => {
      const level = await getLevel()
      expect(level).toBe(0.75)
      expect(mockProvider.getLevel).toHaveBeenCalled()
    })
  })

  describe('isCharging', () => {
    it('should return charging state', async () => {
      const charging = await isCharging()
      expect(charging).toBe(false)
      expect(mockProvider.isCharging).toHaveBeenCalled()
    })
  })

  describe('isLowPowerMode', () => {
    it('should return low power mode state', async () => {
      const lowPower = await isLowPowerMode()
      expect(lowPower).toBe(false)
      expect(mockProvider.isLowPowerMode).toHaveBeenCalled()
    })
  })

  describe('onChange', () => {
    it('should register battery change callback', () => {
      const callback = vi.fn()
      const unsubscribe = onChange(callback)
      expect(mockProvider.onChange).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('onChargingChange', () => {
    it('should register charging change callback', () => {
      const callback = vi.fn()
      const unsubscribe = onChargingChange(callback)
      expect(mockProvider.onChargingChange).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('onLow', () => {
    it('should register low battery callback', () => {
      const callback = vi.fn()
      const unsubscribe = onLow(callback)
      expect(mockProvider.onLow).toHaveBeenCalledWith(callback, undefined)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should register low battery callback with custom threshold', () => {
      const callback = vi.fn()
      onLow(callback, 0.3)
      expect(mockProvider.onLow).toHaveBeenCalledWith(callback, 0.3)
    })
  })

  describe('onCritical', () => {
    it('should register critical battery callback', () => {
      const callback = vi.fn()
      const unsubscribe = onCritical(callback)
      expect(mockProvider.onCritical).toHaveBeenCalledWith(callback, undefined)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should register critical battery callback with custom threshold', () => {
      const callback = vi.fn()
      onCritical(callback, 0.1)
      expect(mockProvider.onCritical).toHaveBeenCalledWith(callback, 0.1)
    })
  })

  describe('getCapabilities', () => {
    it('should return battery capabilities', async () => {
      const capabilities = await getCapabilities()
      expect(capabilities.supported).toBe(true)
      expect(capabilities.hasChargingTime).toBe(true)
      expect(capabilities.hasDischargingTime).toBe(true)
      expect(capabilities.hasLowPowerMode).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })
})
