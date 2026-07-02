/**
 * Tests for the Sentry error tracking provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ErrorTrackingProvider } from '@molecule/api-error-tracking'

// Track mock functions for assertions.
let mockInit: ReturnType<typeof vi.fn>
let mockCaptureException: ReturnType<typeof vi.fn>
let mockCaptureMessage: ReturnType<typeof vi.fn>
let mockSetUser: ReturnType<typeof vi.fn>
let mockFlush: ReturnType<typeof vi.fn>

// Mock the Sentry SDK before importing the provider.
vi.mock('@sentry/node', () => {
  mockInit = vi.fn()
  mockCaptureException = vi.fn().mockReturnValue('sentry-event-1')
  mockCaptureMessage = vi.fn().mockReturnValue('sentry-event-2')
  mockSetUser = vi.fn()
  mockFlush = vi.fn().mockResolvedValue(true)
  return {
    init: mockInit,
    captureException: mockCaptureException,
    captureMessage: mockCaptureMessage,
    setUser: mockSetUser,
    flush: mockFlush,
  }
})

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0'

/** Freshly imports the provider (module state, incl. the init-once flag, reset). */
async function importProvider(): Promise<ErrorTrackingProvider> {
  const { provider } = await import('../provider.js')
  return provider
}

describe('Sentry error tracking provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
  })

  describe('no-DSN no-op mode (installed but not configured must never crash)', () => {
    beforeEach(() => {
      vi.stubEnv('SENTRY_DSN', '')
    })

    it('captureException does nothing and returns undefined', async () => {
      const provider = await importProvider()
      expect(provider.captureException(new Error('boom'))).toBeUndefined()
      expect(mockInit).not.toHaveBeenCalled()
      expect(mockCaptureException).not.toHaveBeenCalled()
    })

    it('captureMessage does nothing and returns undefined', async () => {
      const provider = await importProvider()
      expect(provider.captureMessage('hello', 'warning')).toBeUndefined()
      expect(mockInit).not.toHaveBeenCalled()
      expect(mockCaptureMessage).not.toHaveBeenCalled()
    })

    it('setUser does nothing', async () => {
      const provider = await importProvider()
      expect(() => provider.setUser?.({ id: 'user-1' })).not.toThrow()
      expect(mockSetUser).not.toHaveBeenCalled()
    })

    it('flush resolves true without touching the SDK (nothing was buffered)', async () => {
      const provider = await importProvider()
      await expect(provider.flush?.(1000)).resolves.toBe(true)
      expect(mockFlush).not.toHaveBeenCalled()
    })
  })

  describe('lazy init from the environment', () => {
    it('initializes once with the DSN, then reuses the SDK across captures', async () => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
      const provider = await importProvider()

      provider.captureException(new Error('first'))
      provider.captureException(new Error('second'))
      provider.captureMessage('third')

      expect(mockInit).toHaveBeenCalledTimes(1)
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: TEST_DSN, tracesSampleRate: undefined }),
      )
      expect(mockCaptureException).toHaveBeenCalledTimes(2)
      expect(mockCaptureMessage).toHaveBeenCalledTimes(1)
    })

    it('passes SENTRY_ENVIRONMENT when set', async () => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
      vi.stubEnv('SENTRY_ENVIRONMENT', 'staging')
      const provider = await importProvider()

      provider.captureException(new Error('boom'))
      expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ environment: 'staging' }))
    })

    it('falls back to NODE_ENV for the environment when SENTRY_ENVIRONMENT is unset/empty', async () => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
      vi.stubEnv('SENTRY_ENVIRONMENT', '') // empty string must count as unset
      vi.stubEnv('NODE_ENV', 'production')
      const provider = await importProvider()

      provider.captureException(new Error('boom'))
      expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ environment: 'production' }))
    })

    it('passes a valid SENTRY_TRACES_SAMPLE_RATE through to init', async () => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
      vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', '0.25')
      const provider = await importProvider()

      provider.captureException(new Error('boom'))
      expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0.25 }))
    })

    it('warns and disables tracing on an invalid SENTRY_TRACES_SAMPLE_RATE (never crashes)', async () => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
      vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', 'lots')
      const provider = await importProvider()

      expect(() => provider.captureException(new Error('boom'))).not.toThrow()
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({ tracesSampleRate: undefined }),
      )
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SENTRY_TRACES_SAMPLE_RATE'),
      )
    })
  })

  describe('capture mapping (normalized context → Sentry scope)', () => {
    beforeEach(() => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
    })

    it('maps tags/user/extra and folds request into extra.request', async () => {
      const provider = await importProvider()
      const error = new Error('boom')

      const eventId = provider.captureException(error, {
        tags: { source: 'express' },
        user: { id: 'user-1', email: 'a@example.com', username: 'alice', ipAddress: '203.0.113.7' },
        extra: { orderId: 'order-1' },
        request: { method: 'POST', url: '/api/orders?draft=true' },
      })

      expect(eventId).toBe('sentry-event-1')
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        tags: { source: 'express' },
        user: { id: 'user-1', email: 'a@example.com', username: 'alice', ip_address: '203.0.113.7' },
        extra: {
          orderId: 'order-1',
          request: { method: 'POST', url: '/api/orders?draft=true' },
        },
      })
    })

    it('passes no capture context when there is nothing to attach', async () => {
      const provider = await importProvider()
      const error = new Error('boom')

      provider.captureException(error)
      expect(mockCaptureException).toHaveBeenCalledWith(error, undefined)
    })

    it('captureMessage carries the level (defaulting to info) plus context', async () => {
      const provider = await importProvider()

      const eventId = provider.captureMessage('queue backing up', 'warning', {
        tags: { queue: 'emails' },
      })
      expect(eventId).toBe('sentry-event-2')
      expect(mockCaptureMessage).toHaveBeenCalledWith('queue backing up', {
        level: 'warning',
        tags: { queue: 'emails' },
      })

      provider.captureMessage('plain')
      expect(mockCaptureMessage).toHaveBeenCalledWith('plain', { level: 'info' })
    })

    it('setUser maps the normalized user and clears with null', async () => {
      const provider = await importProvider()

      provider.setUser?.({ id: 'user-1', ipAddress: '203.0.113.7' })
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'user-1',
        email: undefined,
        username: undefined,
        ip_address: '203.0.113.7',
      })

      provider.setUser?.(null)
      expect(mockSetUser).toHaveBeenCalledWith(null)
    })
  })

  describe('flush', () => {
    it('delegates to Sentry.flush with the timeout once initialized', async () => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
      const provider = await importProvider()

      provider.captureException(new Error('boom')) // triggers init
      await expect(provider.flush?.(2000)).resolves.toBe(true)
      expect(mockFlush).toHaveBeenCalledWith(2000)
    })

    it('resolves true without delegating when never initialized', async () => {
      vi.stubEnv('SENTRY_DSN', TEST_DSN)
      const provider = await importProvider()

      // No capture happened, so init never ran — nothing can be buffered.
      await expect(provider.flush?.(2000)).resolves.toBe(true)
      expect(mockFlush).not.toHaveBeenCalled()
    })
  })

  describe('secrets self-registration (fleet pattern)', () => {
    it('registers SENTRY_DSN/SENTRY_ENVIRONMENT/SENTRY_TRACES_SAMPLE_RATE on import', async () => {
      await importProvider() // provider.ts side-effect imports ./secrets.js
      const { getSecretDefinition } = await import('@molecule/api-secrets')

      const dsn = getSecretDefinition('SENTRY_DSN')
      expect(dsn?.required).toBe(true)
      expect(dsn?.description).toContain('Sentry DSN —')
      expect(dsn?.helpUrl).toBe('https://sentry.io/settings/projects/')

      expect(getSecretDefinition('SENTRY_ENVIRONMENT')?.required).toBe(false)
      expect(getSecretDefinition('SENTRY_TRACES_SAMPLE_RATE')?.required).toBe(false)
    })
  })
})
