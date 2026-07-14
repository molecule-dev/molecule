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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks; use the
 * dev/capture transport to inspect sent mail), adapt each item to this app's
 * actual screens/flows, and check every box off one by one. A box you can't
 * check is an integration bug to fix — not a skip:
 * - [ ] Each email-triggering flow (signup verification, password-reset request,
 *   invites/notifications the app defines) confirms the send in the UI ("check
 *   your inbox") and a message actually reaches the transport.
 * - [ ] The password-reset round-trip completes: request a reset → open the
 *   captured message → follow its single-use link → set a new password → log
 *   in with it (and the old password no longer works).
 * - [ ] The message body contains a LINK, never the raw token/secret, and renders
 *   with the app's real name/content (no `undefined` placeholders).
 * - [ ] Requesting a reset for an unknown email shows the same neutral UI response
 *   as a known one (no account-existence oracle).
 * - [ ] Account emails go only to the account's own address — no UI or endpoint
 *   lets an unauthenticated caller send to an arbitrary address.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './email.js'
export * from './provider.js'
export * from './types.js'
