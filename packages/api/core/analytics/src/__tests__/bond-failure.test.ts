import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetBondFailureThrottleForTests, trackBondFailure } from '../bond-failure.js'
import { setProvider } from '../provider.js'
import type { AnalyticsEvent, AnalyticsProvider } from '../types.js'

/** A provider that records every tracked event, failing on demand. */
function recordingProvider(opts: { failTrack?: boolean } = {}): {
  provider: AnalyticsProvider
  events: AnalyticsEvent[]
} {
  const events: AnalyticsEvent[] = []
  const provider: AnalyticsProvider = {
    name: 'recording',
    async track(event: AnalyticsEvent): Promise<void> {
      if (opts.failTrack) throw new Error('provider down')
      events.push(event)
    },
    async identify(): Promise<void> {},
    async page(): Promise<void> {},
  }
  return { provider, events }
}

beforeEach(() => {
  resetBondFailureThrottleForTests()
  vi.useFakeTimers({ now: new Date('2026-10-04T06:00:00Z'), toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('trackBondFailure', () => {
  it('emits bond.failure with the class shape, capped message, and stable name', () => {
    const { provider, events } = recordingProvider()
    setProvider(provider)

    trackBondFailure({
      bond: 'emails-mailgun',
      operation: 'send',
      error: new Error('Mailgun API 403: Forbidden '.repeat(40)),
    })

    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('bond.failure')
    expect(events[0].properties).toMatchObject({
      bond: 'emails-mailgun',
      operation: 'send',
      errorName: 'Error',
    })
    const message = (events[0].properties as { message?: string }).message ?? ''
    expect(message.length).toBeLessThanOrEqual(500)
  })

  it('is a silent no-op with no provider bonded', () => {
    expect(() =>
      trackBondFailure({ bond: 'payments-stripe', operation: 'charge', error: new Error('x') }),
    ).not.toThrow()
  })

  it('never throws when the provider rejects, and still throttles', () => {
    const { provider } = recordingProvider({ failTrack: true })
    setProvider(provider)
    expect(() =>
      trackBondFailure({ bond: 'uploads-s3', operation: 'upload', error: new Error('boom') }),
    ).not.toThrow()
  })

  it('throttles per bond+operation+errorName signature; a different class still emits', () => {
    const { provider, events } = recordingProvider()
    setProvider(provider)
    const fail = (): void => {
      trackBondFailure({ bond: 'emails-ses', operation: 'send', error: new Error('down') })
    }
    fail()
    fail()
    fail()
    expect(events).toHaveLength(1)

    vi.setSystemTime(new Date('2026-10-04T06:00:31Z'))
    fail()
    expect(events).toHaveLength(2)

    trackBondFailure({ bond: 'emails-ses', operation: 'delete', error: new Error('down') })
    expect(events).toHaveLength(3)
  })

  it('normalizes non-Error thrown values', () => {
    const { provider, events } = recordingProvider()
    setProvider(provider)
    trackBondFailure({ bond: 'emails-sendgrid', operation: 'send', error: 'rate limited' })
    expect(events[0].properties).toMatchObject({ errorName: 'string', message: 'rate limited' })
  })
})
