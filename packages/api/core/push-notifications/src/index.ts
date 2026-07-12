/**
 * Push notification provider interface for molecule.dev.
 *
 * Provides an abstract push notification interface that can be backed by any
 * push notification library. Use `setProvider` to bond a concrete implementation
 * such as `@molecule/api-push-notifications-web-push`.
 *
 * @remarks
 * - The VAPID **private** key is a server secret — it stays in the API (config/secrets).
 *   Only the **public** key ({@link getPublicKey}) goes to the browser for `subscribe()`.
 *   Generate the pair ONCE with {@link generateVapidKeys} and persist it in env; do NOT
 *   regenerate per boot — new keys invalidate every existing subscription.
 * - Store each {@link PushSubscription} server-side, scoped to its user, and send from the
 *   server with {@link send}/{@link sendMany}. The browser never sends notifications and
 *   never holds another user's subscription.
 * - Prune dead endpoints: when a send returns {@link SendResult} `statusCode` 404/410 the
 *   subscription is gone — delete that row so you stop pushing to it.
 * - `configure()` once at startup with your {@link VapidConfig} (email + keys).
 *
 * @example
 * ```ts
 * import { configure, sendMany, getPublicKey } from '@molecule/api-push-notifications'
 * configure({ email: 'mailto:ops@app.com', publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE })
 *
 * // Browser subscribes with the PUBLIC key only; the API stores the subscription per user.
 * router.post('/push/subscribe', async (req, res) => {
 *   await saveSubscription(getUserId(res), req.body.subscription) // scoped to the user
 *   res.json({ ok: true })
 * })
 *
 * // Server sends, then prunes subscriptions the provider reports as gone (404/410).
 * const rows = await subscriptionsFor(userId)
 * const results = await sendMany(rows.map((r) => r.subscription), { title: 'Hi', options: { body: '…' } })
 * results.forEach((r, i) => {
 *   if (r.result && (r.result.statusCode === 404 || r.result.statusCode === 410)) deleteSubscription(rows[i].id)
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
