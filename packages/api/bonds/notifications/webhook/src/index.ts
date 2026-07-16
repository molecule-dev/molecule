/**
 * Webhook notifications provider for molecule.dev.
 *
 * Sends notifications as HTTP POST requests with optional HMAC signing.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-notifications'
 * import { provider } from '@molecule/api-notifications-webhook'
 *
 * setProvider('webhook', provider)
 * ```
 *
 * @remarks
 * Wire format: the POST body is
 * `{ subject, body, timestamp, metadata }` — `metadata` is nested under its
 * own key (never spread at the top level), so a `Notification.metadata`
 * object can safely use keys like `subject`/`body`/`timestamp` without
 * colliding with the canonical envelope fields the receiver (and the HMAC
 * signature, when a secret is configured) depends on.
 *
 * - **Signature (when a secret is configured):** the POST carries
 *   `X-Signature-256: sha256=<hex>` where `<hex>` is the HMAC-SHA256 of the
 *   EXACT raw JSON body, keyed by `NOTIFICATIONS_WEBHOOK_SECRET` (or
 *   `config.secret`). Receivers must compute the HMAC over the raw request
 *   bytes BEFORE parsing (a re-serialized body will not match) and compare
 *   timing-safely. No secret → no header.
 * - **`send()` never throws — it fails open.** Missing URL, non-2xx, or
 *   timeout (default 10 s) resolve to `{ success: false, error }`; check
 *   `result.success` when delivery matters.
 * - URL/secret/timeout are captured on first use (lazy) and frozen — env
 *   changes after the first send require a restart or a fresh
 *   `createProvider()` instance.
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
