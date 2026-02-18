/**
 * AWS SES email provider implementation.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://aws.amazon.com/ses/
 *
 * @module
 */

import * as aws from '@aws-sdk/client-ses'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import nodemailer from 'nodemailer'

import { getLogger } from '@molecule/api-bond'
import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

const logger = getLogger()

/** The AWS SES client instance, configured from `AWS_SES_REGION` env var. */
export const ses = new aws.SESClient({
  region: process.env.AWS_SES_REGION || 'us-east-1',
  credentialDefaultProvider: defaultProvider,
})

/**
 * The underlying nodemailer transport.
 *
 * @see https://www.npmjs.com/package/nodemailer
 */
const nodemailerTransport = nodemailer.createTransport({
  SES: { ses, aws },
} as Parameters<typeof nodemailer.createTransport>[0])

/**
 * Sends an email through AWS SES via nodemailer.
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
    logger.error('SES sendMail error:', error)
    throw error
  }
}

/**
 * The SES email provider implementing the `EmailTransport` interface.
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
