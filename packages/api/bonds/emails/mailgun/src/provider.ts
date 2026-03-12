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
let _transport: nodemailer.Transporter | null = null

/**
 * Returns the lazily-initialized nodemailer transport configured with Mailgun credentials.
 * @returns The nodemailer `Transporter` instance.
 */
function getTransport(): nodemailer.Transporter {
  if (!_transport) {
    const apiKey = process.env.MAILGUN_API_KEY
    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY is not set. Email sending will not work.')
    }
    const domain = process.env.MAILGUN_DOMAIN
    if (!domain) {
      throw new Error('MAILGUN_DOMAIN is not set. Email sending will not work.')
    }
    _transport = nodemailer.createTransport(
      mailgun({
        auth: {
          api_key: apiKey,
          domain,
        },
      }),
    )
  }
  return _transport
}

/**
 * Sends an email through the Mailgun API via nodemailer.
 *
 * @param message - The email message (to, from, subject, text/html, attachments).
 * @returns Send result with accepted/rejected addresses and message ID.
 */
export const sendMail = async (message: EmailMessage): Promise<EmailSendResult> => {
  try {
    const result = await getTransport().sendMail(message as nodemailer.SendMailOptions)

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
export const transport = {
  sendMail: (msg: nodemailer.SendMailOptions) => getTransport().sendMail(msg),
}

/**
 * Raw nodemailer transport alias.
 * @deprecated Use `sendMail()` or `provider` instead.
 */
export const email = transport
