/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual
 * `@molecule/api-activity` pipeline with a real bonded {@link ActivitySink}.
 *
 * The unit suite (`provider.test.ts`) mocks `@molecule/api-activity`, so it can
 * only validate OUR assumptions about `record()` — not the real contract this
 * bond depends on (record() must be awaitable, must no-op silently when no sink
 * is bonded, and must hand the sink the exact event). This file drives the
 * capture provider end-to-end through the real bond registry, in both
 * intercept-only and delegate+tee modes.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { ActivityEvent, ActivitySink } from '@molecule/api-activity'
import { setSink } from '@molecule/api-activity'
import type {
  NotificationPayload,
  PushNotificationProvider,
  PushSubscription,
  SendResult,
} from '@molecule/api-push-notifications'

import { createPushCaptureProvider } from '../provider.js'

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

function makeSubscription(id: string): PushSubscription {
  return {
    endpoint: `https://push.example.com/endpoint/${id}`,
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  }
}

const payload: NotificationPayload = { title: 'Deploy done', options: { body: 'v1.4.2 live' } }

describe('@molecule/api-push-capture × REAL @molecule/api-activity', () => {
  it('CONSUMER PROPERTY: works with NO activity sink bonded — capture must never break the app', async () => {
    // Runs first (nothing bonded yet in this process): a scaffold that wires
    // the capture provider but no sink still delivers synthetic success.
    const capture = createPushCaptureProvider()
    const result = await capture.send(makeSubscription('no-sink'), payload)
    expect(result).toEqual({ statusCode: 201, headers: {}, body: '' })
  })

  it('intercept-only lifecycle: synthetic 201 + a "captured" event lands in the real sink', async () => {
    const sink = makeRecordingSink()
    setSink(sink)

    const capture = createPushCaptureProvider()
    const subscription = makeSubscription('intercept')
    const result = await capture.send(subscription, payload)

    expect(result).toEqual({ statusCode: 201, headers: {}, body: '' })
    expect(sink.events).toHaveLength(1)
    const event = sink.events[0]
    expect(event.type).toBe('push')
    expect(event.status).toBe('captured')
    expect(event.recipient).toBe(subscription.endpoint)
    expect(event.summary).toBe('Deploy done')
    expect(event.payload).toEqual({ subscription, payload })
    expect(event.result).toEqual(result)
    expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false)
  })

  it('FAILURE DISAMBIGUATION: captured vs sent vs failed are distinct statuses, and the ORIGINAL error surfaces', async () => {
    const sink = makeRecordingSink()
    setSink(sink)

    const realError = new Error('410 Gone: subscription expired')
    const realResult: SendResult = { statusCode: 201, headers: { location: 'x' }, body: 'ok' }
    const real: PushNotificationProvider = {
      configure(): void {},
      async send(subscription: PushSubscription): Promise<SendResult> {
        if (subscription.endpoint.includes('dead')) throw realError
        return realResult
      },
      async sendMany() {
        throw new Error('capture must fan out through send(), not delegate sendMany')
      },
      generateVapidKeys: () => ({ publicKey: 'pub', privateKey: 'priv' }),
      getPublicKey: () => 'pub',
    }

    const capture = createPushCaptureProvider(real)

    // Delegated success → 'sent' with the REAL provider result teed.
    const okResult = await capture.send(makeSubscription('ok'), payload)
    expect(okResult).toBe(realResult)
    expect(sink.events[0].status).toBe('sent')
    expect(sink.events[0].result).toBe(realResult)

    // Delegated failure → the original error rethrows (the caller debugs the
    // REAL failure, not a capture artifact) and the sink records 'failed'.
    await expect(capture.send(makeSubscription('dead'), payload)).rejects.toBe(realError)
    expect(sink.events[1].status).toBe('failed')
    expect(sink.events[1].result).toEqual({ error: realError.message })

    // The three statuses a debugging session must be able to tell apart:
    const intercept = createPushCaptureProvider()
    await intercept.send(makeSubscription('intercepted'), payload)
    const statuses = sink.events.map((e) => e.status)
    expect(statuses).toEqual(['sent', 'failed', 'captured'])
  })

  it('sendMany survives a partial failure and records every attempt', async () => {
    const sink = makeRecordingSink()
    setSink(sink)

    const real: PushNotificationProvider = {
      configure(): void {},
      async send(subscription: PushSubscription): Promise<SendResult> {
        if (subscription.endpoint.includes('dead')) throw new Error('gone')
        return { statusCode: 201, headers: {}, body: '' }
      },
      async sendMany() {
        throw new Error('unused')
      },
      generateVapidKeys: () => ({ publicKey: '', privateKey: '' }),
      getPublicKey: () => undefined,
    }
    const capture = createPushCaptureProvider(real)

    const subs = [makeSubscription('a'), makeSubscription('dead'), makeSubscription('c')]
    const results = await capture.sendMany(subs, payload)

    expect(results).toHaveLength(3)
    expect(results[0].result?.statusCode).toBe(201)
    expect(results[0].error).toBeUndefined()
    expect(results[1].result).toBeUndefined()
    expect(results[1].error?.message).toBe('gone')
    expect(results[2].result?.statusCode).toBe(201)

    expect(sink.events.map((e) => e.status)).toEqual(['sent', 'failed', 'sent'])
  })
})
