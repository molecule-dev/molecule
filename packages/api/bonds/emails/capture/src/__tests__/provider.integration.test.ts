/**
 * REAL-DEPENDENCY integration tests — no mocks: the actual
 * `@molecule/api-activity` core (real bond registry) and the actual
 * `@molecule/api-emails` core delegation.
 *
 * The unit suite (`provider.test.ts`) mocks `record()`, so it can only
 * validate OUR assumptions about the activity core — not the core itself.
 * These tests wire the capture transport into the real `email` bond exactly
 * the way a scaffolded app does (`setTransport(provider)`), and exercise the
 * three consumer-visible outcomes end-to-end: captured (dev, no ESP key),
 * sent (delegate + tee), and failed (tee records, caller still gets the real
 * error).
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'vitest'

import type { ActivityEvent } from '@molecule/api-activity'
import { setSink } from '@molecule/api-activity'
import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'
import { sendMail, setTransport } from '@molecule/api-emails'

import { createEmailCaptureProvider, provider } from '../provider.js'

const message: EmailMessage = {
  from: 'no-reply@example.com',
  to: 'user@example.com',
  subject: 'Reset your password',
  html: '<a href="https://example.com/reset?t=1">Reset</a>',
}

/** Events recorded by the real activity core into our in-memory sink. */
const recorded: ActivityEvent[] = []

describe('@molecule/api-emails-capture × REAL api-activity + api-emails', () => {
  // NOTE: test order is load-bearing — the first test runs BEFORE any sink is
  // bonded, which is exactly the state of a freshly scaffolded dev app.

  it('CONSUMER PROPERTY: with no activity sink bonded (dev default), the email flow still succeeds', async () => {
    // A scaffolded app wires the capture provider as its email transport and
    // may have no activity sink at all. `record()` must silently no-op so the
    // password-reset/signup flow works with ZERO configuration.
    setTransport(provider)
    const result = await sendMail(message)

    expect(result.accepted).toEqual(['user@example.com'])
    expect(result.rejected).toEqual([])
    // The synthetic message id is the caller's signal that the send was
    // intercepted (dev) rather than delivered by a real ESP.
    expect(result.messageId).toMatch(/^captured-/u)
  })

  describe('with a real in-memory sink bonded', () => {
    beforeEach(() => {
      recorded.length = 0
      setSink({
        async record(event: ActivityEvent): Promise<void> {
          recorded.push(event)
        },
      })
    })

    it('intercept-only: records a `captured` event through the real bond registry', async () => {
      const result = await sendMail({
        ...message,
        to: ['a@example.com', { name: 'B', address: 'b@example.com' }],
      })

      expect(result.accepted).toEqual(['a@example.com', 'b@example.com'])
      expect(recorded).toHaveLength(1)
      const event = recorded[0]!
      expect(event.type).toBe('email')
      expect(event.status).toBe('captured')
      expect(event.recipient).toBe('a@example.com')
      expect(event.summary).toBe('Reset your password')
      expect(event.result).toBe(result)
      // The timestamp must be a real ISO 8601 instant (the IDE Activity panel
      // sorts on it).
      expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false)
    })

    it('delegate + tee: the real transport result is returned AND recorded as `sent`', async () => {
      const delivered: EmailMessage[] = []
      const realResult: EmailSendResult = {
        accepted: ['user@example.com'],
        rejected: [],
        messageId: '<real-1@esp.example>',
      }
      const realTransport: EmailTransport = {
        async sendMail(msg: EmailMessage): Promise<EmailSendResult> {
          delivered.push(msg)
          return realResult
        },
      }

      const tee = createEmailCaptureProvider(realTransport)
      setTransport(tee)
      const result = await sendMail(message)

      expect(delivered).toEqual([message])
      expect(result).toBe(realResult)
      expect(recorded).toHaveLength(1)
      expect(recorded[0]!.status).toBe('sent')
      expect(recorded[0]!.result).toBe(realResult)
    })

    it('FAILURE DISAMBIGUATION: a failing real transport rethrows the ORIGINAL error and the trail says `failed` with the cause', async () => {
      const realTransport: EmailTransport = {
        async sendMail(): Promise<EmailSendResult> {
          throw new Error('SMTP 451 temporary failure')
        },
      }

      setTransport(createEmailCaptureProvider(realTransport))
      // The caller sees the real ESP error (not a swallowed generic one)...
      await expect(sendMail(message)).rejects.toThrow('SMTP 451 temporary failure')

      // ...and the activity trail disambiguates it from an intercepted or
      // successful send: status `failed`, with the cause preserved.
      expect(recorded).toHaveLength(1)
      expect(recorded[0]!.status).toBe('failed')
      expect(recorded[0]!.result).toEqual({ error: 'SMTP 451 temporary failure' })
    })
  })
})
