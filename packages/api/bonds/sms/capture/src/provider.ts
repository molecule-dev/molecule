/**
 * SMS capture provider for molecule.dev.
 *
 * Implements {@link SMSProvider} by recording every `send()` / `sendBulk()`
 * call as an {@link ActivityEvent} instead of (or in addition to) actually
 * sending it. Intercept-only by default (synthetic `SMSResult`); delegates AND
 * tees when wrapping a real provider.
 *
 * @module
 */

import { record } from '@molecule/api-activity'
import type {
  BulkSMSMessage,
  BulkSMSResult,
  SMSOptions,
  SMSProvider,
  SMSResult,
  SMSStatus,
} from '@molecule/api-sms'

/**
 * Creates an SMS capture provider.
 *
 * When `realProvider` is provided, each message is delivered through it and the
 * captured event records the real outcome (delegate + tee). When omitted (the
 * dev default), messages are intercepted and a synthetic `SMSResult` is
 * returned.
 *
 * @param realProvider - Optional real provider to delegate to and tee.
 * @returns An {@link SMSProvider} that records activity for every send.
 */
export function createSMSCaptureProvider(realProvider?: SMSProvider): SMSProvider {
  return {
    async send(to: string, message: string, options?: SMSOptions): Promise<SMSResult> {
      const id = crypto.randomUUID()

      if (realProvider) {
        try {
          const result = await realProvider.send(to, message, options)
          await record({
            id,
            type: 'sms',
            // A provider can RESOLVE with a failed result (e.g. a bulk-path
            // rejection) — recording that as 'sent' would show a delivery in
            // the activity feed that never happened.
            status: result.status === 'failed' ? 'failed' : 'sent',
            recipient: to,
            summary: message,
            payload: { to, message, options },
            result,
            timestamp: new Date().toISOString(),
          })
          return result
        } catch (error) {
          await record({
            id,
            type: 'sms',
            status: 'failed',
            recipient: to,
            summary: message,
            payload: { to, message, options },
            result: { error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date().toISOString(),
          })
          throw error
        }
      }

      const result: SMSResult = { id: `captured-${id}`, status: 'sent', to }

      await record({
        id,
        type: 'sms',
        status: 'captured',
        recipient: to,
        summary: message,
        payload: { to, message, options },
        result,
        timestamp: new Date().toISOString(),
      })

      return result
    },

    async sendBulk(messages: BulkSMSMessage[]): Promise<BulkSMSResult> {
      // Mirror the real providers' bulk contract: one message failing (the
      // delegated real provider throwing, or returning status 'failed') must
      // not abort the batch, and the aggregate counts must reflect reality —
      // hardcoding successful=total here silently misreported delegate+tee
      // failures as successes.
      const results: SMSResult[] = []
      let successful = 0
      let failed = 0
      for (const msg of messages) {
        try {
          const result = await this.send(msg.to, msg.message, msg.options)
          results.push(result)
          if (result.status === 'failed') {
            failed += 1
          } else {
            successful += 1
          }
        } catch (_error) {
          // The failed delivery is already recorded (status 'failed') by
          // send()'s capture path; here it becomes a failed result entry so
          // the rest of the batch still goes out.
          results.push({ id: '', status: 'failed', to: msg.to })
          failed += 1
        }
      }
      return {
        results,
        total: messages.length,
        successful,
        failed,
      }
    },

    async getStatus(messageId: string): Promise<SMSStatus> {
      if (realProvider) {
        return realProvider.getStatus(messageId)
      }
      return { id: messageId, status: 'sent' }
    },
  }
}

/** Default SMS capture provider (intercept-only). */
export const provider: SMSProvider = createSMSCaptureProvider()
