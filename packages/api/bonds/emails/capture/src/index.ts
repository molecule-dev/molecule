/**
 * Email capture provider for molecule.dev.
 *
 * Records every `sendMail()` call as an activity event. Intercept-only by
 * default (synthetic success); delegates + tees when wrapping a real transport.
 *
 * @remarks
 * - **Two modes, and the choice decides whether mail is DELIVERED.**
 *   INTERCEPT-ONLY (`provider`, or `createEmailCaptureProvider()` with no
 *   argument) records the message and returns a synthetic success — nothing
 *   reaches the recipient; that is the dev experience ("captured, not
 *   delivered"). DELEGATE + TEE
 *   (`createEmailCaptureProvider(realTransport)`) sends through the real
 *   transport AND records the real outcome. Anywhere real mail must go out
 *   (production), wrap the real transport — never bond the intercept-only
 *   provider.
 * - Recording is best-effort: a bonded `ActivitySink` that throws NEVER
 *   changes the outcome of `sendMail()` — a successful real send always
 *   resolves successfully and a failed real send always rejects with the
 *   REAL transport error, even if the activity record itself failed. This
 *   matters because a naive delegate-then-record implementation can turn an
 *   actually-SENT email into an apparent failure, causing callers to retry
 *   and recipients to get duplicates.
 * - Captured events go to the bonded activity sink (`@molecule/api-activity`).
 *   Without a sink bonded, `record()` is a silent no-op — the mail is then neither delivered
 *   (intercept mode) nor visible anywhere.
 * - **There is no `createTransport()` export** on this or the ESP bonds: wrap an ESP bond's
 *   `provider` (`createEmailCaptureProvider(mailgunProvider)`). Bond the result with the
 *   emails core's `setTransport(...)`, not `bond('emails-capture', ...)`.
 *
 * @example
 * ```typescript
 * import { setSink } from '@molecule/api-activity'
 * import { provider as consoleSink } from '@molecule/api-activity-console'
 * import { sendMail, setTransport } from '@molecule/api-emails'
 * import { createEmailCaptureProvider, provider as captureOnly } from '@molecule/api-emails-capture'
 * import { provider as mailgun } from '@molecule/api-emails-mailgun'
 *
 * // Startup: bond a sink so captured mail is visible (without one, recording is a no-op).
 * setSink(consoleSink)
 *
 * // Real ESP configured → deliver through it AND record the outcome (tee).
 * // No ESP key (dev/sandbox) → intercept: recorded, NOT delivered.
 * setTransport(process.env.MAILGUN_API_KEY ? createEmailCaptureProvider(mailgun) : captureOnly)
 *
 * const result = await sendMail({
 *   from: 'no-reply@mg.example.com',
 *   to: 'ada@example.com',
 *   subject: 'Welcome to Acme',
 *   text: 'Thanks for signing up!',
 * })
 * // intercept mode: { accepted: ['ada@example.com'], rejected: [], messageId: 'captured-<uuid>' }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
