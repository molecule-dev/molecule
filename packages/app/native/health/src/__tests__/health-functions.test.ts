/**
 * `@molecule/app-health`
 * Health convenience functions tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import {
  deleteSamples,
  getAuthorizationStatus,
  getCapabilities,
  openHealthApp,
  querySamples,
  querySleep,
  queryStatistics,
  queryWorkouts,
  requestAuthorization,
  writeSample,
  writeWorkout,
} from '../provider.js'
import type {
  HealthAuthStatus,
  HealthCapabilities,
  HealthDataType,
  HealthProvider,
  HealthQueryOptions,
  HealthSample,
  SleepSample,
  WorkoutSample,
} from '../types.js'

// Create a mock provider
function createMockProvider(): HealthProvider {
  return {
    requestAuthorization: vi.fn().mockResolvedValue(true),
    getAuthorizationStatus: vi.fn().mockResolvedValue('authorized' as HealthAuthStatus),
    querySamples: vi.fn().mockResolvedValue([
      {
        type: 'steps',
        value: 1000,
        unit: 'count',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
        sourceName: 'Health App',
      },
    ] as HealthSample[]),
    queryStatistics: vi.fn().mockResolvedValue({
      sum: 5000,
      average: 1000,
      min: 500,
      max: 2000,
      count: 5,
    }),
    writeSample: vi.fn().mockResolvedValue(undefined),
    queryWorkouts: vi.fn().mockResolvedValue([
      {
        workoutType: 'running',
        startDate: '2024-01-01T08:00:00Z',
        endDate: '2024-01-01T09:00:00Z',
        duration: 3600,
        activeEnergy: 500,
        distance: 5000,
      },
    ] as WorkoutSample[]),
    writeWorkout: vi.fn().mockResolvedValue(undefined),
    querySleep: vi.fn().mockResolvedValue([
      {
        startDate: '2024-01-01T22:00:00Z',
        endDate: '2024-01-02T06:00:00Z',
        timeInBed: 28800,
        timeAsleep: 25200,
        efficiency: 0.875,
      },
    ] as SleepSample[]),
    deleteSamples: vi.fn().mockResolvedValue(undefined),
    openHealthApp: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      platform: 'ios',
      readableTypes: ['steps', 'heartRate', 'activeEnergy'],
      writableTypes: ['steps', 'activeEnergy'],
      supportsBackgroundDelivery: true,
    } as HealthCapabilities),
  }
}

describe('Health Functions', () => {
  let mockProvider: HealthProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('requestAuthorization', () => {
    it('should request authorization for read types', async () => {
      const readTypes: HealthDataType[] = ['steps', 'heartRate']
      const result = await requestAuthorization(readTypes)

      expect(result).toBe(true)
      expect(mockProvider.requestAuthorization).toHaveBeenCalledWith(readTypes, undefined)
    })

    it('should request authorization for read and write types', async () => {
      const readTypes: HealthDataType[] = ['steps', 'heartRate']
      const writeTypes: HealthDataType[] = ['steps']
      const result = await requestAuthorization(readTypes, writeTypes)

      expect(result).toBe(true)
      expect(mockProvider.requestAuthorization).toHaveBeenCalledWith(readTypes, writeTypes)
    })
  })

  describe('getAuthorizationStatus', () => {
    it('should return authorization status for read access', async () => {
      const status = await getAuthorizationStatus('steps', 'read')

      expect(status).toBe('authorized')
      expect(mockProvider.getAuthorizationStatus).toHaveBeenCalledWith('steps', 'read')
    })

    it('should return authorization status for write access', async () => {
      await getAuthorizationStatus('steps', 'write')

      expect(mockProvider.getAuthorizationStatus).toHaveBeenCalledWith('steps', 'write')
    })
  })

  describe('querySamples', () => {
    it('should query samples for a data type', async () => {
      const options: HealthQueryOptions = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
      }

      const samples = await querySamples('steps', options)

      expect(samples).toHaveLength(1)
      expect(samples[0].type).toBe('steps')
      expect(samples[0].value).toBe(1000)
      expect(mockProvider.querySamples).toHaveBeenCalledWith('steps', options)
    })

    it('should support query options', async () => {
      const options: HealthQueryOptions = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
        limit: 10,
        ascending: true,
        aggregateBy: 'day',
      }

      await querySamples('heartRate', options)

      expect(mockProvider.querySamples).toHaveBeenCalledWith('heartRate', options)
    })
  })

  describe('queryStatistics', () => {
    it('should query statistics for a data type', async () => {
      const options: HealthQueryOptions = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
      }

      const stats = await queryStatistics('steps', options)

      expect(stats.sum).toBe(5000)
      expect(stats.average).toBe(1000)
      expect(stats.min).toBe(500)
      expect(stats.max).toBe(2000)
      expect(stats.count).toBe(5)
      expect(mockProvider.queryStatistics).toHaveBeenCalledWith('steps', options)
    })
  })

  describe('writeSample', () => {
    it('should write a health sample', async () => {
      const sample = {
        type: 'steps' as HealthDataType,
        value: 500,
        unit: 'count',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T11:00:00Z',
      }

      await writeSample(sample)

      expect(mockProvider.writeSample).toHaveBeenCalledWith(sample)
    })
  })

  describe('queryWorkouts', () => {
    it('should query workouts', async () => {
      const options: HealthQueryOptions = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
      }

      const workouts = await queryWorkouts(options)

      expect(workouts).toHaveLength(1)
      expect(workouts[0].workoutType).toBe('running')
      expect(workouts[0].duration).toBe(3600)
      expect(workouts[0].distance).toBe(5000)
      expect(mockProvider.queryWorkouts).toHaveBeenCalledWith(options)
    })
  })

  describe('writeWorkout', () => {
    it('should write a workout', async () => {
      const workout = {
        workoutType: 'cycling' as const,
        startDate: '2024-01-01T14:00:00Z',
        endDate: '2024-01-01T15:30:00Z',
        duration: 5400,
        activeEnergy: 600,
        distance: 25000,
      }

      await writeWorkout(workout)

      expect(mockProvider.writeWorkout).toHaveBeenCalledWith(workout)
    })
  })

  describe('querySleep', () => {
    it('should query sleep data', async () => {
      const options: HealthQueryOptions = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T23:59:59Z',
      }

      const sleepData = await querySleep(options)

      expect(sleepData).toHaveLength(1)
      expect(sleepData[0].timeInBed).toBe(28800)
      expect(sleepData[0].timeAsleep).toBe(25200)
      expect(sleepData[0].efficiency).toBe(0.875)
      expect(mockProvider.querySleep).toHaveBeenCalledWith(options)
    })
  })

  describe('deleteSamples', () => {
    it('should delete samples for a data type', async () => {
      const options: HealthQueryOptions = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
      }

      await deleteSamples('steps', options)

      expect(mockProvider.deleteSamples).toHaveBeenCalledWith('steps', options)
    })
  })

  describe('openHealthApp', () => {
    it('should open the health app', async () => {
      await openHealthApp()

      expect(mockProvider.openHealthApp).toHaveBeenCalled()
    })
  })

  describe('getCapabilities', () => {
    it('should return health capabilities', async () => {
      const capabilities = await getCapabilities()

      expect(capabilities.supported).toBe(true)
      expect(capabilities.platform).toBe('ios')
      expect(capabilities.readableTypes).toContain('steps')
      expect(capabilities.writableTypes).toContain('steps')
      expect(capabilities.supportsBackgroundDelivery).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })
})
