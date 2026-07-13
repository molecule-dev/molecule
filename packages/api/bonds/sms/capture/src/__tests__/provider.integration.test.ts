/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual
 * `@molecule/api-activity` pipeline with a real bonded {@link ActivitySink}.
 *
 * The unit suite (`provider.test.ts`) mocks `@molecule/api-activity`, so it can
 * only validate OUR assumptions about `record()` — not the real contract this
 * bond depends on. This file drives the capture provider end-to-end through the
 * real bond registry, in both intercept-only and delegate+tee modes, and pins
 * the bulk-send contract: one bad recipient must not abort the batch, and the
 * aggregate counts must reflect what actually happened (the old sendBulk
 * hardcoded successful=total and let a delegate throw kill the whole batch).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { ActivityEvent, ActivitySink } from '@molecule/api-activity'
import { setSink } from '@molecule/api-activity'
import type { SMSProvider, SMSResult } from '@molecule/api-sms'

import { createSMSCaptureProvider } from '../provider.js'

/** A REAL sink implementation (the receiver side of the contract). */
function makeRecordingSink(): ActivitySink & { events: ActivityEvent[] } {
  const events: ActivityEvent[] = []
  return {
    events,
    async record(event: ActivityEvent): Promise<void> {
      events.push(event)
    },
  }
}

describe('@molecule/api-sms-capture × REAL @molecule/api-activity', () => {
  it('CONSUMER PROPERTY: works with NO activity sink bonded — capture must never break the app', async () => {
    // Runs first (nothing bonded yet in this process): a scaffold that wires
    // the capture provider but no sink still returns synthetic success.
    const capture = createSMSCaptureProvider()
    const result = await capture.send('+15550001111', 'hello')
    expect(result.status).toBe('sent')
    expect(result.to).toBe('+15550001111')
    expect(result.id).toMatch(/^captured-/)
  })

  it('intercept-only lifecycle: synthetic result + a "captured" event lands in the real sink', async () => {
    const sink = makeRecordingSink()
    setSink(sink)

    const capture = createSMSCaptureProvider()
    const result = await capture.send('+15550002222', 'Your code is 123456', { from: '+15559999' })

    expect(result.status).toBe('sent')
    expect(sink.events).toHaveLength(1)
    const event = sink.events[0]
    expect(event.type).toBe('sms')
    expect(event.status).toBe('captured')
    expect(event.recipient).toBe('+15550002222')
    expect(event.summary).toBe('Your code is 123456')
    expect(event.payload).toEqual({
      to: '+15550002222',
      message: 'Your code is 123456',
      options: { from: '+15559999' },
    })
    expect(event.result).toEqual(result)
    expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false)

    // getStatus in intercept mode answers 'sent' — a status poller keeps working in dev.
    expect(await capture.getStatus(result.id)).toEqual({ id: result.id, status: 'sent' })
  })

  it('FAILURE DISAMBIGUATION: delegate failure rethrows the ORIGINAL error and the sink says "failed", not "captured"', async () => {
    const sink = makeRecordingSink()
    setSink(sink)

    const realError = new Error('Twilio: 21211 invalid "To" phone number')
    const real: SMSProvider = {
      async send(to: string): Promise<SMSResult> {
        if (to === '+bad') throw realError
        return { id: `real-${to}`, status: 'queued', to }
      },
      async sendBulk() {
        throw new Error('capture must fan out through send(), not delegate sendBulk')
      },
      async getStatus(id: string) {
        return { id, status: 'delivered' as const }
      },
    }
    const capture = createSMSCaptureProvider(real)

    // Delegated success → 'sent' with the real result teed.
    const ok = await capture.send('+15550003333', 'hi')
    expect(ok).toEqual({ id: 'real-+15550003333', status: 'queued', to: '+15550003333' })
    expect(sink.events[0].status).toBe('sent')

    // Delegated failure → caller gets the REAL provider error (debuggable),
    // and the recorded event is 'failed' — distinguishable from intercept mode.
    await expect(capture.send('+bad', 'hi')).rejects.toBe(realError)
    expect(sink.events[1].status).toBe('failed')
    expect(sink.events[1].result).toEqual({ error: realError.message })

    // getStatus delegates to the real provider when wrapping one.
    expect(await capture.getStatus('SM123')).toEqual({ id: 'SM123', status: 'delivered' })
  })

  it('CONSUMER PROPERTY: sendBulk survives one bad recipient and reports honest counts', async () => {
    const sink = makeRecordingSink()
    setSink(sink)

    const real: SMSProvider = {
      async send(to: string): Promise<SMSResult> {
        if (to === '+throws') throw new Error('unreachable carrier')
        if (to === '+rejected') return { id: 'real-rejected', status: 'failed', to }
        return { id: `real-${to}`, status: 'queued', to }
      },
      async sendBulk() {
        throw new Error('unused')
      },
      async getStatus(id: string) {
        return { id, status: 'sent' as const }
      },
    }
    const capture = createSMSCaptureProvider(real)

    const bulk = await capture.sendBulk([
      { to: '+15550004444', message: 'a' },
      { to: '+throws', message: 'b' },
      { to: '+rejected', message: 'c' },
      { to: '+15550005555', message: 'd' },
    ])

    // The batch completed — the throwing recipient did not abort messages c/d.
    expect(bulk.total).toBe(4)
    expect(bulk.results).toHaveLength(4)
    expect(bulk.results[0].status).toBe('queued')
    expect(bulk.results[1]).toEqual({ id: '', status: 'failed', to: '+throws' })
    expect(bulk.results[2]).toEqual({ id: 'real-rejected', status: 'failed', to: '+rejected' })
    expect(bulk.results[3].status).toBe('queued')

    // Honest aggregates: 2 ok, 2 failed — not the old hardcoded successful=4.
    expect(bulk.successful).toBe(2)
    expect(bulk.failed).toBe(2)

    // Every attempt is visible in the activity feed with its real outcome —
    // including the resolved-but-rejected message, which records 'failed'
    // rather than pretending it was sent.
    expect(sink.events.map((e) => e.status)).toEqual(['sent', 'failed', 'failed', 'sent'])
  })
})
