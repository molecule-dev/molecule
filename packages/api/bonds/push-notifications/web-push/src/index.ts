/**
 * Web Push provider for molecule.dev push notifications.
 *
 * Provides push notification delivery using the Web Push protocol (VAPID)
 * via the `web-push` library.
 *
 * @see https://www.npmjs.com/package/web-push
 *
 * @example
 * ```typescript
 * import type { PushSubscription } from '@molecule/api-push-notifications'
 * import { getPublicKey, sendMany, setProvider } from '@molecule/api-push-notifications'
 * import { createProvider } from '@molecule/api-push-notifications-web-push'
 *
 * // Startup. Env: VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — read on the FIRST send.
 * setProvider(createProvider())
 *
 * // Serve this to the browser for `pushManager.subscribe({ applicationServerKey })`.
 * const applicationServerKey = getPublicKey()
 *
 * // What the browser's `PushSubscription.toJSON()` sent you (store it per user).
 * const subscriptions: PushSubscription[] = [
 *   { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: 'BNc...', auth: 'tBH...' } },
 *   { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/def456', keys: { p256dh: 'BPx...', auth: 'k3r...' } },
 * ]
 * const results = await sendMany(subscriptions, {
 *   title: 'New message',
 *   options: { body: 'Ada sent you a message', data: { url: '/inbox' } },
 * })
 * // One dead subscription never aborts the batch — it comes back with `error` set.
 * const failedEndpoints = results.filter((entry) => entry.error).map((entry) => entry.subscription.endpoint)
 * ```
 *
 * @remarks
 * Configuration is lazy and env-driven: `configure()` — called automatically on
 * the first `send()` if you never call it — reads `VAPID_EMAIL`,
 * `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` unless an explicit `VapidConfig`
 * is passed. With any of the three missing, wiring/boot does NOT fail:
 * `configure()` logs a warning ("Push notifications disabled: missing …") and
 * every subsequent `send()`/`sendMany()` THROWS "Push notifications not
 * configured" — so a missing env var surfaces at first send, not at startup.
 * `VAPID_EMAIL` accepts a bare address or the `mailto:`/`https:` form (a bare
 * address is normalized to `mailto:…` — don't prepend `mailto:` to a value that
 * already has it). `getPublicKey()` serves the key browsers need to subscribe
 * (configured key first, `VAPID_PUBLIC_KEY` fallback); `generateVapidKeys()`
 * mints a fresh pair — scaffolds auto-generate these secrets, so it's only
 * needed for manual provisioning or rotation. `sendMany()` uses
 * `Promise.allSettled`: one dead subscription never aborts the batch (check
 * each result's `error`).
 *
 * - **The payload is `JSON.stringify(payload)`** — your service worker's `push` handler
 *   must `event.data.json()` and call `showNotification(title, options)` itself; nothing
 *   is displayed without it.
 * - **Prune expired subscriptions yourself.** A failed entry's `error` is `web-push`'s
 *   `WebPushError`; a `statusCode` of 404 or 410 means the browser unsubscribed — delete
 *   that stored subscription, or every later send fails for it again.
 * - VAPID details are set on the `web-push` module GLOBALLY: two instances configured
 *   with different keys overwrite each other.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
