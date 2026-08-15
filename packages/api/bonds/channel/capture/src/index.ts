/**
 * Channel capture provider for molecule.dev.
 *
 * Records every `sendMessage()` call as an activity event. Intercept-only by
 * default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-capture'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **Two modes, and the choice decides whether the message is POSTED.**
 *   INTERCEPT-ONLY (`provider`, or `createChannelCaptureProvider()` with no
 *   argument) records the message and returns a synthetic success — nothing
 *   reaches the channel. DELEGATE + TEE
 *   (`createChannelCaptureProvider(real)`) posts through the real provider AND
 *   records the real outcome. Anywhere real messages must go out (production),
 *   wrap the real provider — never bond the intercept-only provider.
 * - Recording is best-effort: a bonded `ActivitySink` that throws NEVER changes
 *   the outcome of `sendMessage()` — a successful real post still resolves and
 *   a failed one still rejects with the REAL provider error.
 * - **Bond an activity sink or captures vanish.** Captured sends are delivered
 *   via `@molecule/api-activity`'s `record()`, which silently no-ops when no
 *   sink is bonded. Wire one at startup (e.g. `@molecule/api-activity-console`
 *   or `-http`) before this provider, or every intercepted message is dropped
 *   with no trace.
 * - Intercept-only mode (no `realProvider`) returns a synthetic success from
 *   `sendMessage()`, always fails `verifyWebhookSignature()` (`false`), and
 *   `parseInbound()` returns a stub — inbound webhook flows need a real
 *   provider wrapped via `createChannelCaptureProvider(realProvider)`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
