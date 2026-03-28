/**
 * Twilio implementation of the molecule SMSProvider interface.
 *
 * Wraps the Twilio REST API to provide SMS send, bulk send, and
 * delivery status capabilities conforming to `@molecule/api-sms`.
 *
 * @module
 */

import Twilio from 'twilio'
import type { MessageListInstanceCreateOptions } from 'twilio/lib/rest/api/v2010/account/message.js'

import type {
  BulkSMSMessage,
  BulkSMSResult,
  SMSOptions,
  SMSProvider,
  SMSResult,
  SMSStatus,
} from '@molecule/api-sms'

import type { TwilioSMSConfig } from './types.js'

/**
 * Maps Twilio message status strings to normalised molecule SMS statuses.
 *
 * @param twilioStatus - The status string returned by the Twilio API.
 * @returns The normalised molecule SMS status.
 */
function normaliseTwilioStatus(twilioStatus: string): SMSStatus['status'] {
  switch (twilioStatus) {
    case 'queued':
    case 'accepted':
      return 'queued'
    case 'sending':
    case 'sent':
      return 'sent'
    case 'delivered':
      return 'delivered'
    case 'failed':
    case 'undelivered':
      return 'failed'
    default:
      return 'queued'
  }
}

/**
 * Creates a Twilio-backed {@link SMSProvider}.
 *
 * @param config - Twilio provider configuration. Falls back to environment
 *   variables when individual fields are omitted.
 * @returns A fully initialised `SMSProvider` backed by Twilio.
 */
export function createProvider(config: TwilioSMSConfig = {}): SMSProvider {
  const accountSid = config.accountSid ?? process.env.TWILIO_ACCOUNT_SID
  const authToken = config.authToken ?? process.env.TWILIO_AUTH_TOKEN
  const defaultFrom = config.defaultFrom ?? process.env.TWILIO_FROM_NUMBER

  if (!accountSid) {
    throw new Error('Twilio accountSid is required. Set config.accountSid or TWILIO_ACCOUNT_SID.')
  }

  if (!authToken) {
    throw new Error('Twilio authToken is required. Set config.authToken or TWILIO_AUTH_TOKEN.')
  }

  const client = Twilio(accountSid, authToken)

  const provider: SMSProvider = {
    async send(to: string, message: string, options?: SMSOptions): Promise<SMSResult> {
      const from = options?.from ?? defaultFrom
      if (!from) {
        throw new Error(
          'SMS sender number is required. Set config.defaultFrom, TWILIO_FROM_NUMBER, or options.from.',
        )
      }

      const params: MessageListInstanceCreateOptions = {
        to,
        from,
        body: message,
      }

      if (options?.scheduledAt) {
        params.sendAt = options.scheduledAt
        params.scheduleType = 'fixed'
      }

      if (options?.callbackUrl) {
        params.statusCallback = options.callbackUrl
      }

      const result = await client.messages.create(params)

      return {
        id: result.sid,
        status: normaliseTwilioStatus(result.status),
        to: result.to,
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
      const message = await client.messages(messageId).fetch()

      const status: SMSStatus = {
        id: message.sid,
        status: normaliseTwilioStatus(message.status),
      }

      if (message.dateUpdated) {
        status.deliveredAt = message.dateUpdated
      }

      if (message.errorMessage) {
        status.error = message.errorMessage
      }

      return status
    },
  }

  return provider
}
