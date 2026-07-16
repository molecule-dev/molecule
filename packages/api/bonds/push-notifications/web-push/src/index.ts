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
 * import { setProvider } from '@molecule/api-push-notifications'
 * import { provider } from '@molecule/api-push-notifications-web-push'
 *
 * setProvider(provider) // VAPID config is read from env on first send
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
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
