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
 * @module
 */

export * from './provider.js'
export * from './types.js'
