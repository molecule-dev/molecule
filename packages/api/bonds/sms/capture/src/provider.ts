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
            status: 'sent',
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
      const results: SMSResult[] = []
      for (const msg of messages) {
        results.push(await this.send(msg.to, msg.message, msg.options))
      }
      return {
        results,
        total: results.length,
        successful: results.length,
        failed: 0,
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
