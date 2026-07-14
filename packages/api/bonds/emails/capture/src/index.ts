/**
 * Email capture provider for molecule.dev.
 *
 * Records every `sendMail()` call as an activity event. Intercept-only by
 * default (synthetic success); delegates + tees when wrapping a real transport.
 *
 * @remarks
 * Recording is best-effort: a bonded `ActivitySink` that throws NEVER
 * changes the outcome of `sendMail()` — a successful real send always
 * resolves successfully and a failed real send always rejects with the
 * REAL transport error, even if the activity record itself failed. This
 * matters because a naive delegate-then-record implementation can turn an
 * actually-SENT email into an apparent failure, causing callers to retry
 * and recipients to get duplicates.
 *
 * @example
 * ```typescript
 * import { setTransport } from '@molecule/api-emails'
 * import { provider } from '@molecule/api-emails-capture'
 *
 * setTransport(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
