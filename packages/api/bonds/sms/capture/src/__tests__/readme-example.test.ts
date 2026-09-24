/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the message is intercepted, a
 * synthetic success is returned, and the capture reaches the bonded activity
 * sink. Nothing is mocked — the real console sink is only observed.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { setSink } from '@molecule/api-activity'
import { provider as consoleSink } from '@molecule/api-activity-console'
import { send, setProvider } from '@molecule/api-sms'

import { provider as smsCapture } from '../index.js'

describe('README @example', () => {
  it('intercepts the SMS and records it to the activity sink', async () => {
    const recordSpy = vi.spyOn(consoleSink, 'record')

    setSink(consoleSink)
    setProvider(smsCapture)

    const result = await send('+15551234567', 'Your verification code is 123456')

    expect(result.status).toBe('sent')
    expect(result.to).toBe('+15551234567')
    expect(result.id).toMatch(/^captured-/)
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sms',
        status: 'captured',
        recipient: '+15551234567',
        summary: 'Your verification code is 123456',
      }),
    )
  })
})
