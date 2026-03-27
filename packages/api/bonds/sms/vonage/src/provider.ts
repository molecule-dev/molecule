/**
 * Vonage implementation of the molecule SMSProvider interface.
 *
 * Wraps the Vonage SMS API to provide SMS send and bulk send capabilities
 * conforming to `@molecule/api-sms`.
 *
 * @module
 */

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
 * @param config - Vonage provider configuration. Falls back to environment
 *   variables when individual fields are omitted.
 * @returns A fully initialised `SMSProvider` backed by Vonage.
 */
export function createProvider(config: VonageSMSConfig = {}): SMSProvider {
  const apiKey = config.apiKey ?? process.env.VONAGE_API_KEY
  const apiSecret = config.apiSecret ?? process.env.VONAGE_API_SECRET
  const defaultFrom = config.defaultFrom ?? process.env.VONAGE_FROM_NUMBER

  if (!apiKey) {
    throw new Error('Vonage apiKey is required. Set config.apiKey or VONAGE_API_KEY.')
  }

  if (!apiSecret) {
    throw new Error('Vonage apiSecret is required. Set config.apiSecret or VONAGE_API_SECRET.')
  }

  const vonage = new Vonage({ apiKey, apiSecret })

  const provider: SMSProvider = {
    async send(to: string, message: string, options?: SMSOptions): Promise<SMSResult> {
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

      const result = await vonage.sms.send(params)
      const msg = result.messages[0]

      return {
        id: msg['message-id'] ?? '',
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
        } catch {
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
