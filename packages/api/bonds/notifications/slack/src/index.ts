/**
 * Slack notifications provider for molecule.dev.
 *
 * Sends notifications to a Slack channel via an incoming webhook
 * (`NOTIFICATIONS_SLACK_WEBHOOK_URL` or `createProvider({ webhookUrl })`).
 *
 * @example
 * ```typescript
 * import { notifyAll, setProvider } from '@molecule/api-notifications'
 * import { provider as slack } from '@molecule/api-notifications-slack'
 *
 * // Startup: env NOTIFICATIONS_SLACK_WEBHOOK_URL (https://hooks.slack.com/services/...).
 * // The notifications core is NAMED: setProvider(name, provider), one entry per channel.
 * setProvider('slack', slack)
 *
 * const results = await notifyAll({
 *   subject: 'New signup',
 *   body: 'ada@example.com just created an account.',
 * })
 * // [{ success: true, channel: 'slack', sentAt: '2026-…' }] — never throws; check success
 * const failed = results.filter((result) => !result.success)
 * console.log(failed.map((result) => `${result.channel}: ${result.error}`))
 * ```
 *
 * @remarks
 * - **`send()` never throws — it fails open.** A missing webhook URL, a non-2xx
 *   from Slack, or a timeout (default 10 s) all resolve to
 *   `{ success: false, error }`. If delivery matters, check `result.success`
 *   (or the per-channel results from the core `notifyAll()`); an
 *   unconfigured channel is otherwise silent.
 * - **`setProvider` takes a channel NAME first** (`setProvider('slack', slack)`);
 *   `setProvider(slack)` is a type error. Use `createProvider({ webhookUrl,
 *   timeoutMs })` instead of `provider` to pass the URL explicitly (timeout in
 *   MILLISECONDS).
 * - The message is a single mrkdwn `text` field: `*subject*` newline `body`.
 *   **`Notification.metadata` is not sent to Slack** — bake anything the
 *   receiver needs into `body`.
 * - The webhook URL and timeout are captured on first use (lazy) and frozen —
 *   env changes after the first send require a restart, or build a fresh
 *   instance via `createProvider()`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { NotificationsProvider } from '@molecule/api-notifications'

import { createProvider } from './provider.js'

let _provider: NotificationsProvider | null = null

/**
 * The provider implementation.
 */
export const provider: NotificationsProvider = new Proxy({} as NotificationsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
