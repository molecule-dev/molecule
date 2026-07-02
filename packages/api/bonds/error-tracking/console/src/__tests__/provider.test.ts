/**
 * Tests for the console error tracking provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ErrorTrackingProvider } from '@molecule/api-error-tracking'

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Freshly imports the provider (module state, incl. the setUser scope, reset). */
async function importProvider(): Promise<ErrorTrackingProvider> {
  const { provider } = await import('../provider.js')
  return provider
}

describe('console error tracking provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
  })

  describe('captureException', () => {
    it('logs a structured capture at error level and returns a generated event id', async () => {
      const provider = await importProvider()
      const error = new Error('boom')

      const eventId = provider.captureException(error, {
        tags: { source: 'express' },
        extra: { orderId: 'order-1' },
        request: { method: 'GET', url: '/api/orders' },
      })

      expect(eventId).toMatch(UUID_RE)
      expect(mockLogger.error).toHaveBeenCalledWith('error-tracking: exception captured', {
        eventId,
        error,
        tags: { source: 'express' },
        extra: { orderId: 'order-1' },
        request: { method: 'GET', url: '/api/orders' },
      })
    })

    it('omits absent context fields from the log payload', async () => {
      const provider = await importProvider()
      const error = new Error('boom')

      const eventId = provider.captureException(error)
      expect(mockLogger.error).toHaveBeenCalledWith('error-tracking: exception captured', {
        eventId,
        error,
      })
    })

    it('generates a distinct event id per capture', async () => {
      const provider = await importProvider()
      const first = provider.captureException(new Error('a'))
      const second = provider.captureException(new Error('b'))
      expect(first).not.toBe(second)
    })
  })

  describe('captureMessage', () => {
    it('routes levels to the matching logger method', async () => {
      const provider = await importProvider()

      provider.captureMessage('f', 'fatal')
      provider.captureMessage('e', 'error')
      provider.captureMessage('w', 'warning')
      provider.captureMessage('i', 'info')
      provider.captureMessage('d', 'debug')

      expect(mockLogger.error).toHaveBeenCalledTimes(2) // fatal + error
      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
      expect(mockLogger.debug).toHaveBeenCalledTimes(1)
    })

    it('defaults to info level and logs the structured payload with an event id', async () => {
      const provider = await importProvider()

      const eventId = provider.captureMessage('queue backing up', undefined, {
        tags: { queue: 'emails' },
      })

      expect(eventId).toMatch(UUID_RE)
      expect(mockLogger.info).toHaveBeenCalledWith('error-tracking: message captured', {
        eventId,
        message: 'queue backing up',
        level: 'info',
        tags: { queue: 'emails' },
      })
    })
  })

  describe('setUser scoping (remote-provider parity)', () => {
    it('merges the scoped user into subsequent captures', async () => {
      const provider = await importProvider()
      provider.setUser?.({ id: 'user-1', email: 'a@example.com' })

      const eventId = provider.captureException(new Error('boom'))
      expect(mockLogger.error).toHaveBeenCalledWith('error-tracking: exception captured', {
        eventId,
        error: expect.any(Error),
        user: { id: 'user-1', email: 'a@example.com' },
      })
    })

    it('prefers the capture context user over the scoped user', async () => {
      const provider = await importProvider()
      provider.setUser?.({ id: 'scoped-user' })

      provider.captureException(new Error('boom'), { user: { id: 'context-user' } })
      expect(mockLogger.error).toHaveBeenCalledWith(
        'error-tracking: exception captured',
        expect.objectContaining({ user: { id: 'context-user' } }),
      )
    })

    it('clears the scoped user with null', async () => {
      const provider = await importProvider()
      provider.setUser?.({ id: 'user-1' })
      provider.setUser?.(null)

      const eventId = provider.captureException(new Error('boom'))
      expect(mockLogger.error).toHaveBeenCalledWith('error-tracking: exception captured', {
        eventId,
        error: expect.any(Error),
      })
    })
  })

  describe('flush', () => {
    it('trivially resolves true (nothing is buffered)', async () => {
      const provider = await importProvider()
      await expect(provider.flush?.(1000)).resolves.toBe(true)
    })
  })
})
