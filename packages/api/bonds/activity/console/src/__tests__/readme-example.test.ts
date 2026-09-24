/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the sink is bonded through the real
 * activity core and the event reaches the real logger.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { record, setSink } from '@molecule/api-activity'
import { logger } from '@molecule/api-logger'

import { provider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bonds the console sink and logs each recorded event', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined)

    setSink(provider)

    const event = {
      id: crypto.randomUUID(),
      type: 'email' as const,
      status: 'sent' as const,
      recipient: 'user@example.com',
      summary: 'Welcome email',
      timestamp: new Date().toISOString(),
    }
    await record(event)

    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(
      '[activity] email sent → user@example.com: Welcome email',
      event,
    )
  })
})
