/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The only stand-in is the logger the
 * provider writes to (bonded as a spy instead of the console fallback).
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, unbond } from '@molecule/api-bond'
import {
  captureException,
  captureMessage,
  setProvider,
  setUser,
} from '@molecule/api-error-tracking'

import { provider } from '../index.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('README @example', () => {
  const logger = { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }

  beforeEach(() => {
    bond('logger', logger)
  })

  afterEach(() => {
    unbond('logger')
    vi.restoreAllMocks()
  })

  it('logs structured captures with the scoped user and returns an event id', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    setProvider(provider)

    setUser({ id: 'user-42', email: 'ada@example.com' })

    let reported: string | undefined
    try {
      JSON.parse('{ not json')
    } catch (error) {
      const eventId = captureException(error, { tags: { source: 'import-job' } })
      console.info(`reported as ${eventId}`)
      reported = eventId
    }

    captureMessage('Import finished with skipped rows', 'warning', { extra: { skipped: 3 } })

    expect(reported).toMatch(UUID_RE)
    expect(info).toHaveBeenCalledWith(`reported as ${String(reported)}`)
    expect(logger.error).toHaveBeenCalledWith(
      'error-tracking: exception captured',
      expect.objectContaining({
        eventId: reported,
        error: expect.any(SyntaxError),
        tags: { source: 'import-job' },
        user: { id: 'user-42', email: 'ada@example.com' },
      }),
    )
    expect(logger.warn).toHaveBeenCalledWith(
      'error-tracking: message captured',
      expect.objectContaining({
        message: 'Import finished with skipped rows',
        level: 'warning',
        extra: { skipped: 3 },
      }),
    )
  })
})
