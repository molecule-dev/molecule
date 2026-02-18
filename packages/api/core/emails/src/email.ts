/**
 * Email sending convenience function that delegates to the bonded transport.
 *
 * @module
 */

import { getTransport } from './provider.js'
import type { EmailMessage, EmailSendResult } from './types.js'

/**
 * Sends an email message using the bonded transport.
 *
 * @param message - The email message to send, including recipients, subject, and body.
 * @returns The send result containing accepted/rejected addresses and message ID.
 * @throws {Error} If no email transport has been bonded.
 */
export const sendMail = async (message: EmailMessage): Promise<EmailSendResult> => {
  return getTransport().sendMail(message)
}
