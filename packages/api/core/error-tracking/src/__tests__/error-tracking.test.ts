import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ErrorTrackingModule from '../error-tracking.js'
import type * as ProviderModule from '../provider.js'
import type { ErrorTrackingContext, ErrorTrackingProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let captureException: typeof ErrorTrackingModule.captureException
let captureMessage: typeof ErrorTrackingModule.captureMessage
let setUser: typeof ErrorTrackingModule.setUser
let flush: typeof ErrorTrackingModule.flush

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

function createMockProvider(overrides?: Partial<ErrorTrackingProvider>): ErrorTrackingProvider {
  return {
    captureException: vi.fn().mockReturnValue('event-1'),
    captureMessage: vi.fn().mockReturnValue('event-2'),
    setUser: vi.fn(),
    flush: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('error tracking convenience functions', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
    const providerModule = await import('../provider.js')
    const errorTrackingModule = await import('../error-tracking.js')
    setProvider = providerModule.setProvider
    captureException = errorTrackingModule.captureException
    captureMessage = errorTrackingModule.captureMessage
    setUser = errorTrackingModule.setUser
    flush = errorTrackingModule.flush
  })

  describe('unbonded no-op contract (error reporting must never throw into the app)', () => {
    it('captureException no-ops and returns undefined when no provider is bonded', () => {
      expect(() => captureException(new Error('boom'))).not.toThrow()
      expect(captureException(new Error('boom'))).toBeUndefined()
    })

    it('captureMessage no-ops and returns undefined when no provider is bonded', () => {
      expect(captureMessage('nothing to see')).toBeUndefined()
    })

    it('setUser no-ops when no provider is bonded', () => {
      expect(() => setUser({ id: 'user-1' })).not.toThrow()
    })

    it('flush resolves true when no provider is bonded (nothing to flush)', async () => {
      await expect(flush()).resolves.toBe(true)
    })
  })

  describe('delegation to the bonded provider', () => {
    it('captureException delegates error + context and returns the event id', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      const error = new Error('boom')
      const context: ErrorTrackingContext = {
        tags: { source: 'express' },
        user: { id: 'user-1' },
        extra: { orderId: 'order-1' },
        request: { method: 'GET', url: '/api/orders' },
      }

      expect(captureException(error, context)).toBe('event-1')
      expect(mockProvider.captureException).toHaveBeenCalledWith(error, context)
    })

    it('captureMessage delegates message + level + context and returns the event id', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(captureMessage('queue backing up', 'warning', { tags: { queue: 'emails' } })).toBe(
        'event-2',
      )
      expect(mockProvider.captureMessage).toHaveBeenCalledWith('queue backing up', 'warning', {
        tags: { queue: 'emails' },
      })
    })

    it('captureMessage passes level as undefined when omitted (provider applies its default)', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      captureMessage('hello')
      expect(mockProvider.captureMessage).toHaveBeenCalledWith('hello', undefined, undefined)
    })

    it('normalizes a provider void return to undefined', () => {
      const mockProvider = createMockProvider({
        captureException: vi.fn().mockReturnValue(undefined),
      })
      setProvider(mockProvider)
      expect(captureException(new Error('boom'))).toBeUndefined()
    })

    it('setUser delegates the user and null (clear)', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      setUser({ id: 'user-1', email: 'a@example.com' })
      expect(mockProvider.setUser).toHaveBeenCalledWith({ id: 'user-1', email: 'a@example.com' })
      setUser(null)
      expect(mockProvider.setUser).toHaveBeenCalledWith(null)
    })

    it('setUser no-ops when the provider does not implement optional user scoping', () => {
      setProvider(createMockProvider({ setUser: undefined }))
      expect(() => setUser({ id: 'user-1' })).not.toThrow()
    })

    it('flush delegates the timeout and returns the provider result', async () => {
      const mockProvider = createMockProvider({ flush: vi.fn().mockResolvedValue(false) })
      setProvider(mockProvider)

      await expect(flush(2000)).resolves.toBe(false)
      expect(mockProvider.flush).toHaveBeenCalledWith(2000)
    })

    it('flush resolves true when the provider does not implement optional flush', async () => {
      setProvider(createMockProvider({ flush: undefined }))
      await expect(flush()).resolves.toBe(true)
    })
  })

  describe('provider failures are logged, never rethrown', () => {
    it('captureException swallows a throwing provider and warns with the error', () => {
      const captureError = new Error('sentry is down')
      setProvider(
        createMockProvider({
          captureException: vi.fn().mockImplementation(() => {
            throw captureError
          }),
        }),
      )

      expect(() => captureException(new Error('boom'))).not.toThrow()
      expect(captureException(new Error('boom'))).toBeUndefined()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('captureException failed'),
        { error: captureError },
      )
    })

    it('captureMessage swallows a throwing provider and warns with the error', () => {
      const captureError = new Error('sentry is down')
      setProvider(
        createMockProvider({
          captureMessage: vi.fn().mockImplementation(() => {
            throw captureError
          }),
        }),
      )

      expect(captureMessage('hello')).toBeUndefined()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('captureMessage failed'),
        { error: captureError },
      )
    })

    it('setUser swallows a throwing provider and warns with the error', () => {
      const setUserError = new Error('scope corrupted')
      setProvider(
        createMockProvider({
          setUser: vi.fn().mockImplementation(() => {
            throw setUserError
          }),
        }),
      )

      expect(() => setUser({ id: 'user-1' })).not.toThrow()
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('setUser failed'), {
        error: setUserError,
      })
    })

    it('flush swallows a rejecting provider, warns, and resolves false', async () => {
      const flushError = new Error('network gone')
      setProvider(createMockProvider({ flush: vi.fn().mockRejectedValue(flushError) }))

      await expect(flush(100)).resolves.toBe(false)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('flush failed'), {
        error: flushError,
      })
    })
  })
})
