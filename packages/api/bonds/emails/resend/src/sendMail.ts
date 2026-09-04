/**
 * Resend email sending functionality.
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
import { configNotConfiguredError } from '@molecule/api-secrets'

import { getClient } from './transport.js'
import type { ResendAttachment, ResendSendRequest } from './types.js'

const logger = getLogger()

/** A single address or a list of addresses, as the core's message fields allow. */
type AddressField = string | EmailAddress | (string | EmailAddress)[]

/** Display-name characters RFC 5322 allows unquoted (atext plus space). */
const UNQUOTED_NAME = /^[A-Za-z0-9 !#$%&'*+\-/=?^_`{|}~.]*$/

/**
 * Format one address the way Resend expects: a bare address, or
 * `Name <address>`. The display name is quoted when it holds characters that
 * would otherwise parse as address syntax (`,`, `<`, `"`, non-ASCII), and any
 * CR/LF in it is collapsed so a display name can never inject a header.
 * @param addr - A string email address or an `EmailAddress` object with name and address.
 * @returns The address string for the request body.
 */
function formatAddress(addr: string | EmailAddress): string {
  if (typeof addr === 'string') return addr
  const name = addr.name?.replace(/[\r\n]+/g, ' ').trim()
  if (!name) return addr.address
  const display = UNQUOTED_NAME.test(name) ? name : `"${name.replace(/(["\\])/g, '\\$1')}"`
  return `${display} <${addr.address}>`
}

/**
 * Normalize a recipient field (single or array) to Resend's list of address strings.
 * @param field - A single address or array of addresses (string or `EmailAddress`).
 * @returns The formatted address strings.
 */
function toList(field: AddressField): string[] {
  return (Array.isArray(field) ? field : [field]).map(formatAddress)
}

/**
 * Extract plain email strings from a recipient field.
 * @param field - A single address or array of addresses (string or `EmailAddress`).
 * @returns An array of plain email strings.
 */
function extractEmails(field: AddressField): string[] {
  return (Array.isArray(field) ? field : [field]).map((a) =>
    typeof a === 'string' ? a : a.address,
  )
}

/**
 * Resolve the sender: the message's own `from` when it names an address,
 * otherwise the `RESEND_FROM` default. Neither → a tagged config-missing error,
 * because Resend refuses a send whose `from` is not on a verified domain and
 * the fix is configuration, not code.
 * @param from - The message's `from` field.
 * @returns The sender string for the request body.
 * @throws {Error} A tagged config-missing error (503 / `config.notConfigured`) naming `RESEND_FROM`.
 */
function resolveFrom(from: string | EmailAddress | undefined): string {
  if (from !== undefined) {
    const address = typeof from === 'string' ? from : from.address
    if (address.trim()) return formatAddress(from)
  }
  const fallback = process.env.RESEND_FROM?.trim()
  if (fallback) return fallback
  throw configNotConfiguredError('RESEND_FROM', 'email sending')
}

/**
 * Convert molecule attachments to Resend's attachment format (base64 content).
 * @param attachments - The molecule email attachments to convert.
 * @returns The Resend-format attachments.
 * @throws {Error} When an attachment's content is a stream.
 */
function toResendAttachments(attachments: EmailAttachment[]): ResendAttachment[] {
  return attachments.map((att) => {
    let content: string
    if (Buffer.isBuffer(att.content)) {
      content = att.content.toString('base64')
    } else if (typeof att.content === 'string') {
      const encoding = att.encoding && Buffer.isEncoding(att.encoding) ? att.encoding : 'utf-8'
      content = Buffer.from(att.content, encoding).toString('base64')
    } else {
      throw new Error('Stream attachments are not supported by the Resend provider')
    }

    return {
      content,
      filename: att.filename,
      ...(att.contentType ? { content_type: att.contentType } : {}),
      ...(att.cid ? { content_id: att.cid } : {}),
    }
  })
}

/**
 * Sends an email through the Resend API.
 *
 * @param message - The email message (to, from, subject, text/html, attachments).
 * @returns Send result with accepted addresses, message ID, and status code.
 */
export const sendMail = async (message: EmailMessage): Promise<EmailSendResult> => {
  if (!process.env.RESEND_API_KEY) {
    // Tagged config-missing error → the API middleware returns a clean 503 +
    // 'config.notConfigured', and the message carries the registered
    // definition's description + setup URL. Without this guard the request
    // would go out unauthenticated and the caller would get an opaque Resend
    // 401 that reads like a bad key rather than a missing one.
    throw configNotConfiguredError('RESEND_API_KEY', 'email sending')
  }
  // Also outside the try: a missing sender is a config condition to surface
  // as-is, not an error to log.
  const from = resolveFrom(message.from)
  try {
    const request: ResendSendRequest = {
      from,
      to: toList(message.to),
      subject: message.subject,
      ...(message.text ? { text: message.text } : {}),
      ...(message.html ? { html: message.html } : {}),
    }

    const cc = message.cc ? toList(message.cc) : []
    if (cc.length) request.cc = cc
    const bcc = message.bcc ? toList(message.bcc) : []
    if (bcc.length) request.bcc = bcc
    if (message.replyTo) request.reply_to = formatAddress(message.replyTo)
    if (message.attachments?.length) request.attachments = toResendAttachments(message.attachments)

    // The client reads the API key / base URL from the environment on each
    // send (honors late-resolved secrets).
    const { status, id } = await getClient().send(request)

    return {
      accepted: extractEmails(message.to),
      rejected: [],
      messageId: id,
      response: String(status),
    }
  } catch (error) {
    logger.error('Resend sendMail error:', error)
    throw error
  }
}
