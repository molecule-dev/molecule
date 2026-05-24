/**
 * Email capture provider for molecule.dev.
 *
 * Implements {@link EmailTransport} by recording every `sendMail()` call as an
 * {@link ActivityEvent} instead of (or in addition to) actually sending it. In
 * dev with no ESP key configured this is intercept-only — it returns a
 * synthetic `EmailSendResult` so the app's flow runs unchanged. When wrapped
 * around a real transport it delegates AND tees the captured event.
 *
 * Mirrors the intercept-only shape of `createMockEmail()`
 * (`@molecule/api-testing`).
 *
 * @module
 */

import { record } from '@molecule/api-activity'
import type {
  EmailAddress,
  EmailMessage,
  EmailSendResult,
  EmailTransport,
} from '@molecule/api-emails'

/**
 * Normalizes the `to` field of an {@link EmailMessage} into a flat list of
 * email address strings.
 *
 * @param to - The message recipient(s) in any supported shape.
 * @returns The recipient addresses as strings.
 */
function toAddresses(to: EmailMessage['to']): string[] {
  const list = Array.isArray(to) ? to : [to]
  return list.map((addr: string | EmailAddress) => (typeof addr === 'string' ? addr : addr.address))
}

/**
 * Creates an email capture transport.
 *
 * When `realTransport` is provided, each message is delivered through it and
 * the captured event records the real outcome (delegate + tee). When omitted
 * (the dev default), messages are intercepted and a synthetic success result
 * is returned.
 *
 * @param realTransport - Optional real transport to delegate to and tee.
 * @returns An {@link EmailTransport} that records activity for every send.
 */
export function createEmailCaptureProvider(realTransport?: EmailTransport): EmailTransport {
  return {
    async sendMail(message: EmailMessage): Promise<EmailSendResult> {
      const accepted = toAddresses(message.to)
      const id = crypto.randomUUID()

      if (realTransport) {
        try {
          const result = await realTransport.sendMail(message)
          await record({
            id,
            type: 'email',
            status: 'sent',
            recipient: accepted[0],
            summary: message.subject,
            payload: message,
            result,
            timestamp: new Date().toISOString(),
          })
          return result
        } catch (error) {
          await record({
            id,
            type: 'email',
            status: 'failed',
            recipient: accepted[0],
            summary: message.subject,
            payload: message,
            result: { error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date().toISOString(),
          })
          throw error
        }
      }

      const result: EmailSendResult = {
        accepted,
        rejected: [],
        messageId: `captured-${id}`,
      }

      await record({
        id,
        type: 'email',
        status: 'captured',
        recipient: accepted[0],
        summary: message.subject,
        payload: message,
        result,
        timestamp: new Date().toISOString(),
      })

      return result
    },
  }
}

/** Default email capture transport (intercept-only). */
export const provider: EmailTransport = createEmailCaptureProvider()
