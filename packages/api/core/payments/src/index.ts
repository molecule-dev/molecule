/**
 * Payments core interface for molecule.dev.
 *
 * Defines common types and interfaces for payment providers.
 *
 * @remarks
 * **Entitlement is granted ONLY on a server-verified payment — NEVER trust the
 * client.** A browser can claim any subscription status, product id, or "I paid". The
 * one source of truth is a verification performed in YOUR API: pass the provider's
 * token/receipt/subscription id to the bonded provider's
 * {@link SubscriptionVerifier.verifySubscription} / {@link PurchaseVerifier.verifyPurchase}
 * (Stripe/Apple/Google), which calls the provider server-side and returns a
 * {@link NormalizedSubscription} / {@link NormalizedPurchase} — or `null` if invalid.
 * Grant access from THAT result, never from a value the client sent.
 *
 * Things a weak integration gets wrong — do NOT:
 * - read the plan/entitlement from a request body, query param, or client state and act
 *   on it. Re-verify server-side every time it matters.
 * - accept an `amount`/`price` from the client. The server owns the price (look it up by
 *   product/price id); a client-supplied amount is a tampering vector.
 * - grant the same receipt/transaction twice. Persist the verified `transactionId` /
 *   `subscriptionId` and reject a replay (one receipt must not unlock two accounts).
 * - skip webhook signature verification. A provider webhook (Stripe `whsec_…`, Apple/Google
 *   notifications) MUST have its signature verified before you act on it — an unverified
 *   webhook body is attacker-controlled.
 * - expose the provider SECRET key (`sk_…`) to the browser. Only the publishable key is
 *   client-side; verification + secret keys stay in the API.
 *
 * Use {@link isActiveStatus} (true for `active`/`trialing`) instead of hand-checking
 * status strings, and store the normalized result server-side keyed by user.
 *
 * @example
 * ```ts
 * // Server-side handler: verify BEFORE granting. `verifier` = your bonded payments
 * // provider; the client sends only an opaque token/receipt, never a status or amount.
 * router.post('/subscriptions/activate', async (req, res) => {
 *   const userId = getUserId(res)
 *   if (!userId) return res.status(401).json({ error: 'Authentication required.' })
 *
 *   const sub = await verifier.verifySubscription(req.body.productId, req.body.token)
 *   if (!sub || !isActiveStatus(sub.status)) {
 *     return res.status(402).json({ error: 'No active subscription.' }) // trust the verify, not the client
 *   }
 *   if (await paymentExists(sub.subscriptionId)) {
 *     return res.status(409).json({ error: 'This subscription is already linked.' }) // replay guard
 *   }
 *   await grantEntitlement(userId, sub) // store the normalized result server-side
 *   res.json({ status: sub.status, activeUntil: sub.currentPeriodEnd })
 * })
 * ```
 *
 * @module
 */

export * from './subscription.js'
export * from './types.js'
