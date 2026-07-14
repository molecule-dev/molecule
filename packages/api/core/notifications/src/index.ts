/**
 * Notifications interface for molecule.dev.
 *
 * Supports multiple notification channels (webhook, Slack, email, etc.)
 * through named bonds. Use notifyAll() to broadcast to all channels.
 *
 * @example
 * ```typescript
 * import { setProvider, notifyAll } from '@molecule/api-notifications'
 * import { provider as webhook } from '@molecule/api-notifications-webhook'
 *
 * setProvider('webhook', webhook)
 *
 * await notifyAll({
 *   subject: 'Service Down',
 *   body: 'API is not responding',
 * })
 * ```
 *
 * @remarks
 * `notifyAll()` fans out to every bonded channel CONCURRENTLY
 * (`Promise.allSettled`), not serially — a slow or hanging channel does not
 * delay the delivery of any other channel behind it. Per-channel failures
 * (rejected result or thrown error) are isolated and logged; results are
 * always returned in the channels' registration order, regardless of which
 * settles first.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
