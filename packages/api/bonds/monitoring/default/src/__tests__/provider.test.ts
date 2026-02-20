vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) => {
    let text = options?.defaultValue ?? key
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        text = text.replace(`{{${k}}}`, String(v))
      }
    }
    return text
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckResult, HealthCheck, MonitoringProvider } from '@molecule/api-monitoring'

import { createProvider } from '../provider.js'

/** Helper to build a HealthCheck stub. */
const makeCheck = (name: string, category: string, result: CheckResult): HealthCheck => ({
  name,
  category,
  check: vi.fn<() => Promise<CheckResult>>().mockResolvedValue(result),
})

describe('@molecule/api-monitoring-default', () => {
  let provider: MonitoringProvider

  beforeEach(() => {
    provider = createProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should return a valid MonitoringProvider', () => {
      expect(typeof provider.register).toBe('function')
      expect(typeof provider.deregister).toBe('function')
      expect(typeof provider.runAll).toBe('function')
      expect(typeof provider.getLatest).toBe('function')
      expect(typeof provider.getRegisteredChecks).toBe('function')
    })
  })

  describe('register', () => {
    it('should add a check', () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))

      expect(provider.getRegisteredChecks()).toEqual(['db'])
    })

    it('should replace a check when registering a duplicate name', () => {
      const first = makeCheck('db', 'infrastructure', { status: 'operational' })
      const second = makeCheck('db', 'external', { status: 'degraded' })

      provider.register(first)
      provider.register(second)

      expect(provider.getRegisteredChecks()).toEqual(['db'])
    })
  })

  describe('deregister', () => {
    it('should return true when removing an existing check', () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))

      expect(provider.deregister('db')).toBe(true)
      expect(provider.getRegisteredChecks()).toEqual([])
    })

    it('should return false when removing a non-existent check', () => {
      expect(provider.deregister('unknown')).toBe(false)
    })
  })

  describe('getRegisteredChecks', () => {
    it('should return an empty array when no checks are registered', () => {
      expect(provider.getRegisteredChecks()).toEqual([])
    })

    it('should return all registered check names', () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))
      provider.register(makeCheck('redis', 'infrastructure', { status: 'operational' }))
      provider.register(makeCheck('stripe', 'external', { status: 'operational' }))

      expect(provider.getRegisteredChecks()).toEqual(['db', 'redis', 'stripe'])
    })
  })

  describe('getLatest', () => {
    it('should return null before runAll() is called', () => {
      expect(provider.getLatest()).toBeNull()
    })
  })

  describe('runAll', () => {
    it('should return overall status operational when all checks pass', async () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))
      provider.register(makeCheck('redis', 'infrastructure', { status: 'operational' }))

      const health = await provider.runAll()

      expect(health.status).toBe('operational')
    })

    it('should return overall status degraded when one check is degraded', async () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))
      provider.register(makeCheck('redis', 'infrastructure', { status: 'degraded' }))

      const health = await provider.runAll()

      expect(health.status).toBe('degraded')
    })

    it('should return overall status down when one check is down', async () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))
      provider.register(makeCheck('stripe', 'external', { status: 'down' }))

      const health = await provider.runAll()

      expect(health.status).toBe('down')
    })

    it('should return the worst status when checks have mixed statuses', async () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))
      provider.register(makeCheck('redis', 'infrastructure', { status: 'degraded' }))
      provider.register(makeCheck('stripe', 'external', { status: 'down' }))

      const health = await provider.runAll()

      expect(health.status).toBe('down')
    })

    it('should return operational when no checks are registered', async () => {
      const health = await provider.runAll()

      expect(health.status).toBe('operational')
      expect(health.checks).toEqual({})
    })

    it('should store results accessible via getLatest()', async () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))

      const health = await provider.runAll()

      expect(provider.getLatest()).toBe(health)
    })

    it('should update getLatest() on subsequent runAll() calls', async () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))

      const first = await provider.runAll()
      const second = await provider.runAll()

      expect(provider.getLatest()).toBe(second)
      expect(provider.getLatest()).not.toBe(first)
    })

    it('should include name, category, checkedAt, and status in each check entry', async () => {
      provider.register(
        makeCheck('db', 'infrastructure', { status: 'operational', latencyMs: 5, message: 'OK' }),
      )

      const health = await provider.runAll()
      const entry = health.checks['db']

      expect(entry).toBeDefined()
      expect(entry.name).toBe('db')
      expect(entry.category).toBe('infrastructure')
      expect(entry.status).toBe('operational')
      expect(entry.latencyMs).toBe(5)
      expect(entry.message).toBe('OK')
      expect(typeof entry.checkedAt).toBe('string')
      expect(() => new Date(entry.checkedAt)).not.toThrow()
    })

    it('should include a valid ISO 8601 timestamp', async () => {
      const health = await provider.runAll()

      expect(typeof health.timestamp).toBe('string')
      expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp)
    })

    it('should key check entries by name', async () => {
      provider.register(makeCheck('db', 'infrastructure', { status: 'operational' }))
      provider.register(makeCheck('stripe', 'external', { status: 'degraded' }))

      const health = await provider.runAll()

      expect(Object.keys(health.checks)).toEqual(expect.arrayContaining(['db', 'stripe']))
      expect(health.checks['db'].name).toBe('db')
      expect(health.checks['stripe'].name).toBe('stripe')
    })
  })

  describe('per-check timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should mark a slow check as down with a timeout message', async () => {
      const slowCheck: HealthCheck = {
        name: 'slow-service',
        category: 'external',
        check: () =>
          new Promise(() => {
            // Never resolves
          }),
      }

      const p = createProvider({ checkTimeoutMs: 500 })
      p.register(slowCheck)

      const promise = p.runAll()

      await vi.advanceTimersByTimeAsync(500)

      const health = await promise

      expect(health.status).toBe('down')
      expect(health.checks['slow-service'].status).toBe('down')
      expect(health.checks['slow-service'].message).toBe('Check timed out after 500ms.')
    })

    it('should not time out a check that resolves before the deadline', async () => {
      const fastCheck: HealthCheck = {
        name: 'fast-service',
        category: 'infrastructure',
        check: () => Promise.resolve({ status: 'operational' as const, message: 'Quick' }),
      }

      const p = createProvider({ checkTimeoutMs: 5000 })
      p.register(fastCheck)

      const promise = p.runAll()

      // The fast check resolves immediately; advance timers to flush microtasks
      await vi.advanceTimersByTimeAsync(0)

      const health = await promise

      expect(health.status).toBe('operational')
      expect(health.checks['fast-service'].message).toBe('Quick')
    })

    it('should use the default timeout of 10000ms when no option is provided', async () => {
      const slowCheck: HealthCheck = {
        name: 'slow',
        category: 'external',
        check: () => new Promise(() => {}),
      }

      const p = createProvider()
      p.register(slowCheck)

      const promise = p.runAll()

      // At 9999ms, the check should still be pending
      await vi.advanceTimersByTimeAsync(9999)
      // At 10000ms, the timeout fires
      await vi.advanceTimersByTimeAsync(1)

      const health = await promise

      expect(health.status).toBe('down')
      expect(health.checks['slow'].message).toBe('Check timed out after 10000ms.')
    })
  })
})
