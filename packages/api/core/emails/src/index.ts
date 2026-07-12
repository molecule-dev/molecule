/**
 * Email core interface for molecule.dev.
 *
 * Defines the standard interface for email providers.
 *
 * @remarks
 * Send through {@link sendMail} (the bonded transport) — never hardcode SMTP creds or an API
 * key; they come from config/secrets and stay SERVER-SIDE.
 *
 * - **Validate the recipient; never inject user input into headers.** A newline/CRLF in a
 *   user-supplied `to`/`from`/`subject` is header injection (silent BCCs, spoofed headers) —
 *   validate the address and strip control characters; don't let a user set arbitrary headers.
 * - **Don't build an open relay.** Send account emails to the AUTHENTICATED user's OWN
 *   address, not to whatever address a request names — an endpoint that emails any address on
 *   demand is a spam/abuse vector. Require auth and rate-limit it.
 * - **Never put a secret in the body/subject.** A password reset is a single-use LINK, not
 *   the raw token/secret; don't leak internal errors or stack traces into email content.
 *
 * @example
 * ```ts
 * import { sendMail } from '@molecule/api-emails'
 *
 * // Account email → the authenticated user's OWN address (not a client-named one).
 * await sendMail({
 *   from: 'no-reply@myapp.com',
 *   to: user.email, // validated, owned by the session
 *   subject: 'Reset your password',
 *   html: `<a href="${resetLink}">Reset</a>`, // a single-use link, not the raw token
 * })
 * ```
 *
 * @module
 */

export * from './email.js'
export * from './provider.js'
export * from './types.js'
