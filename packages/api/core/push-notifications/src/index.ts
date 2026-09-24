/**
 * Push notification provider interface for molecule.dev.
 *
 * Provides an abstract push notification interface that can be backed by any
 * push notification library. Use `setProvider` to bond a concrete implementation
 * such as `@molecule/api-push-notifications-web-push`.
 *
 * @remarks
 * - **`setProvider(...)` first** — every function here throws "No push notification
 *   provider bonded" until a provider is bonded.
 * - The VAPID **private** key is a server secret — it stays in the API (config/secrets).
 *   Only the **public** key ({@link getPublicKey}) goes to the browser for `subscribe()`.
 *   Generate the pair ONCE with {@link generateVapidKeys} and persist it in env; do NOT
 *   regenerate per boot — new keys invalidate every existing subscription.
 * - Store each {@link PushSubscription} server-side, scoped to its user, and send from the
 *   server with {@link send}/{@link sendMany}. The browser never sends notifications and
 *   never holds another user's subscription.
 * - Prune dead endpoints: a gone subscription (HTTP 404/410 from the push service) surfaces
 *   as a **failed** send — with the web-push bond the per-subscription `error` in
 *   {@link SendManyResult} (a `WebPushError` carrying `statusCode`), NOT a resolved
 *   {@link SendResult}. Check `r.error` for 404/410 and delete that row so you stop pushing
 *   to it. (`send()` for a single subscription *throws* in that case.)
 * - `configure()` once at startup with your {@link VapidConfig} (email + keys).
 *
 * @example
 * ```typescript
 * import type { PushSubscription } from '@molecule/api-push-notifications'
 * import { configure, getPublicKey, sendMany, setProvider } from '@molecule/api-push-notifications'
 * import { createProvider } from '@molecule/api-push-notifications-web-push'
 *
 * // Startup: bond, then configure VAPID from env (generate the pair ONCE, never per boot).
 * setProvider(createProvider())
 * configure({
 *   email: process.env.VAPID_EMAIL ?? 'ops@example.com',
 *   publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
 *   privateKey: process.env.VAPID_PRIVATE_KEY ?? '', // server-only secret
 * })
 *
 * // GET /push/public-key → the browser subscribes with the PUBLIC key only.
 * const publicKey = getPublicKey()
 *
 * // Subscriptions the browser POSTed, stored per user (loaded here for the signed-in user).
 * const subscriptions: PushSubscription[] = [
 *   { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'BNc…', auth: 'tBH…' } },
 * ]
 *
 * const results = await sendMany(subscriptions, {
 *   title: 'New message',
 *   options: { body: 'Ada sent you a message', data: { url: '/inbox' } },
 * })
 * // A dead endpoint REJECTS: it is in `error` (statusCode 404/410), never in `result`.
 * const gone = results
 *   .filter((r) => {
 *     const status = (r.error as { statusCode?: number } | undefined)?.statusCode
 *     return status === 404 || status === 410
 *   })
 *   .map((r) => r.subscription.endpoint) // delete these rows
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The UI offers an enable-notifications control; activating it triggers
 *   the browser permission prompt and, once granted, the subscription is
 *   stored (the UI still shows "enabled" after a full reload).
 * - [ ] An event this app notifies about actually delivers a push to the
 *   subscribed session, with a readable title/body (not raw JSON). The sandbox
 *   CAPTURES outbound pushes instead of delivering — read the captured message
 *   with the `read_activity` tool (filter type 'push'); never mock the flow or
 *   modify production code to expose it.
 * - [ ] Clicking the delivered notification opens/focuses the relevant screen
 *   (when the app claims deep-linking).
 * - [ ] Denying the permission leaves the app fully usable and truthful about
 *   the state (no crash, no false "enabled").
 * - [ ] Disabling/unsubscribing stops deliveries, and the disabled state
 *   persists across a reload.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
