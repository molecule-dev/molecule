/**
 * Mailgun email provider implementation.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://www.npmjs.com/package/nodemailer-mailgun-transport
 *
 * @module
 */

import nodemailer from 'nodemailer'
import mailgun from 'nodemailer-mailgun-transport'

import { getLogger } from '@molecule/api-bond'
import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

const logger = getLogger()

/**
 * The underlying nodemailer transport.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://www.npmjs.com/package/nodemailer-mailgun-transport
 */
const nodemailerTransport = nodemailer.createTransport(
  mailgun({
    auth: {
      api_key: process.env.MAILGUN_API_KEY || `bogus-key-to-prevent-app-from-crashing`,
      domain: process.env.MAILGUN_DOMAIN,
    },
  }),
)

/**
 * Sends an email through the Mailgun API via nodemailer.
 *
 * @param message - The email message (to, from, subject, text/html, attachments).
 * @returns Send result with accepted/rejected addresses and message ID.
 */
export const sendMail = async (message: EmailMessage): Promise<EmailSendResult> => {
  try {
    const result = await nodemailerTransport.sendMail(message as nodemailer.SendMailOptions)

    return {
      accepted: (result.accepted || []) as string[],
      rejected: (result.rejected || []) as string[],
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    logger.error('Mailgun sendMail error:', error)
    throw error
  }
}

/**
 * The Mailgun email provider implementing the `EmailTransport` interface.
 */
export const provider: EmailTransport = {
  sendMail,
}

/**
 * Raw nodemailer transport for direct access.
 * @deprecated Use `sendMail()` or `provider` instead.
 */
export const transport = nodemailerTransport

/**
 * Raw nodemailer transport alias.
 * @deprecated Use `sendMail()` or `provider` instead.
 */
export const email = nodemailerTransport
