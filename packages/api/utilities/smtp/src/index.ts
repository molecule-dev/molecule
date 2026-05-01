/**
 * Direct SMTP send client for molecule.dev.
 *
 * Sends mail through a **user-supplied** SMTP server (host, port,
 * credentials owned by the end-user — for example, the email-client
 * flagship app where each user signs in to their own mailbox). This
 * is intentionally distinct from the `@molecule/api-emails-*` bonds,
 * which wrap **transactional** providers like Mailgun, SendGrid, and
 * SES that send mail on the application's behalf.
 *
 * Wraps `nodemailer` so consumers never import nodemailer types
 * directly — swapping the underlying library would only require
 * changes inside this package.
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
 *
 * @remarks
 * Throws {@link SmtpError} (`error.code` is one of `invalid-config`,
 * `connection-failed`, `auth-failed`, `tls-required`, `send-failed`,
 * `timeout`, `disconnected`). Map `error.code` to translated
 * user-facing text in the calling handler — this utility intentionally
 * has no locale bond (handler-error pattern).
 *
 * @module
 */

export * from './connect.js'
export * from './types.js'
