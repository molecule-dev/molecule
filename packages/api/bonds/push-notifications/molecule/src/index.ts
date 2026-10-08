/**
 * molecule.dev hosted push notifications provider for `@molecule/api-push-notifications`.
 *
 * Delivers web push notifications through molecule.dev and bills the sends to
 * your molecule project, so the app needs no push-service vendor account and
 * never holds a VAPID private key. It is an ordinary bond: swap it for
 * `@molecule/api-push-notifications-web-push` (your own VAPID keys, self-hosted)
 * without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, send } from '@molecule/api-push-notifications'
 * import { provider as push } from '@molecule/api-push-notifications-molecule'
 *
 * setProvider(push) // reads MOLECULE_API_KEY from the environment
 *
 * // One-time: give the browser molecule.dev's public key to subscribe with.
 * const applicationServerKey = await push.fetchPublicKey()
 *
 * await send(subscription, { title: 'Order shipped', options: { body: 'Track it here.' } })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:push-notifications`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - **Subscriptions are bound to the VAPID key they were created with.** A
 *   browser subscribes with the `applicationServerKey` returned by
 *   `fetchPublicKey()` — molecule.dev's public key — and only molecule.dev can
 *   then send to those subscriptions. Moving to your own VAPID identity (the
 *   web-push bond) means your users re-subscribe.
 * - `getPublicKey()` is the core's SYNCHRONOUS method, so it returns the
 *   cache: `undefined` until `fetchPublicKey()` has run. `configure()` is a
 *   no-op (the service holds the keys), and `generateVapidKeys()` throws —
 *   generating your own keys is a self-hosted concern (`@molecule/api-push-notifications-web-push`).
 * - Payloads are bounded at 3072 characters of serialized JSON (the Web Push
 *   protocol caps the ENCRYPTED payload at 4096 bytes and encryption adds
 *   overhead); subscriptions need the exact `endpoint` + `keys.p256dh` +
 *   `keys.auth` values `pushManager.subscribe()` returned. Bad calls are
 *   refused locally with 400/413 and never leave the process.
 * - Every push-service answer arrives as a resolved `SendResult`: `statusCode`
 *   201 means delivered; 404/410 mean the subscription is dead — prune it.
 *   `sendMany()` never aborts the batch on one dead subscription.
 * - Metered per send and billed to the project; the upstream push services
 *   (FCM, Mozilla autopush, Apple) are free, so the real upstream cost is 0 —
 *   the send still counts against the project's rate limit and free-tier
 *   allowance.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 429 / 503 retry later). Nothing is retried.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { PushNotificationProvider } from '@molecule/api-push-notifications'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: PushNotificationProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: PushNotificationProvider = new Proxy({} as PushNotificationProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
