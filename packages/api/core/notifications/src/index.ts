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
 *
 * @e2e
 * Integration checklist — drive the real flow (no mocks), adapt each item
 * to this app's actual events/triggers, and check every box off one by
 * one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Each ops/event trigger the app defines (service down, new signup,
 *   a threshold crossed) actually calls `notifyAll()` and the message
 *   reaches every bonded channel. The sandbox CAPTURES outbound
 *   notifications instead of sending — read them with the `read_activity`
 *   tool and confirm the subject+body match the event that fired. Never
 *   mock the flow or modify production code to expose it.
 * - [ ] MULTI-CHANNEL: with >1 channel bonded, `notifyAll()` returns one
 *   `NotificationResult` per channel and a single channel failing
 *   (`success: false`) does not swallow the others — every other channel
 *   still captured, its own result still `success: true`.
 * - [ ] The body carries the real event data (no `undefined` placeholders)
 *   and nothing that must not leave the system — no secrets, tokens, or
 *   PII that an external channel (Slack/webhook) should never receive.
 * - [ ] Triggers are not end-user SPAMMABLE — no public endpoint lets a
 *   caller fire unbounded notifications; the trigger is internal (an
 *   ops/system event) or rate-limited.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
