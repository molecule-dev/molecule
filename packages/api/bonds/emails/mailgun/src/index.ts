/**
 * Mailgun email provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://www.npmjs.com/package/nodemailer-mailgun-transport
 *
 * @remarks
 * - **Bond it with the emails core's `setTransport(provider)`** — not `setProvider` and not
 *   `bond('emails-mailgun', ...)` — then send with the core's `sendMail()`. There is no
 *   `createTransport()` export.
 * - **EU-region Mailgun accounts must set `MAILGUN_API_HOST=api.eu.mailgun.net`**
 *   (optional env; defaults to Mailgun's US endpoint). Without it every send
 *   fails upstream with 401 even though the key is valid — wrong region, not
 *   wrong key.
 * - **Sandbox domains auto-enable Mailgun test mode**: when `MAILGUN_DOMAIN`
 *   matches `sandbox*.mailgun.org` (or `MAILGUN_TEST_MODE=true`), sends carry
 *   `o:testmode=yes` — Mailgun accepts, validates, and assigns a message id
 *   but NEVER delivers. A sandbox 403 for an unauthorized recipient is
 *   reported as a synthetic success (`response: 'sandbox-test-mode'`). "Send
 *   succeeded but no email arrived" in dev is this behavior, not a bug.
 * - Credentials are read lazily on first send and fail fast with a tagged
 *   `config.notConfigured` error naming the missing key (`MAILGUN_API_KEY`,
 *   then `MAILGUN_DOMAIN`). On success `accepted` echoes the message's own
 *   recipients (Mailgun's transport returns no per-recipient verdict).
 * - **The `from` address's domain must equal `MAILGUN_DOMAIN`** (Mailgun sends
 *   through, and signs SPF/DKIM for, that verified domain). A `from` on any other
 *   domain — a hardcoded `noreply@example.com`, `noreply@store.com`, etc. — is
 *   rejected or unsigned (spam). Default the sender to the sending domain:
 *   `` process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN}` `` — never
 *   a literal placeholder domain.
 *
 * @example
 * ```typescript
 * import { sendMail, setTransport } from '@molecule/api-emails'
 * import { provider as mailgun } from '@molecule/api-emails-mailgun'
 *
 * // Startup: bond once. Env: MAILGUN_API_KEY, MAILGUN_DOMAIN (the verified sending domain),
 * // and MAILGUN_API_HOST=api.eu.mailgun.net for EU-region accounts.
 * setTransport(mailgun)
 *
 * const result = await sendMail({
 *   // The sender MUST be on MAILGUN_DOMAIN.
 *   from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN}`,
 *   to: 'ada@example.com',
 *   subject: 'Welcome to Acme',
 *   text: 'Thanks for signing up!',
 *   html: '<p>Thanks for signing up!</p>',
 * })
 * // { accepted: ['ada@example.com'], rejected: [], messageId: '<…@mg.example.com>', response: 'Queued. Thank you.' }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
