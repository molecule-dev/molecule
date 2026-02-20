vi.mock('@molecule/api-bond', () => {
  let store: Record<string, unknown> = {}
  return {
    bond: vi.fn((type: string, provider: unknown) => {
      store[type] = provider
    }),
    get: vi.fn((type: string) => store[type]),
    isBonded: vi.fn((type: string) => type in store),
    require: vi.fn((type: string) => {
      if (!(type in store)) throw new Error(`No provider bonded for '${type}'`)
      return store[type]
    }),
    __reset: () => {
      store = {}
    },
  }
})

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, options?: { defaultValue?: string }) => {
    return options?.defaultValue ?? _key
  }),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type { ScheduledTask, SchedulerProvider, TaskStatus } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getOptionalProvider: typeof ProviderModule.getOptionalProvider
let schedule: typeof ProviderModule.schedule
let unschedule: typeof ProviderModule.unschedule
let getAllStatuses: typeof ProviderModule.getAllStatuses

/**
 * Creates a mock SchedulerProvider for testing.
 */
const createMockProvider = (overrides: Partial<SchedulerProvider> = {}): SchedulerProvider => ({
  schedule: vi.fn(),
  unschedule: vi.fn().mockReturnValue(true),
  getStatus: vi.fn().mockReturnValue(null),
  getAllStatuses: vi.fn().mockReturnValue([]),
  start: vi.fn(),
  stop: vi.fn(),
  ...overrides,
})

/**
 * Creates a mock ScheduledTask for testing.
 */
const createMockTask = (name: string, overrides: Partial<ScheduledTask> = {}): ScheduledTask => ({
  name,
  intervalMs: 60000,
  handler: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('scheduler provider', () => {
  beforeEach(async () => {
    vi.resetModules()

    // Reset the in-memory bond store
    const bondModule = (await import('@molecule/api-bond')) as typeof BondModule & {
      __reset: () => void
    }
    bondModule.__reset()

    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    getOptionalProvider = providerModule.getOptionalProvider
    schedule = providerModule.schedule
    unschedule = providerModule.unschedule
    getAllStatuses = providerModule.getAllStatuses
  })

  describe('setProvider', () => {
    it('should bond the scheduler provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should allow replacing the provider', () => {
      const first = createMockProvider()
      const second = createMockProvider()

      setProvider(first)
      expect(getProvider()).toBe(first)

      setProvider(second)
      expect(getProvider()).toBe(second)
    })
  })

  describe('getProvider', () => {
    it('should throw with i18n message when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(
        'Scheduler provider not configured. Call setProvider() first.',
      )
    })

    it('should return the bonded provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('hasProvider', () => {
    it('should return false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should return true when a provider is bonded', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(hasProvider()).toBe(true)
    })
  })

  describe('getOptionalProvider', () => {
    it('should return null when no provider is bonded', () => {
      expect(getOptionalProvider()).toBeNull()
    })

    it('should return the bonded provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(getOptionalProvider()).toBe(mockProvider)
    })
  })

  describe('schedule', () => {
    it('should throw when no provider is bonded', () => {
      const task = createMockTask('cleanup')
      expect(() => schedule(task)).toThrow(
        'Scheduler provider not configured. Call setProvider() first.',
      )
    })

    it('should delegate to the bonded provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const task = createMockTask('cleanup')
      schedule(task)

      expect(mockProvider.schedule).toHaveBeenCalledWith(task)
    })

    it('should pass task with all properties', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const task = createMockTask('report', {
        intervalMs: 300000,
        enabled: false,
      })
      schedule(task)

      expect(mockProvider.schedule).toHaveBeenCalledWith(task)
    })
  })

  describe('unschedule', () => {
    it('should throw when no provider is bonded', () => {
      expect(() => unschedule('cleanup')).toThrow(
        'Scheduler provider not configured. Call setProvider() first.',
      )
    })

    it('should delegate to the bonded provider and return true', () => {
      const mockProvider = createMockProvider({
        unschedule: vi.fn().mockReturnValue(true),
      })
      setProvider(mockProvider)

      const result = unschedule('cleanup')

      expect(mockProvider.unschedule).toHaveBeenCalledWith('cleanup')
      expect(result).toBe(true)
    })

    it('should return false when task is not found', () => {
      const mockProvider = createMockProvider({
        unschedule: vi.fn().mockReturnValue(false),
      })
      setProvider(mockProvider)

      const result = unschedule('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('getAllStatuses', () => {
    it('should throw when no provider is bonded', () => {
      expect(() => getAllStatuses()).toThrow(
        'Scheduler provider not configured. Call setProvider() first.',
      )
    })

    it('should delegate to the bonded provider', () => {
      const statuses: TaskStatus[] = [
        {
          name: 'task-a',
          lastRunAt: '2026-01-01T00:00:00.000Z',
          nextRunAt: '2026-01-01T00:01:00.000Z',
          isRunning: false,
          lastError: null,
          durationMs: 42,
          totalRuns: 5,
          totalFailures: 0,
          lastSuccessAt: '2026-01-01T00:00:00.000Z',
          enabled: true,
        },
        {
          name: 'task-b',
          lastRunAt: null,
          nextRunAt: '2026-01-01T00:02:00.000Z',
          isRunning: true,
          lastError: 'timeout',
          durationMs: null,
          totalRuns: 3,
          totalFailures: 1,
          lastSuccessAt: null,
          enabled: true,
        },
      ]
      const mockProvider = createMockProvider({
        getAllStatuses: vi.fn().mockReturnValue(statuses),
      })
      setProvider(mockProvider)

      const result = getAllStatuses()

      expect(mockProvider.getAllStatuses).toHaveBeenCalled()
      expect(result).toEqual(statuses)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no tasks are scheduled', () => {
      const mockProvider = createMockProvider({
        getAllStatuses: vi.fn().mockReturnValue([]),
      })
      setProvider(mockProvider)

      const result = getAllStatuses()

      expect(result).toEqual([])
    })
  })
})
