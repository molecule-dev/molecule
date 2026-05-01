/**
 * Public types for `@molecule/api-smtp` — direct-SMTP send client.
 *
 * These are deliberately shaped as a thin, normalized surface over
 * nodemailer so consumers (handlers, queues, the email-client flagship)
 * never import nodemailer types directly. Swapping the underlying
 * library would only require changes inside `connectSmtp.ts`.
 *
 * @module
 */

/**
 * Password-style SMTP credentials.
 */
export interface SmtpPasswordAuth {
  /** SMTP username (often the full email address). */
  user: string

  /** SMTP password or app-specific password. */
  pass: string
}

/**
 * OAuth2 bearer-token SMTP credentials (e.g. Gmail XOAUTH2).
 */
export interface SmtpOAuth2Auth {
  /** Account email / SASL identity. */
  user: string

  /** Pre-fetched OAuth2 access token. */
  accessToken: string
}

/**
 * Connection + authentication parameters for {@link connectSmtp}.
 *
 * `auth` may be `null` for unauthenticated relays (rare — typically
 * only same-host development MTAs).
 */
export interface SmtpConfig {
  /** SMTP server hostname. */
  host: string

  /** SMTP server port — typically 465 (TLS), 587 (STARTTLS), or 25. */
  port: number

  /**
   * If `true`, use implicit TLS on connect (port 465 style). When
   * `false` or omitted, the connection starts plain and may upgrade
   * via STARTTLS depending on {@link SmtpConfig.requireTLS}.
   */
  secure?: boolean

  /**
   * Authentication credentials, or `null` for an unauthenticated
   * relay.
   */
  auth: SmtpPasswordAuth | SmtpOAuth2Auth | null

  /**
   * If `true`, refuse to send mail unless the connection has been
   * upgraded to TLS (via STARTTLS when `secure` is `false`). Defaults
   * to `false`.
   */
  requireTLS?: boolean

  /**
   * Connection timeout in milliseconds. Defaults to 30_000.
   */
  connectionTimeoutMs?: number

  /**
   * Socket idle timeout in milliseconds. Defaults to 30_000.
   */
  socketTimeoutMs?: number

  /**
   * Greeting timeout in milliseconds. Defaults to 30_000.
   */
  greetingTimeoutMs?: number
}

/**
 * One MIME attachment to be sent as part of an {@link SmtpMessage}.
 *
 * Either `content` (raw bytes / string) or `path` (filesystem path)
 * must be provided — never both.
 */
export interface SmtpAttachment {
  /** Filename shown to the recipient. */
  filename: string

  /**
   * Raw attachment content. Use this OR {@link SmtpAttachment.path},
   * not both.
   */
  content?: string | Buffer | Uint8Array

  /**
   * Path to a local file. Use this OR
   * {@link SmtpAttachment.content}, not both.
   */
  path?: string

  /**
   * Optional MIME type. If omitted, nodemailer infers from the
   * filename extension.
   */
  contentType?: string
}

/**
 * A single email message to send via {@link SmtpClient.sendMail}.
 *
 * Address fields accept either a single RFC-5322 address string or an
 * array of address strings — multi-recipient is the only field-level
 * variation the underlying library supports without bespoke parsing.
 */
export interface SmtpMessage {
  /** Sender address (`"Name <name@example.com>"` or just the address). */
  from: string

  /** Primary recipient address(es). */
  to: string | string[]

  /** Optional CC recipient address(es). */
  cc?: string | string[]

  /** Optional BCC recipient address(es). */
  bcc?: string | string[]

  /** Subject line — plain text, no encoding required. */
  subject: string

  /** Plain-text body. At least one of `text`/`html` should be set. */
  text?: string

  /** HTML body. At least one of `text`/`html` should be set. */
  html?: string

  /** Optional `Reply-To` address. */
  replyTo?: string

  /** Optional list of attachments. */
  attachments?: SmtpAttachment[]

  /**
   * Additional headers, keyed by header name. Values that are arrays
   * produce repeated headers (e.g. multiple `Received` headers).
   */
  headers?: Record<string, string | string[]>
}

/**
 * Result of a successful {@link SmtpClient.sendMail} call.
 */
export interface SendResult {
  /** RFC-5322 `Message-ID` of the queued message. */
  messageId: string

  /** Recipient addresses the server accepted. */
  accepted: string[]

  /** Recipient addresses the server rejected. */
  rejected: string[]

  /** Raw final SMTP response line (e.g. `"250 2.0.0 OK ..."`). */
  response: string
}

/**
 * Connected SMTP client. Created via {@link connectSmtp}.
 */
export interface SmtpClient {
  /**
   * Verify the connection / credentials by issuing a dry SMTP
   * handshake. Resolves on success, rejects with {@link SmtpError}
   * otherwise.
   */
  verify(): Promise<void>

  /**
   * Send a single mail message.
   *
   * @param message - Message to send.
   * @returns Normalized {@link SendResult}.
   * @throws {SmtpError} on connection / send failure.
   */
  sendMail(message: SmtpMessage): Promise<SendResult>

  /**
   * Close the connection pool and release sockets. Safe to call
   * multiple times.
   */
  disconnect(): Promise<void>
}

/**
 * Stable machine-readable error codes emitted by {@link SmtpError}.
 */
export type SmtpErrorCode =
  | 'invalid-config'
  | 'connection-failed'
  | 'auth-failed'
  | 'tls-required'
  | 'send-failed'
  | 'timeout'
  | 'disconnected'

/**
 * Error thrown by {@link connectSmtp} / {@link SmtpClient} methods.
 *
 * `code` is a stable machine-readable string; `message` is the
 * developer-facing English description (handler-error pattern — locale
 * bond not required for this utility).
 */
export class SmtpError extends Error {
  /** Stable error code. */
  public readonly code: SmtpErrorCode

  /**
   * SMTP response code from the upstream server, when the failure
   * came from a server-issued reply (e.g. `535` for auth failed).
   */
  public readonly responseCode?: number

  /**
   * Construct a new {@link SmtpError}.
   *
   * @param code - Stable error code.
   * @param message - Developer-facing English description.
   * @param responseCode - Optional SMTP response code from the server.
   */
  public constructor(code: SmtpErrorCode, message: string, responseCode?: number) {
    super(message)
    this.name = 'SmtpError'
    this.code = code
    this.responseCode = responseCode
  }
}
