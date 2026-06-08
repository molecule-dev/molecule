/**
 * Connection factory for the direct-SMTP send client.
 *
 * Wraps `nodemailer.createTransport` so callers never depend on
 * nodemailer types directly. Errors raised by the transport are
 * normalized into {@link SmtpError} with stable codes so handler /
 * UI layers can map them to translated user-facing messages.
 *
 * @module
 */

import nodemailer, { type Transporter } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js'

import {
  type SendResult,
  type SmtpClient,
  type SmtpConfig,
  SmtpError,
  type SmtpErrorCode,
  type SmtpMessage,
} from './types.js'

/**
 * Optional injection point used by tests to swap in a fake nodemailer
 * implementation. Production callers never need this.
 *
 * @internal
 */
export interface ConnectSmtpInternals {
  /**
   * Replacement for `nodemailer.createTransport`. Must return a
   * minimal `Transporter`-compatible object with `verify`,
   * `sendMail`, and `close` methods.
   */
  createTransport?: (
    options: SMTPTransport.Options,
  ) => Pick<Transporter<SMTPTransport.SentMessageInfo>, 'verify' | 'sendMail' | 'close'>
}

/**
 * Validate {@link SmtpConfig} shape — surfaces obvious misuse before
 * we hit the network. Throws {@link SmtpError} with code
 * `'invalid-config'` on any structural problem.
 *
 * @param config - Caller-supplied config.
 */
function validateConfig(config: SmtpConfig): void {
  if (!config || typeof config !== 'object') {
    throw new SmtpError('invalid-config', 'SmtpConfig is required')
  }
  if (typeof config.host !== 'string' || config.host.length === 0) {
    throw new SmtpError('invalid-config', 'SmtpConfig.host must be a non-empty string')
  }
  if (typeof config.port !== 'number' || !Number.isFinite(config.port) || config.port <= 0) {
    throw new SmtpError('invalid-config', 'SmtpConfig.port must be a positive number')
  }
  if (config.auth !== null && config.auth !== undefined) {
    if (typeof config.auth !== 'object') {
      throw new SmtpError('invalid-config', 'SmtpConfig.auth must be an object or null')
    }
    if (typeof (config.auth as { user?: unknown }).user !== 'string') {
      throw new SmtpError('invalid-config', 'SmtpConfig.auth.user must be a string')
    }
    const hasPass = typeof (config.auth as { pass?: unknown }).pass === 'string'
    const hasToken = typeof (config.auth as { accessToken?: unknown }).accessToken === 'string'
    if (!hasPass && !hasToken) {
      throw new SmtpError(
        'invalid-config',
        'SmtpConfig.auth requires either `pass` or `accessToken`',
      )
    }
  }
}

/**
 * Translate a nodemailer transport error into a normalized
 * {@link SmtpError}.
 *
 * @param err - Error raised by nodemailer.
 * @param fallbackCode - Code to use when the error is not recognized.
 * @returns Normalized {@link SmtpError}.
 */
function normalizeError(err: unknown, fallbackCode: SmtpErrorCode): SmtpError {
  if (err instanceof SmtpError) return err
  const candidate = err as {
    code?: string
    responseCode?: number
    message?: string
    command?: string
  }
  const message = candidate?.message ?? 'SMTP error'
  const responseCode = candidate?.responseCode

  // Auth failures: nodemailer surfaces these via response codes 535,
  // 530 and a 'EAUTH' code on the error object.
  if (candidate?.code === 'EAUTH' || responseCode === 535 || responseCode === 530) {
    return new SmtpError('auth-failed', message, responseCode)
  }

  // Connection-level failures.
  if (
    candidate?.code === 'ECONNECTION' ||
    candidate?.code === 'ECONNREFUSED' ||
    candidate?.code === 'ENOTFOUND' ||
    candidate?.code === 'EDNS' ||
    candidate?.code === 'ESOCKET'
  ) {
    return new SmtpError('connection-failed', message, responseCode)
  }

  if (candidate?.code === 'ETIMEDOUT' || candidate?.code === 'ETIME') {
    return new SmtpError('timeout', message, responseCode)
  }

  if (candidate?.code === 'ETLS' || /STARTTLS/i.test(message)) {
    return new SmtpError('tls-required', message, responseCode)
  }

  return new SmtpError(fallbackCode, message, responseCode)
}

/**
 * Build the nodemailer transport options from a {@link SmtpConfig}.
 *
 * Kept as a pure function so the test suite can assert the exact
 * shape we hand to nodemailer (and therefore confirm we never leak
 * caller credentials beyond what is necessary).
 *
 * @param config - Validated config.
 * @returns Options for `nodemailer.createTransport`.
 */
export function buildTransportOptions(config: SmtpConfig): SMTPTransport.Options {
  const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure === true,
    requireTLS: config.requireTLS === true,
    connectionTimeout: config.connectionTimeoutMs ?? 30_000,
    socketTimeout: config.socketTimeoutMs ?? 30_000,
    greetingTimeout: config.greetingTimeoutMs ?? 30_000,
  }

  if (config.auth !== null && config.auth !== undefined) {
    if ('accessToken' in config.auth) {
      options.auth = {
        type: 'OAuth2',
        user: config.auth.user,
        accessToken: config.auth.accessToken,
      }
    } else {
      options.auth = {
        user: config.auth.user,
        pass: config.auth.pass,
      }
    }
  }

  return options
}

/**
 * Convert a {@link SmtpMessage} into nodemailer's `SendMailOptions`.
 *
 * @param message - Caller-supplied message.
 * @returns Options for `transporter.sendMail`.
 */
function toSendMailOptions(message: SmtpMessage): Parameters<Transporter['sendMail']>[0] {
  return {
    from: message.from,
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: message.replyTo,
    attachments: message.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content:
        attachment.content instanceof Uint8Array && !Buffer.isBuffer(attachment.content)
          ? Buffer.from(
              attachment.content.buffer,
              attachment.content.byteOffset,
              attachment.content.byteLength,
            )
          : attachment.content,
      path: attachment.path,
      contentType: attachment.contentType,
    })),
    headers: message.headers,
  }
}

/**
 * Connect to a user-supplied SMTP server and return a normalized
 * {@link SmtpClient} bound to it.
 *
 * The returned client wraps a single nodemailer transporter — it is
 * safe to keep the client around for multiple `sendMail` calls and
 * to share between concurrent senders.
 *
 * @param config - SMTP connection + auth config.
 * @param internals - Optional test-only injection point.
 * @returns Connected {@link SmtpClient}.
 * @throws {SmtpError} on invalid config.
 *
 * @example
 * ```ts
 * import { connectSmtp } from '@molecule/api-smtp'
 *
 * const client = await connectSmtp({
 *   host: 'smtp.example.com',
 *   port: 587,
 *   secure: false,
 *   requireTLS: true,
 *   auth: { user: 'me@example.com', pass: 'app-password' },
 * })
 *
 * await client.verify()
 * const result = await client.sendMail({
 *   from: 'me@example.com',
 *   to: 'friend@example.com',
 *   subject: 'hi',
 *   text: 'hello world',
 * })
 * await client.disconnect()
 * ```
 */
export async function connectSmtp(
  config: SmtpConfig,
  internals: ConnectSmtpInternals = {},
): Promise<SmtpClient> {
  validateConfig(config)

  const create = internals.createTransport ?? nodemailer.createTransport
  const options = buildTransportOptions(config)
  const transporter = create(options)

  return {
    async verify() {
      try {
        await transporter.verify()
      } catch (err) {
        throw normalizeError(err, 'connection-failed')
      }
    },

    async sendMail(message: SmtpMessage): Promise<SendResult> {
      let info: SMTPTransport.SentMessageInfo
      try {
        info = (await transporter.sendMail(
          toSendMailOptions(message),
        )) as SMTPTransport.SentMessageInfo
      } catch (err) {
        throw normalizeError(err, 'send-failed')
      }

      return {
        messageId: info.messageId ?? '',
        accepted: (info.accepted ?? []).map((address) =>
          typeof address === 'string' ? address : (address as { address: string }).address,
        ),
        rejected: (info.rejected ?? []).map((address) =>
          typeof address === 'string' ? address : (address as { address: string }).address,
        ),
        response: info.response ?? '',
      }
    },

    async disconnect() {
      try {
        transporter.close?.()
      } catch (err) {
        throw normalizeError(err, 'disconnected')
      }
    },
  }
}
