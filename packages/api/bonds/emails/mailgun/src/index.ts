/**
 * Mailgun email provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://www.npmjs.com/package/nodemailer-mailgun-transport
 *
 * @remarks
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
 *
 * @example
 * ```typescript
 * import { setTransport } from '@molecule/api-emails'
 * import { provider } from '@molecule/api-emails-mailgun'
 *
 * setTransport(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
