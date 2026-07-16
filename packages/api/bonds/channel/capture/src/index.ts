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
