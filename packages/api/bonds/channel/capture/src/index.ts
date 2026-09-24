/**
 * Channel capture provider for molecule.dev.
 *
 * Records every `sendMessage()` call as an activity event. Intercept-only by
 * default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setSink } from '@molecule/api-activity'
 * import { provider as consoleSink } from '@molecule/api-activity-console'
 * import { requireProviderByName, setProvider } from '@molecule/api-channel'
 * import { createChannelCaptureProvider, provider as captureOnly } from '@molecule/api-channel-capture'
 * import { createProvider as createSlack } from '@molecule/api-channel-slack'
 *
 * // Startup: bond a sink so captured messages are visible (without one, recording is a no-op).
 * setSink(consoleSink)
 *
 * // Real token configured → post through Slack AND record the outcome (tee).
 * // No token (dev/sandbox) → intercept: recorded, NOT posted.
 * setProvider(
 *   'slack',
 *   process.env.SLACK_BOT_TOKEN
 *     ? createChannelCaptureProvider(createSlack({ botToken: process.env.SLACK_BOT_TOKEN }))
 *     : captureOnly,
 * )
 *
 * const sent = await requireProviderByName('slack').sendMessage('C0123ABCD', {
 *   kind: 'text',
 *   text: 'New order #1042 — $49.00',
 * })
 * // intercept mode: { messageId: 'captured-<uuid>', deliveredAt: Date }
 * ```
 *
 * @remarks
 * - **Not `bond('channel-capture', ...)`.** Register it with the channel core's
 *   `setProvider(name, provider)` under the channel name the app sends through (`'slack'`),
 *   so switching capture on/off never changes call sites.
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
