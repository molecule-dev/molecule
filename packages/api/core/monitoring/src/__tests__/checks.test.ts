import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckResult } from '../types.js'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- indexed access requires type alias, not namespace import
type ChecksModule = typeof import('../checks.js')

const mockBond = vi.fn()
const mockGet = vi.fn()
const mockIsBonded = vi.fn()
const mockRequire = vi.fn()

vi.mock('@molecule/api-bond', () => ({
  bond: mockBond,
  get: mockGet,
  isBonded: mockIsBonded,
  require: mockRequire,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    let result = opts?.defaultValue ?? _key
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
      }
    }
    return result
  },
}))

let createDatabaseCheck: ChecksModule['createDatabaseCheck']
let createCacheCheck: ChecksModule['createCacheCheck']
let createHttpCheck: ChecksModule['createHttpCheck']
let createBondCheck: ChecksModule['createBondCheck']
let createCustomCheck: ChecksModule['createCustomCheck']

describe('health check factories', () => {
  beforeEach(async () => {
    vi.resetModules()

    // Re-register mocks after resetModules
    vi.doMock('@molecule/api-bond', () => ({
      bond: mockBond,
      get: mockGet,
      isBonded: mockIsBonded,
      require: mockRequire,
    }))

    vi.doMock('@molecule/api-i18n', () => ({
      t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
        let result = opts?.defaultValue ?? _key
        if (values) {
          for (const [k, v] of Object.entries(values)) {
            result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
          }
        }
        return result
      },
    }))

    const mod = await import('../checks.js')
    createDatabaseCheck = mod.createDatabaseCheck
    createCacheCheck = mod.createCacheCheck
    createHttpCheck = mod.createHttpCheck
    createBondCheck = mod.createBondCheck
    createCustomCheck = mod.createCustomCheck

    mockBond.mockReset()
    mockGet.mockReset()
    mockIsBonded.mockReset()
    mockRequire.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('createDatabaseCheck', () => {
    it('should return a health check with default name and category', () => {
      const check = createDatabaseCheck()
      expect(check.name).toBe('database')
      expect(check.category).toBe('infrastructure')
      expect(typeof check.check).toBe('function')
    })

    it('should accept custom name and category', () => {
      const check = createDatabaseCheck('primary-db', 'core')
      expect(check.name).toBe('primary-db')
      expect(check.category).toBe('core')
    })

    it("should return 'down' when database is not bonded", async () => {
      mockIsBonded.mockReturnValue(false)

      const check = createDatabaseCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Database bond not configured.')
    })

    it("should return 'down' when database pool is unavailable", async () => {
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(undefined)

      const check = createDatabaseCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Database pool unavailable.')
    })

    it("should return 'operational' on successful query", async () => {
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue({
        query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      })

      const check = createDatabaseCheck()
      const result = await check.check()

      expect(result.status).toBe('operational')
      expect(result.latencyMs).toBeTypeOf('number')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it("should return 'down' with error message on query failure", async () => {
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue({
        query: vi.fn().mockRejectedValue(new Error('Connection refused')),
      })

      const check = createDatabaseCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Connection refused')
      expect(result.latencyMs).toBeTypeOf('number')
    })

    it('should stringify non-Error throws', async () => {
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue({
        query: vi.fn().mockRejectedValue('string error'),
      })

      const check = createDatabaseCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('string error')
    })
  })

  describe('createCacheCheck', () => {
    it('should return a health check with default name and category', () => {
      const check = createCacheCheck()
      expect(check.name).toBe('cache')
      expect(check.category).toBe('infrastructure')
    })

    it('should accept custom name and category', () => {
      const check = createCacheCheck('redis', 'core')
      expect(check.name).toBe('redis')
      expect(check.category).toBe('core')
    })

    it("should return 'down' when cache is not bonded", async () => {
      mockIsBonded.mockReturnValue(false)

      const check = createCacheCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Cache bond not configured.')
    })

    it("should return 'down' when cache provider is unavailable", async () => {
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(undefined)

      const check = createCacheCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Cache provider unavailable.')
    })

    it("should return 'operational' on successful set/get/delete cycle", async () => {
      const mockCache = {
        set: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(true),
      }
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(mockCache)

      const check = createCacheCheck()
      const result = await check.check()

      expect(result.status).toBe('operational')
      expect(result.latencyMs).toBeTypeOf('number')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
      expect(mockCache.set).toHaveBeenCalledWith('__molecule_health_check__', 1, { ttl: 5 })
      expect(mockCache.get).toHaveBeenCalledWith('__molecule_health_check__')
      expect(mockCache.delete).toHaveBeenCalledWith('__molecule_health_check__')
    })

    it("should return 'down' on cache operation failure", async () => {
      const mockCache = {
        set: vi.fn().mockRejectedValue(new Error('Redis connection lost')),
        get: vi.fn(),
        delete: vi.fn(),
      }
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(mockCache)

      const check = createCacheCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Redis connection lost')
      expect(result.latencyMs).toBeTypeOf('number')
    })

    it('should stringify non-Error throws in cache check', async () => {
      const mockCache = {
        set: vi.fn().mockRejectedValue('cache unavailable'),
        get: vi.fn(),
        delete: vi.fn(),
      }
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(mockCache)

      const check = createCacheCheck()
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('cache unavailable')
    })
  })

  describe('createHttpCheck', () => {
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should use the URL hostname as default name', () => {
      const check = createHttpCheck('https://api.stripe.com/v1/health')
      expect(check.name).toBe('api.stripe.com')
      expect(check.category).toBe('external')
    })

    it('should accept custom name and category via options', () => {
      const check = createHttpCheck('https://api.stripe.com', {
        name: 'stripe',
        category: 'payments',
      })
      expect(check.name).toBe('stripe')
      expect(check.category).toBe('payments')
    })

    it("should return 'operational' on 2xx response", async () => {
      mockFetch.mockResolvedValue({ status: 200 })

      const check = createHttpCheck('https://example.com')
      const result = await check.check()

      expect(result.status).toBe('operational')
      expect(result.latencyMs).toBeTypeOf('number')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
        method: 'GET',
        signal: expect.any(AbortSignal),
      })
    })

    it("should return 'operational' for all 2xx status codes", async () => {
      for (const status of [200, 201, 204, 299]) {
        mockFetch.mockResolvedValue({ status })
        const check = createHttpCheck('https://example.com')
        const result = await check.check()
        expect(result.status).toBe('operational')
      }
    })

    it("should return 'down' on non-2xx response with badStatus message", async () => {
      mockFetch.mockResolvedValue({ status: 503 })

      const check = createHttpCheck('https://example.com')
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('HTTP 503 response.')
      expect(result.latencyMs).toBeTypeOf('number')
    })

    it("should return 'down' on 4xx response", async () => {
      mockFetch.mockResolvedValue({ status: 404 })

      const check = createHttpCheck('https://example.com')
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('HTTP 404 response.')
    })

    it("should return 'down' on timeout (AbortError)", async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      const check = createHttpCheck('https://example.com', { timeoutMs: 1000 })
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Request timed out.')
      expect(result.latencyMs).toBeTypeOf('number')
    })

    it("should return 'down' with error message on network failure", async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const check = createHttpCheck('https://example.com')
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('ECONNREFUSED')
    })

    it('should stringify non-Error throws from fetch', async () => {
      mockFetch.mockRejectedValue('network down')

      const check = createHttpCheck('https://example.com')
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('network down')
    })

    it("should return 'degraded' when latency exceeds threshold", async () => {
      // Simulate slow response by delaying the mock
      mockFetch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60))
        return { status: 200 }
      })

      const check = createHttpCheck('https://example.com', {
        degradedThresholdMs: 10,
      })
      const result = await check.check()

      expect(result.status).toBe('degraded')
      expect(result.latencyMs).toBeGreaterThan(10)
      expect(result.message).toMatch(/Response time \d+ms exceeded threshold 10ms\./)
    })

    it("should return 'operational' when latency is within threshold", async () => {
      mockFetch.mockResolvedValue({ status: 200 })

      const check = createHttpCheck('https://example.com', {
        degradedThresholdMs: 10000,
      })
      const result = await check.check()

      expect(result.status).toBe('operational')
    })

    it('should match specific expectedStatus when provided', async () => {
      mockFetch.mockResolvedValue({ status: 204 })

      const check = createHttpCheck('https://example.com', { expectedStatus: 204 })
      const result = await check.check()

      expect(result.status).toBe('operational')
    })

    it("should return 'down' when status does not match expectedStatus", async () => {
      mockFetch.mockResolvedValue({ status: 200 })

      const check = createHttpCheck('https://example.com', { expectedStatus: 204 })
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('HTTP 200 response.')
    })

    it('should pass an AbortSignal to fetch for timeout control', async () => {
      let receivedSignal: AbortSignal | undefined

      mockFetch.mockImplementation(async (_url: string, init: { signal: AbortSignal }) => {
        receivedSignal = init.signal
        return { status: 200 }
      })

      const check = createHttpCheck('https://example.com')
      await check.check()

      expect(receivedSignal).toBeInstanceOf(AbortSignal)
    })

    it('should use custom timeoutMs when provided', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      const check = createHttpCheck('https://example.com', { timeoutMs: 100 })
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Request timed out.')
    })
  })

  describe('createBondCheck', () => {
    it("should return 'operational' when bond type is bonded", async () => {
      mockIsBonded.mockReturnValue(true)

      const check = createBondCheck('database')
      const result = await check.check()

      expect(result.status).toBe('operational')
      expect(mockIsBonded).toHaveBeenCalledWith('database')
    })

    it("should return 'down' with message when bond type is not bonded", async () => {
      mockIsBonded.mockReturnValue(false)

      const check = createBondCheck('email')
      const result = await check.check()

      expect(result.status).toBe('down')
      expect(result.message).toBe("Bond 'email' is not registered.")
    })

    it('should use default name format bond:{bondType}', () => {
      const check = createBondCheck('database')
      expect(check.name).toBe('bond:database')
      expect(check.category).toBe('bonds')
    })

    it('should accept custom name and category', () => {
      const check = createBondCheck('cache', 'redis-check', 'infrastructure')
      expect(check.name).toBe('redis-check')
      expect(check.category).toBe('infrastructure')
    })

    it('should interpolate bondType in the down message', async () => {
      mockIsBonded.mockReturnValue(false)

      const check = createBondCheck('payments')
      const result = await check.check()

      expect(result.message).toBe("Bond 'payments' is not registered.")
    })
  })

  describe('createCustomCheck', () => {
    it('should wrap the provided function as a health check', () => {
      const fn = vi.fn().mockResolvedValue({ status: 'operational' as const })
      const check = createCustomCheck('my-check', fn)

      expect(check.name).toBe('my-check')
      expect(check.category).toBe('custom')
      expect(check.check).toBe(fn)
    })

    it('should accept a custom category', () => {
      const fn = vi.fn().mockResolvedValue({ status: 'operational' as const })
      const check = createCustomCheck('my-check', fn, 'application')

      expect(check.category).toBe('application')
    })

    it('should return the result from the provided function', async () => {
      const expectedResult: CheckResult = {
        status: 'degraded',
        latencyMs: 450,
        message: 'Slow queue processing',
      }
      const fn = vi.fn().mockResolvedValue(expectedResult)
      const check = createCustomCheck('queue-check', fn)

      const result = await check.check()

      expect(result).toBe(expectedResult)
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should propagate errors from the provided function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Check failed'))
      const check = createCustomCheck('failing-check', fn)

      await expect(check.check()).rejects.toThrow('Check failed')
    })
  })
})
