/**
 * Vonage implementation of the molecule SMSProvider interface.
 *
 * Wraps the Vonage SMS API to provide SMS send and bulk send capabilities
 * conforming to `@molecule/api-sms`.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import { Vonage } from '@vonage/server-sdk'

import type {
  BulkSMSMessage,
  BulkSMSResult,
  SMSOptions,
  SMSProvider,
  SMSResult,
  SMSStatus,
} from '@molecule/api-sms'

import type { VonageSMSConfig } from './types.js'

/**
 * Creates a Vonage-backed {@link SMSProvider}.
 *
 * Credential validation is DEFERRED to first use (send/sendBulk) rather
 * than thrown here — matching the slack/web-push bonds in this category.
 * An app that has selected Vonage but hasn't filled in its secrets yet can
 * still boot; only the first actual SMS attempt throws the actionable
 * "apiKey/apiSecret is required" error, instead of the whole API crashing
 * at `setProvider(createProvider())` startup time.
 *
 * @param config - Vonage provider configuration. Falls back to environment
 *   variables when individual fields are omitted.
 * @returns A fully initialised `SMSProvider` backed by Vonage.
 */
export function createProvider(config: VonageSMSConfig = {}): SMSProvider {
  const apiKey = config.apiKey ?? process.env.VONAGE_API_KEY
  const apiSecret = config.apiSecret ?? process.env.VONAGE_API_SECRET
  const defaultFrom = config.defaultFrom ?? process.env.VONAGE_FROM_NUMBER

  let vonage: Vonage | undefined

  /**
   * Lazily constructs (and memoises) the Vonage client, throwing the same
   * actionable error `createProvider()` used to throw eagerly — now
   * surfaced at first use instead of at bond time.
   *
   * @returns The memoised Vonage client.
   */
  function getClient(): Vonage {
    if (!apiKey) {
      throw new Error('Vonage apiKey is required. Set config.apiKey or VONAGE_API_KEY.')
    }
    if (!apiSecret) {
      throw new Error('Vonage apiSecret is required. Set config.apiSecret or VONAGE_API_SECRET.')
    }
    if (!vonage) {
      vonage = new Vonage({ apiKey, apiSecret })
    }
    return vonage
  }

  const provider: SMSProvider = {
    async send(to: string, message: string, options?: SMSOptions): Promise<SMSResult> {
      const vonage = getClient()

      const from = options?.from ?? defaultFrom
      if (!from) {
        throw new Error(
          'SMS sender number is required. Set config.defaultFrom, VONAGE_FROM_NUMBER, or options.from.',
        )
      }

      if (options?.scheduledAt) {
        throw new Error(
          'Vonage SMS API does not support scheduled sending. Use a job scheduler to delay dispatch.',
        )
      }

      const params: {
        to: string
        from: string
        text: string
        callback?: string
        statusReportReq?: boolean
      } = {
        to,
        from,
        text: message,
      }

      if (options?.callbackUrl) {
        params.callback = options.callbackUrl
        params.statusReportReq = true
      }

      let result
      try {
        result = await vonage.sms.send(params)
      } catch (error) {
        // The v3 SDK THROWS (MessageSendAllFailure) when Vonage rejects the
        // message — a plain `status !== '0'` never reaches this code. The
        // thrown message is just "All SMS messages failed to send", which for
        // a single send hides the actual reason (e.g. "Non-Whitelisted
        // Destination" on trial accounts). Surface the per-message error text
        // so callers can tell a bad destination from bad credentials.
        const failure = error as { response?: { messages?: Array<{ errorText?: string }> } }
        const errorText = failure.response?.messages?.[0]?.errorText
        if (errorText) {
          throw new Error(`Vonage rejected the SMS to ${to}: ${errorText}`, { cause: error })
        }
        throw error
      }
      const msg = result.messages[0]

      return {
        // The v3 SDK camelCases response keys at runtime (`messageId`), while
        // its response TYPE still declares the raw kebab-case `'message-id'`.
        // Read both so the id survives SDK-side normalization either way.
        id: msg.messageId ?? msg['message-id'] ?? '',
        status: msg.status === '0' ? 'queued' : 'failed',
        to: msg.to ?? to,
      }
    },

    async sendBulk(messages: BulkSMSMessage[]): Promise<BulkSMSResult> {
      const results: SMSResult[] = []
      let successful = 0
      let failed = 0

      for (const msg of messages) {
        try {
          const result = await provider.send(msg.to, msg.message, msg.options)
          results.push(result)
          if (result.status === 'failed') {
            failed += 1
          } else {
            successful += 1
          }
        } catch (_error) {
          // Individual send failure is captured as a failed result; bulk operation continues.
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
      void messageId
      throw new Error(
        'Vonage SMS API does not support message status polling. ' +
          'Use the callbackUrl option to receive delivery receipts via webhook.',
      )
    },
  }

  return provider
}
