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
 *   Without a sink bonded, `record()` is a silent no-op.
 *
 * @example
 * ```typescript
 * import { setTransport } from '@molecule/api-emails'
 * import { createEmailCaptureProvider, provider } from '@molecule/api-emails-capture'
 *
 * setTransport(provider) // intercept-only: nothing is actually delivered
 *
 * // Tee mode: really send AND record the real outcome
 * // import { createTransport } from '@molecule/api-emails-mailgun'
 * // setTransport(createEmailCaptureProvider(createTransport()))
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
