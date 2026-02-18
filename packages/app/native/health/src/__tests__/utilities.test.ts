/**
 * `@molecule/app-health`
 * Utility functions tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { HealthProvider, SleepSample } from '../types.js'
import {
  calculateSleepEfficiency,
  DataTypeGroups,
  formatDuration,
  getActiveEnergyToday,
  getLastDaysRange,
  getLastNightSleep,
  getStepsToday,
  getTodayRange,
  getUnitForType,
} from '../utilities.js'

// Create a mock provider
function createMockProvider(): HealthProvider {
  return {
    requestAuthorization: vi.fn().mockResolvedValue(true),
    getAuthorizationStatus: vi.fn().mockResolvedValue('authorized'),
    querySamples: vi.fn().mockResolvedValue([]),
    queryStatistics: vi.fn().mockResolvedValue({
      sum: 8500,
      average: 1000,
      count: 5,
    }),
    writeSample: vi.fn().mockResolvedValue(undefined),
    queryWorkouts: vi.fn().mockResolvedValue([]),
    writeWorkout: vi.fn().mockResolvedValue(undefined),
    querySleep: vi.fn().mockResolvedValue([
      {
        startDate: '2024-01-01T22:00:00Z',
        endDate: '2024-01-02T06:00:00Z',
        timeInBed: 28800,
        timeAsleep: 25200,
        efficiency: 0.875,
      },
    ]),
    deleteSamples: vi.fn().mockResolvedValue(undefined),
    openHealthApp: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      platform: 'ios',
      readableTypes: ['steps', 'heartRate'],
      writableTypes: ['steps'],
      supportsBackgroundDelivery: true,
    }),
  }
}

describe('Utility Functions', () => {
  describe('getUnitForType', () => {
    describe('activity types', () => {
      it('should return "count" for steps', () => {
        expect(getUnitForType('steps')).toBe('count')
      })

      it('should return "m" for distance', () => {
        expect(getUnitForType('distance')).toBe('m')
      })

      it('should return "kcal" for activeEnergy', () => {
        expect(getUnitForType('activeEnergy')).toBe('kcal')
      })

      it('should return "kcal" for basalEnergy', () => {
        expect(getUnitForType('basalEnergy')).toBe('kcal')
      })

      it('should return "count" for flights', () => {
        expect(getUnitForType('flights')).toBe('count')
      })

      it('should return "min" for exerciseTime', () => {
        expect(getUnitForType('exerciseTime')).toBe('min')
      })

      it('should return "min" for standTime', () => {
        expect(getUnitForType('standTime')).toBe('min')
      })

      it('should return "min" for moveMinutes', () => {
        expect(getUnitForType('moveMinutes')).toBe('min')
      })
    })

    describe('body measurement types', () => {
      it('should return "kg" for weight', () => {
        expect(getUnitForType('weight')).toBe('kg')
      })

      it('should return "cm" for height', () => {
        expect(getUnitForType('height')).toBe('cm')
      })

      it('should return "kg" for bodyMass', () => {
        expect(getUnitForType('bodyMass')).toBe('kg')
      })

      it('should return "%" for bodyFat', () => {
        expect(getUnitForType('bodyFat')).toBe('%')
      })

      it('should return "kg/m^2" for bmi', () => {
        expect(getUnitForType('bmi')).toBe('kg/m\u00B2')
      })

      it('should return "kg" for leanBodyMass', () => {
        expect(getUnitForType('leanBodyMass')).toBe('kg')
      })

      it('should return "cm" for waistCircumference', () => {
        expect(getUnitForType('waistCircumference')).toBe('cm')
      })
    })

    describe('vital types', () => {
      it('should return "bpm" for heartRate', () => {
        expect(getUnitForType('heartRate')).toBe('bpm')
      })

      it('should return "bpm" for restingHeartRate', () => {
        expect(getUnitForType('restingHeartRate')).toBe('bpm')
      })

      it('should return "ms" for heartRateVariability', () => {
        expect(getUnitForType('heartRateVariability')).toBe('ms')
      })

      it('should return "mmHg" for bloodPressureSystolic', () => {
        expect(getUnitForType('bloodPressureSystolic')).toBe('mmHg')
      })

      it('should return "mmHg" for bloodPressureDiastolic', () => {
        expect(getUnitForType('bloodPressureDiastolic')).toBe('mmHg')
      })

      it('should return "breaths/min" for respiratoryRate', () => {
        expect(getUnitForType('respiratoryRate')).toBe('breaths/min')
      })

      it('should return "%" for oxygenSaturation', () => {
        expect(getUnitForType('oxygenSaturation')).toBe('%')
      })

      it('should return "C" for bodyTemperature', () => {
        expect(getUnitForType('bodyTemperature')).toBe('\u00B0C')
      })

      it('should return "mg/dL" for bloodGlucose', () => {
        expect(getUnitForType('bloodGlucose')).toBe('mg/dL')
      })
    })

    describe('sleep types', () => {
      it('should return "min" for sleepAnalysis', () => {
        expect(getUnitForType('sleepAnalysis')).toBe('min')
      })

      it('should return "min" for sleepInBed', () => {
        expect(getUnitForType('sleepInBed')).toBe('min')
      })

      it('should return "min" for sleepAsleep', () => {
        expect(getUnitForType('sleepAsleep')).toBe('min')
      })

      it('should return "min" for sleepAwake', () => {
        expect(getUnitForType('sleepAwake')).toBe('min')
      })

      it('should return "min" for sleepRem', () => {
        expect(getUnitForType('sleepRem')).toBe('min')
      })

      it('should return "min" for sleepDeep', () => {
        expect(getUnitForType('sleepDeep')).toBe('min')
      })

      it('should return "min" for sleepCore', () => {
        expect(getUnitForType('sleepCore')).toBe('min')
      })
    })

    describe('nutrition types', () => {
      it('should return "mL" for water', () => {
        expect(getUnitForType('water')).toBe('mL')
      })

      it('should return "mg" for caffeine', () => {
        expect(getUnitForType('caffeine')).toBe('mg')
      })

      it('should return "kcal" for calories', () => {
        expect(getUnitForType('calories')).toBe('kcal')
      })

      it('should return "g" for protein', () => {
        expect(getUnitForType('protein')).toBe('g')
      })

      it('should return "g" for carbohydrates', () => {
        expect(getUnitForType('carbohydrates')).toBe('g')
      })

      it('should return "g" for fat', () => {
        expect(getUnitForType('fat')).toBe('g')
      })

      it('should return "g" for fiber', () => {
        expect(getUnitForType('fiber')).toBe('g')
      })

      it('should return "g" for sugar', () => {
        expect(getUnitForType('sugar')).toBe('g')
      })

      it('should return "mg" for sodium', () => {
        expect(getUnitForType('sodium')).toBe('mg')
      })
    })

    describe('other types', () => {
      it('should return "min" for workout', () => {
        expect(getUnitForType('workout')).toBe('min')
      })

      it('should return "min" for mindfulMinutes', () => {
        expect(getUnitForType('mindfulMinutes')).toBe('min')
      })
    })
  })

  describe('formatDuration', () => {
    it('should format minutes only when less than an hour', () => {
      expect(formatDuration(300)).toBe('5m')
      expect(formatDuration(1800)).toBe('30m')
      expect(formatDuration(3599)).toBe('59m')
    })

    it('should format hours and minutes when an hour or more', () => {
      expect(formatDuration(3600)).toBe('1h 0m')
      expect(formatDuration(3660)).toBe('1h 1m')
      expect(formatDuration(7200)).toBe('2h 0m')
      expect(formatDuration(9000)).toBe('2h 30m')
    })

    it('should handle 0 seconds', () => {
      expect(formatDuration(0)).toBe('0m')
    })

    it('should handle large values', () => {
      expect(formatDuration(86400)).toBe('24h 0m')
    })
  })

  describe('calculateSleepEfficiency', () => {
    it('should calculate sleep efficiency correctly', () => {
      const sleep: SleepSample = {
        startDate: '2024-01-01T22:00:00Z',
        endDate: '2024-01-02T06:00:00Z',
        timeInBed: 28800, // 8 hours
        timeAsleep: 25200, // 7 hours
      }

      expect(calculateSleepEfficiency(sleep)).toBe(0.875)
    })

    it('should return 0 when timeInBed is 0', () => {
      const sleep: SleepSample = {
        startDate: '2024-01-01T22:00:00Z',
        endDate: '2024-01-02T06:00:00Z',
        timeInBed: 0,
        timeAsleep: 0,
      }

      expect(calculateSleepEfficiency(sleep)).toBe(0)
    })

    it('should return 1 when all time in bed is asleep', () => {
      const sleep: SleepSample = {
        startDate: '2024-01-01T22:00:00Z',
        endDate: '2024-01-02T06:00:00Z',
        timeInBed: 28800,
        timeAsleep: 28800,
      }

      expect(calculateSleepEfficiency(sleep)).toBe(1)
    })
  })

  describe('getTodayRange', () => {
    it('should return a valid date range for today', () => {
      const range = getTodayRange()

      expect(range.startDate).toBeDefined()
      expect(range.endDate).toBeDefined()

      const start = new Date(range.startDate)
      const end = new Date(range.endDate)

      // End should be after start
      expect(end.getTime()).toBeGreaterThan(start.getTime())

      // Start should be at midnight
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
    })
  })

  describe('getLastDaysRange', () => {
    it('should return a valid date range for last 7 days', () => {
      const range = getLastDaysRange(7)

      const start = new Date(range.startDate)
      const end = new Date(range.endDate)

      // End should be after start
      expect(end.getTime()).toBeGreaterThan(start.getTime())

      // Start should be approximately 7 days before end
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThanOrEqual(6)
      expect(diffDays).toBeLessThanOrEqual(8)
    })

    it('should return a valid date range for last 30 days', () => {
      const range = getLastDaysRange(30)

      const start = new Date(range.startDate)
      const end = new Date(range.endDate)

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThanOrEqual(29)
      expect(diffDays).toBeLessThanOrEqual(31)
    })
  })

  describe('getStepsToday', () => {
    let mockProvider: HealthProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should return steps for today', async () => {
      const steps = await getStepsToday()

      expect(steps).toBe(8500)
      expect(mockProvider.queryStatistics).toHaveBeenCalledWith(
        'steps',
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      )
    })

    it('should return 0 when no steps recorded', async () => {
      vi.mocked(mockProvider.queryStatistics).mockResolvedValue({ count: 0 })

      const steps = await getStepsToday()

      expect(steps).toBe(0)
    })
  })

  describe('getActiveEnergyToday', () => {
    let mockProvider: HealthProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should return active energy for today', async () => {
      vi.mocked(mockProvider.queryStatistics).mockResolvedValue({
        sum: 450,
        count: 10,
      })

      const energy = await getActiveEnergyToday()

      expect(energy).toBe(450)
      expect(mockProvider.queryStatistics).toHaveBeenCalledWith(
        'activeEnergy',
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      )
    })
  })

  describe('getLastNightSleep', () => {
    let mockProvider: HealthProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should return last night sleep data', async () => {
      const sleep = await getLastNightSleep()

      expect(sleep).not.toBeNull()
      expect(sleep?.timeInBed).toBe(28800)
      expect(sleep?.timeAsleep).toBe(25200)
      expect(mockProvider.querySleep).toHaveBeenCalled()
    })

    it('should return null when no sleep data', async () => {
      vi.mocked(mockProvider.querySleep).mockResolvedValue([])

      const sleep = await getLastNightSleep()

      expect(sleep).toBeNull()
    })
  })

  describe('DataTypeGroups', () => {
    it('should have activity data types', () => {
      expect(DataTypeGroups.activity).toContain('steps')
      expect(DataTypeGroups.activity).toContain('distance')
      expect(DataTypeGroups.activity).toContain('activeEnergy')
      expect(DataTypeGroups.activity).toContain('basalEnergy')
      expect(DataTypeGroups.activity).toContain('flights')
      expect(DataTypeGroups.activity).toContain('exerciseTime')
    })

    it('should have body data types', () => {
      expect(DataTypeGroups.body).toContain('weight')
      expect(DataTypeGroups.body).toContain('height')
      expect(DataTypeGroups.body).toContain('bodyFat')
      expect(DataTypeGroups.body).toContain('bmi')
      expect(DataTypeGroups.body).toContain('leanBodyMass')
    })

    it('should have vitals data types', () => {
      expect(DataTypeGroups.vitals).toContain('heartRate')
      expect(DataTypeGroups.vitals).toContain('restingHeartRate')
      expect(DataTypeGroups.vitals).toContain('bloodPressureSystolic')
      expect(DataTypeGroups.vitals).toContain('bloodPressureDiastolic')
      expect(DataTypeGroups.vitals).toContain('oxygenSaturation')
      expect(DataTypeGroups.vitals).toContain('bodyTemperature')
    })

    it('should have sleep data types', () => {
      expect(DataTypeGroups.sleep).toContain('sleepAnalysis')
      expect(DataTypeGroups.sleep).toContain('sleepInBed')
      expect(DataTypeGroups.sleep).toContain('sleepAsleep')
      expect(DataTypeGroups.sleep).toContain('sleepAwake')
      expect(DataTypeGroups.sleep).toContain('sleepRem')
      expect(DataTypeGroups.sleep).toContain('sleepDeep')
    })

    it('should have nutrition data types', () => {
      expect(DataTypeGroups.nutrition).toContain('water')
      expect(DataTypeGroups.nutrition).toContain('caffeine')
      expect(DataTypeGroups.nutrition).toContain('calories')
      expect(DataTypeGroups.nutrition).toContain('protein')
      expect(DataTypeGroups.nutrition).toContain('carbohydrates')
      expect(DataTypeGroups.nutrition).toContain('fat')
    })
  })
})
