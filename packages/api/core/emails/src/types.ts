/**
 * Email core types for molecule.dev.
 *
 * @module
 */

/**
 * Email address with optional display name.
 */
export interface EmailAddress {
  name?: string
  address: string
}

/**
 * Email file attachment (filename, content as string/Buffer/stream, MIME type, optional CID for inline).
 */
export interface EmailAttachment {
  filename: string
  content: string | Buffer | NodeJS.ReadableStream
  contentType?: string
  encoding?: string
  cid?: string
}

/**
 * Email message options.
 */
export interface EmailMessage {
  /**
   * Sender address.
   */
  from: string | EmailAddress

  /**
   * Recipient(s).
   */
  to: string | EmailAddress | (string | EmailAddress)[]

  /**
   * CC recipient(s).
   */
  cc?: string | EmailAddress | (string | EmailAddress)[]

  /**
   * BCC recipient(s).
   */
  bcc?: string | EmailAddress | (string | EmailAddress)[]

  /**
   * Reply-to address.
   */
  replyTo?: string | EmailAddress

  /**
   * Email subject.
   */
  subject: string

  /**
   * Plain text body.
   */
  text?: string

  /**
   * HTML body.
   */
  html?: string

  /**
   * File attachments.
   */
  attachments?: EmailAttachment[]

  /**
   * i18n key for the subject (for client-side translation).
   */
  subjectKey?: string

  /**
   * i18n key for the plain text body (for client-side translation).
   */
  textKey?: string

  /**
   * i18n key for the HTML body (for client-side translation).
   */
  htmlKey?: string
}

/**
 * Result of sending an email.
 */
export interface EmailSendResult {
  /**
   * Whether the email was accepted for delivery.
   */
  accepted: string[]

  /**
   * Addresses that were rejected.
   */
  rejected: string[]

  /**
   * Message ID from the provider.
   */
  messageId?: string

  /**
   * Raw response from the provider.
   */
  response?: string
}

/**
 * Email transport interface.
 *
 * All email providers must implement this interface.
 */
export interface EmailTransport {
  /**
   * Sends an email message.
   * @returns The send result.
   */
  sendMail(message: EmailMessage): Promise<EmailSendResult>
}
