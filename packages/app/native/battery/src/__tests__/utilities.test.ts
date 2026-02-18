import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { BatteryProvider, BatteryStatus } from '../types.js'
import {
  createBatteryAwareExecutor,
  formatRemainingTime,
  getBatteryIcon,
  getChargingStateText,
  getLevelText,
  isAboveThreshold,
  toPercentage,
  waitForLevel,
} from '../utilities.js'

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

describe('Utility Functions', () => {
  describe('toPercentage', () => {
    it('should convert level to percentage', () => {
      expect(toPercentage(0)).toBe(0)
      expect(toPercentage(0.5)).toBe(50)
      expect(toPercentage(1)).toBe(100)
    })

    it('should round to nearest integer', () => {
      expect(toPercentage(0.333)).toBe(33)
      expect(toPercentage(0.666)).toBe(67)
      expect(toPercentage(0.999)).toBe(100)
    })
  })

  describe('getLevelText', () => {
    it('should return formatted percentage text', () => {
      expect(getLevelText(0)).toBe('0%')
      expect(getLevelText(0.5)).toBe('50%')
      expect(getLevelText(1)).toBe('100%')
    })
  })

  describe('getChargingStateText', () => {
    it('should return charging text', () => {
      expect(getChargingStateText('charging')).toBe('Charging')
    })

    it('should return discharging text', () => {
      expect(getChargingStateText('discharging')).toBe('On Battery')
    })

    it('should return full text', () => {
      expect(getChargingStateText('full')).toBe('Fully Charged')
    })

    it('should return not-charging text', () => {
      expect(getChargingStateText('not-charging')).toBe('Not Charging')
    })

    it('should return unknown text', () => {
      expect(getChargingStateText('unknown')).toBe('Unknown')
    })
  })

  describe('formatRemainingTime', () => {
    it('should format hours and minutes', () => {
      expect(formatRemainingTime(3600)).toBe('1h 0m')
      expect(formatRemainingTime(3660)).toBe('1h 1m')
      expect(formatRemainingTime(7200)).toBe('2h 0m')
      expect(formatRemainingTime(5400)).toBe('1h 30m')
    })

    it('should format minutes only', () => {
      expect(formatRemainingTime(60)).toBe('1m')
      expect(formatRemainingTime(300)).toBe('5m')
      expect(formatRemainingTime(1800)).toBe('30m')
    })

    it('should return Unknown for invalid values', () => {
      expect(formatRemainingTime(Infinity)).toBe('Unknown')
      expect(formatRemainingTime(-1)).toBe('Unknown')
      expect(formatRemainingTime(NaN)).toBe('Unknown')
    })

    it('should handle zero seconds', () => {
      expect(formatRemainingTime(0)).toBe('0m')
    })
  })

  describe('getBatteryIcon', () => {
    it('should return charging icon when charging', () => {
      const status: BatteryStatus = {
        level: 0.5,
        isCharging: true,
        chargingState: 'charging',
        isLow: false,
        isCritical: false,
      }
      expect(getBatteryIcon(status)).toBe('battery-charging')
    })

    it('should return full icon for 90%+', () => {
      const status: BatteryStatus = {
        level: 0.95,
        isCharging: false,
        chargingState: 'discharging',
        isLow: false,
        isCritical: false,
      }
      expect(getBatteryIcon(status)).toBe('battery-full')
    })

    it('should return three-quarters icon for 75-89%', () => {
      const status: BatteryStatus = {
        level: 0.8,
        isCharging: false,
        chargingState: 'discharging',
        isLow: false,
        isCritical: false,
      }
      expect(getBatteryIcon(status)).toBe('battery-three-quarters')
    })

    it('should return half icon for 50-74%', () => {
      const status: BatteryStatus = {
        level: 0.6,
        isCharging: false,
        chargingState: 'discharging',
        isLow: false,
        isCritical: false,
      }
      expect(getBatteryIcon(status)).toBe('battery-half')
    })

    it('should return quarter icon for 25-49%', () => {
      const status: BatteryStatus = {
        level: 0.3,
        isCharging: false,
        chargingState: 'discharging',
        isLow: false,
        isCritical: false,
      }
      expect(getBatteryIcon(status)).toBe('battery-quarter')
    })

    it('should return empty icon for <25%', () => {
      const status: BatteryStatus = {
        level: 0.1,
        isCharging: false,
        chargingState: 'discharging',
        isLow: true,
        isCritical: false,
      }
      expect(getBatteryIcon(status)).toBe('battery-empty')
    })
  })

  describe('isAboveThreshold', () => {
    it('should return true when level is above threshold', () => {
      expect(isAboveThreshold(0.5, 0.2)).toBe(true)
      expect(isAboveThreshold(0.8, 0.5)).toBe(true)
    })

    it('should return false when level is at or below threshold', () => {
      expect(isAboveThreshold(0.2, 0.2)).toBe(false)
      expect(isAboveThreshold(0.1, 0.2)).toBe(false)
    })
  })

  describe('waitForLevel', () => {
    let mockProvider: BatteryProvider

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should resolve immediately if level is already at target', async () => {
      mockProvider = createMockProvider({
        getLevel: vi.fn().mockResolvedValue(0.8),
      })
      setProvider(mockProvider)

      const promise = waitForLevel(0.5)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe(true)
    })

    it('should resolve when level reaches target', async () => {
      let callCount = 0
      mockProvider = createMockProvider({
        getLevel: vi.fn().mockImplementation(async () => {
          callCount++
          return callCount >= 3 ? 0.8 : 0.3
        }),
      })
      setProvider(mockProvider)

      const promise = waitForLevel(0.5, { checkInterval: 1000 })

      await vi.advanceTimersByTimeAsync(3000)
      const result = await promise

      expect(result).toBe(true)
    })

    it('should resolve false on timeout', async () => {
      mockProvider = createMockProvider({
        getLevel: vi.fn().mockResolvedValue(0.3),
      })
      setProvider(mockProvider)

      const promise = waitForLevel(0.8, { timeout: 3000, checkInterval: 1000 })

      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(result).toBe(false)
    })
  })

  describe('createBatteryAwareExecutor', () => {
    let mockProvider: BatteryProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should create an executor with default minimum level', () => {
      const executor = createBatteryAwareExecutor()
      expect(executor).toHaveProperty('execute')
      expect(executor).toHaveProperty('canExecute')
    })

    it('should execute task when battery is sufficient', async () => {
      mockProvider = createMockProvider({
        getLevel: vi.fn().mockResolvedValue(0.5),
      })
      setProvider(mockProvider)

      const executor = createBatteryAwareExecutor(0.2)
      const task = vi.fn().mockReturnValue('result')

      const result = await executor.execute(task)

      expect(task).toHaveBeenCalled()
      expect(result).toBe('result')
    })

    it('should not execute task when battery is low', async () => {
      mockProvider = createMockProvider({
        getLevel: vi.fn().mockResolvedValue(0.1),
      })
      setProvider(mockProvider)

      const executor = createBatteryAwareExecutor(0.2)
      const task = vi.fn().mockReturnValue('result')

      const result = await executor.execute(task)

      expect(task).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should execute fallback when battery is low', async () => {
      mockProvider = createMockProvider({
        getLevel: vi.fn().mockResolvedValue(0.1),
      })
      setProvider(mockProvider)

      const executor = createBatteryAwareExecutor(0.2)
      const task = vi.fn().mockReturnValue('task result')
      const fallback = vi.fn().mockReturnValue('fallback result')

      const result = await executor.execute(task, fallback)

      expect(task).not.toHaveBeenCalled()
      expect(fallback).toHaveBeenCalled()
      expect(result).toBe('fallback result')
    })

    it('should report canExecute correctly', async () => {
      mockProvider = createMockProvider({
        getLevel: vi.fn().mockResolvedValue(0.5),
      })
      setProvider(mockProvider)

      const executor = createBatteryAwareExecutor(0.2)
      expect(await executor.canExecute()).toBe(true)

      mockProvider = createMockProvider({
        getLevel: vi.fn().mockResolvedValue(0.1),
      })
      setProvider(mockProvider)

      expect(await executor.canExecute()).toBe(false)
    })
  })
})
