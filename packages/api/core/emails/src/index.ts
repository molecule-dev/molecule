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
 * - **Build links from a TRUSTED configured origin, never request headers.** A link in an
 *   email (verification, reset, cancel, invite) must be built from `SITE_ORIGIN` (config),
 *   NOT `req.headers.origin`/`host`/`x-forwarded-host` — those are caller-controlled, so a
 *   forged header poisons the emailed link (host-header injection: the token-carrying URL
 *   sent to a victim points at the attacker's domain → token leak + phishing). e.g.
 *   `` const origin = getConfig('SITE_ORIGIN', '') || 'http://localhost:3000' ``.
 * - **The `from` domain must be one you VERIFIED with your provider** (Mailgun/SendGrid/SES),
 *   or the send is rejected / lands in spam (SPF+DKIM won't align on an unowned domain). Do
 *   NOT hardcode a placeholder like `noreply@example.com` or an arbitrary domain: read the
 *   sender from config and default it to your verified sending domain — e.g.
 *   `` const from = process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}` ``
 *   (the exact env var for the sending domain is provider-specific; `MAILGUN_DOMAIN` for
 *   Mailgun). One canonical `EMAIL_FROM` override + a default derived from the verified
 *   domain = email that delivers out of the box.
 * - **Bond a transport first** with `setTransport(provider)` (not `setProvider`) —
 *   `sendMail()` throws until one is bonded. `html`/`text` are sent as given: escape any
 *   user-supplied text you put into `html` yourself.
 *
 * @example
 * ```typescript
 * import { sendMail, setTransport } from '@molecule/api-emails'
 * // Env: MAILGUN_API_KEY + MAILGUN_DOMAIN. In dev without a key, bond
 * // `@molecule/api-emails-capture` instead (records mail, delivers nothing).
 * import { provider as mailgun } from '@molecule/api-emails-mailgun'
 *
 * // Startup: bond one transport.
 * setTransport(mailgun)
 *
 * // Sender on your VERIFIED domain; links from the configured origin, never request headers.
 * const from = process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN}`
 * const origin = process.env.SITE_ORIGIN ?? 'http://localhost:3000'
 *
 * // The recipient is the authenticated account's OWN address; the token is single-use.
 * const user = { email: 'ada@example.com' }
 * const resetLink = `${origin}/reset-password?token=${encodeURIComponent('one-time-token')}`
 *
 * const result = await sendMail({
 *   from,
 *   to: user.email,
 *   subject: 'Reset your password',
 *   text: `Reset your password: ${resetLink}`,
 *   html: `<p><a href="${resetLink}">Reset your password</a></p>`,
 * })
 * // result → { accepted: ['ada@example.com'], rejected: [], messageId: '<…>' }
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks). The
 * sandbox CAPTURES outbound email instead of sending — read each message with
 * the `read_activity` tool (filter type 'email'); the verification/reset link
 * is in its payload. Never mock the send or modify production code to expose
 * it. Adapt each item to this app's actual screens/flows, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip:
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
