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

import type { ActivityEvent } from '@molecule/api-activity'
import { record } from '@molecule/api-activity'
import type {
  EmailAddress,
  EmailMessage,
  EmailSendResult,
  EmailTransport,
} from '@molecule/api-emails'

/**
 * Calls {@link record}, but never lets a throwing {@link ActivitySink}
 * escape to the caller. `ActivitySink` implementations are documented as
 * best-effort; without this guard, a sink that throws AFTER a real
 * transport already succeeded turns an actually-SENT email into what looks
 * like a rejected `sendMail()` — the caller retries and the recipient gets
 * a duplicate. The proper long-term fix is enforcing best-effort centrally
 * in `@molecule/api-activity`'s `record()` (outside this package's owned
 * files); until then every call site here goes through this wrapper. See
 * integration-audit-findings.md → [email] "api-emails-capture —
 * ambiguous-failure".
 *
 * @param event - The activity event to record.
 */
async function recordBestEffort(event: ActivityEvent): Promise<void> {
  try {
    await record(event)
  } catch (_error) {
    // Intentional noop — see the doc comment above. This package has no
    // logging channel available (no logger peer dependency), and adding one
    // is out of scope for this fix; a thrown/logged failure here would
    // either break the caller's send outcome or require a new dependency.
  }
}

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
          // Best-effort: the real transport already succeeded — a throwing
          // sink here must never turn this into a rejected sendMail().
          await recordBestEffort({
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
          // Best-effort: a throwing sink here must not replace the REAL
          // transport error with a sink error — the caller needs to see why
          // the send actually failed.
          await recordBestEffort({
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

      // Best-effort: the intercepted (dev, no ESP key) path must keep working
      // with zero configuration even if a bonded sink misbehaves.
      await recordBestEffort({
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
