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
      accepted: (result.accepted || []) as string[],
      rejected: (result.rejected || []) as string[],
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    logger.error('Sendmail sendMail error:', error)
    throw error
  }
}
