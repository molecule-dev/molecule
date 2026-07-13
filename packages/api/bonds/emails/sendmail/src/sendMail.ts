/**
 * Sendmail email sending functionality.
 *
 * @module
 */

import type nodemailer from 'nodemailer'

import { getLogger } from '@molecule/api-bond'
import type { EmailMessage, EmailSendResult } from '@molecule/api-emails'

import { nodemailerTransport } from './transport.js'

const logger = getLogger()

/**
 * Sends an email using the local sendmail binary via nodemailer.
 *
 * @param message - The email message (to, from, subject, text/html, attachments).
 * @returns Send result with accepted/rejected addresses and message ID.
 */
export const sendMail = async (message: EmailMessage): Promise<EmailSendResult> => {
  try {
    const result = await nodemailerTransport.sendMail(message as nodemailer.SendMailOptions)

    return {
      // nodemailer's sendmail transport resolves with `{ envelope, messageId,
      // response }` — it NEVER sets `accepted`/`rejected` (only the SMTP
      // transports do; the @types/nodemailer SentMessageInfo claiming otherwise
      // is type-level drift). Once the binary exits 0 the message is queued for
      // every envelope recipient, so map `envelope.to` to `accepted` — without
      // this, every successful send reported `accepted: []` and callers gating
      // on "was my recipient accepted?" concluded delivery failed.
      accepted: (result.accepted ?? result.envelope?.to ?? []) as string[],
      rejected: (result.rejected ?? []) as string[],
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    logger.error('Sendmail sendMail error:', error)
    throw error
  }
}
