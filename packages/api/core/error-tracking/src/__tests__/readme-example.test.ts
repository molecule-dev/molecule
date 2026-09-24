/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the console bond. Its only
 * outside world is the logger, which falls back to `console` when none is
 * bonded — so `console` is spied, nothing is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provider as consoleTracker } from '@molecule/api-error-tracking-console'

import { captureException, captureMessage, flush, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('captures an exception with normalized context, a message, and flushes', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const warnLog = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    setProvider(consoleTracker)

    const order = { id: 'ord_42', userId: 'user-123' }
    const chargeCustomer = async (o: { id: string }): Promise<void> => {
      throw new Error(`card declined for ${o.id}`)
    }

    let eventId: string | undefined
    try {
      await chargeCustomer(order)
    } catch (error) {
      eventId = captureException(error, {
        tags: { source: 'billing' },
        user: { id: order.userId },
        extra: { orderId: order.id },
      })
      console.error(`Charge failed; report ${eventId}`)
    }

    captureMessage('Payment retry queue is backing up', 'warning')
    expect(await flush(2000)).toBe(true)

    expect(eventId).toMatch(/^[0-9a-f-]{36}$/)
    expect(errorLog).toHaveBeenCalledWith(
      'error-tracking: exception captured',
      expect.objectContaining({
        eventId,
        error: expect.objectContaining({ message: 'card declined for ord_42' }),
        tags: { source: 'billing' },
        user: { id: 'user-123' },
        extra: { orderId: 'ord_42' },
      }),
    )
    expect(errorLog).toHaveBeenCalledWith(`Charge failed; report ${eventId}`)
    expect(warnLog).toHaveBeenCalledWith(
      'error-tracking: message captured',
      expect.objectContaining({ message: 'Payment retry queue is backing up', level: 'warning' }),
    )
  })
})
