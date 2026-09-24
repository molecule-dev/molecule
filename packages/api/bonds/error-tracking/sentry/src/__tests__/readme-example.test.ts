/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the vendor SDK (`@sentry/node`)
 * is mocked, the same way the package's own tests do.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { captureException, flush, setProvider, setUser } from '@molecule/api-error-tracking'

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn((..._args: unknown[]) => 'sentry-event-1'),
  captureMessage: vi.fn((..._args: unknown[]) => 'sentry-event-2'),
  setUser: vi.fn(),
  flush: vi.fn(async (_timeout?: number) => true),
}))

vi.mock('@sentry/node', () => sentry)

import { provider } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SENTRY_DSN: 'https://public@sentry.example.com/1',
      SENTRY_ENVIRONMENT: 'production',
    }
    delete process.env.SENTRY_TRACES_SAMPLE_RATE
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('initializes Sentry lazily, scopes the user, captures and flushes', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    setProvider(provider)

    setUser({ id: 'user-42', email: 'ada@example.com' })

    try {
      JSON.parse('{ not json')
    } catch (error) {
      const eventId = captureException(error, {
        tags: { source: 'import-job' },
        extra: { fileName: 'contacts.csv' },
      })
      console.info(`reported to Sentry as ${eventId}`)
    }

    const delivered = await flush(2000)

    expect(sentry.init).toHaveBeenCalledTimes(1)
    expect(sentry.init).toHaveBeenCalledWith({
      dsn: 'https://public@sentry.example.com/1',
      environment: 'production',
      tracesSampleRate: undefined,
    })
    expect(sentry.setUser).toHaveBeenCalledWith({
      id: 'user-42',
      email: 'ada@example.com',
      username: undefined,
      ip_address: undefined,
    })
    expect(sentry.captureException).toHaveBeenCalledWith(expect.any(SyntaxError), {
      tags: { source: 'import-job' },
      extra: { fileName: 'contacts.csv' },
    })
    expect(info).toHaveBeenCalledWith('reported to Sentry as sentry-event-1')
    expect(sentry.flush).toHaveBeenCalledWith(2000)
    expect(delivered).toBe(true)
  })
})
