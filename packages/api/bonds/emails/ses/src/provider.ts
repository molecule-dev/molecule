/**
 * AWS SES email provider implementation.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://aws.amazon.com/ses/
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import nodemailer from 'nodemailer'

import { getLogger } from '@molecule/api-bond'
import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

const logger = getLogger()

/**
 * The AWS SESv2 client instance, configured from `AWS_SES_REGION`. An optional
 * `AWS_SES_ENDPOINT` overrides the service endpoint (for a credential broker or
 * a self-hosted / SES-compatible service). When unset, the SDK resolves the
 * default regional endpoint, so behaviour is unchanged.
 *
 * nodemailer 7 requires the SESv2 client + SendEmailCommand pair — the old
 * `{ ses, aws }` (@aws-sdk/client-ses) shape made `createTransport` THROW at
 * import time ("legacy SES configuration"), breaking every real consumer of
 * this bond.
 */
export const ses = new SESv2Client({
  region: process.env.AWS_SES_REGION || 'us-east-1',
  credentialDefaultProvider: defaultProvider,
  ...(process.env.AWS_SES_ENDPOINT ? { endpoint: process.env.AWS_SES_ENDPOINT } : {}),
})

/**
 * The underlying nodemailer transport (nodemailer 7 SESv2 shape).
 *
 * @see https://www.npmjs.com/package/nodemailer
 */
const nodemailerTransport = nodemailer.createTransport({
  SES: { sesClient: ses, SendEmailCommand },
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
