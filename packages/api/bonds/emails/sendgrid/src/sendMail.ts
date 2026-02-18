/**
 * SendGrid email sending functionality.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  EmailAddress,
  EmailAttachment,
  EmailMessage,
  EmailSendResult,
} from '@molecule/api-emails'

import { sgClient } from './transport.js'

const logger = getLogger()

/**
 * Normalize an address field to the format SendGrid expects.
 * @param addr - A string email address or an `EmailAddress` object with name and address.
 * @returns A SendGrid-compatible address object.
 */
function toSgAddress(addr: string | EmailAddress): { email: string; name?: string } {
  if (typeof addr === 'string') return { email: addr }
  return { email: addr.address, name: addr.name }
}

/**
 * Normalize a recipient field (single or array) to an array of SendGrid addresses.
 * @param field - A single address or array of addresses (string or `EmailAddress`).
 * @returns An array of SendGrid-compatible address objects.
 */
function toSgRecipients(
  field: string | EmailAddress | (string | EmailAddress)[],
): { email: string; name?: string }[] {
  const arr = Array.isArray(field) ? field : [field]
  return arr.map(toSgAddress)
}

/**
 * Extract plain email strings from a recipient field.
 * @param field - A single address or array of addresses (string or `EmailAddress`).
 * @returns An array of plain email strings.
 */
function extractEmails(field: string | EmailAddress | (string | EmailAddress)[]): string[] {
  const arr = Array.isArray(field) ? field : [field]
  return arr.map((a) => (typeof a === 'string' ? a : a.address))
}

/**
 * Convert molecule attachments to SendGrid attachment format.
 * @param attachments - The molecule email attachments to convert.
 * @returns An array of SendGrid-format attachments with base64-encoded content.
 */
function toSgAttachments(attachments: EmailAttachment[]): {
  content: string
  filename: string
  type?: string
  disposition?: string
  contentId?: string
}[] {
  return attachments.map((att) => {
    let content: string
    if (Buffer.isBuffer(att.content)) {
      content = att.content.toString('base64')
    } else if (typeof att.content === 'string') {
      content = Buffer.from(att.content, (att.encoding as BufferEncoding) ?? 'utf-8').toString(
        'base64',
      )
    } else {
      throw new Error('Stream attachments are not supported by the SendGrid provider')
    }

    return {
      content,
      filename: att.filename,
      type: att.contentType,
      disposition: att.cid ? 'inline' : 'attachment',
      contentId: att.cid,
    }
  })
}

/**
 * Sends an email through the SendGrid API.
 *
 * @param message - The email message (to, from, subject, text/html, attachments).
 * @returns Send result with accepted addresses, message ID, and status code.
 */
export const sendMail = async (message: EmailMessage): Promise<EmailSendResult> => {
  try {
    const msg: Record<string, unknown> = {
      to: toSgRecipients(message.to),
      from: toSgAddress(message.from),
      subject: message.subject,
      ...(message.text ? { text: message.text } : {}),
      ...(message.html ? { html: message.html } : {}),
    }

    if (message.cc) msg.cc = toSgRecipients(message.cc)
    if (message.bcc) msg.bcc = toSgRecipients(message.bcc)
    if (message.replyTo) msg.replyTo = toSgAddress(message.replyTo)
    if (message.attachments?.length) msg.attachments = toSgAttachments(message.attachments)

    const [response] = await sgClient.send(msg as unknown as Parameters<typeof sgClient.send>[0])

    return {
      accepted: extractEmails(message.to),
      rejected: [],
      messageId: (response.headers?.['x-message-id'] as string) ?? undefined,
      response: String(response.statusCode),
    }
  } catch (error) {
    logger.error('SendGrid sendMail error:', error)
    throw error
  }
}
