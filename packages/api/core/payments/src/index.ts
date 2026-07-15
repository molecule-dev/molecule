/**
 * Payments core interface for molecule.dev.
 *
 * Defines common types and interfaces for payment providers.
 *
 * @remarks
 * **Entitlement is granted ONLY on a server-verified payment — NEVER trust the
 * client.** A browser can claim any subscription status, product id, or "I paid". The
 * one source of truth is a verification performed in YOUR API: pass the provider's
 * opaque token/receipt/subscription id to the bonded provider's verify method —
 * {@link PaymentProviderInterface.verifySubscription} (Stripe-style: the `cs_…`/`sub_…`
 * id), {@link PaymentProviderInterface.verifyReceipt} (Apple: base64 receipt +
 * productId), or {@link PaymentProviderInterface.verifyPurchase} (Google: purchase
 * token + productId). Each calls the provider server-side and returns a
 * {@link VerifiedSubscription} — or `null` when the purchase is invalid OR not
 * entitled (expired, refunded, past_due, pending). Grant access from THAT result,
 * never from a value the client sent.
 *
 * **The shipped bonds implement {@link PaymentProviderInterface}** — that is what
 * `bond('payments', provider)` / `get('payments', name)` hands you, and its verify
 * methods take the OPAQUE id/receipt only. The two-argument
 * {@link SubscriptionVerifier}/{@link PurchaseVerifier} interfaces (returning
 * {@link NormalizedSubscription}/{@link NormalizedPurchase}) are `@deprecated`
 * auxiliary abstractions for app-level services; no `@molecule/api-payments-*` bond
 * implements them — do not call `verifySubscription(productId, token)` on a bonded
 * provider (the extra argument is silently ignored and the lookup fails).
 *
 * **A missing secret (`STRIPE_SECRET_KEY`, `APPLE_SHARED_SECRET`,
 * `GOOGLE_API_SERVICE_KEY_OBJECT`, …) is a DIFFERENT failure than "not entitled".**
 * The shipped bonds rethrow a tagged config-not-configured error (see
 * {@link isConfigNotConfiguredError}) from their verify/update/cancel methods
 * instead of swallowing it into the same `null` result a genuine verification
 * failure returns — a resource-layer catch block MUST check
 * `isConfigNotConfiguredError(error)` and pass its `statusCode`/`errorKey`
 * through (rather than flattening to a generic 400/500) so the actionable
 * "which key, where to get it" message reaches the caller instead of only the
 * server log.
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
 * When you DO handle a normalized status (a {@link NormalizedSubscription} or a
 * webhook's {@link WebhookEvent.subscription}), use {@link isActiveStatus} (true for
 * `active`/`trialing`) instead of hand-checking status strings, and store the
 * verified result server-side keyed by user.
 *
 * @example
 * ```ts
 * // Server-side handler: verify BEFORE granting. The bonded provider implements
 * // PaymentProviderInterface; the client sends only an opaque id/receipt, never a
 * // status or amount. Bonds return null unless the provider confirms a real,
 * // currently-entitled subscription — so `sub != null` IS the entitlement gate.
 * import { get } from '@molecule/api-bond'
 * import type { PaymentProviderInterface } from '@molecule/api-payments'
 *
 * router.post('/subscriptions/activate', async (req, res) => {
 *   const userId = getUserId(res)
 *   if (!userId) return res.status(401).json({ error: 'Authentication required.' })
 *
 *   // Stripe-style; Apple/Google use payments.verifyReceipt(receipt, productId) /
 *   // payments.verifyPurchase(purchaseToken, productId) with the same null contract.
 *   const payments = get<PaymentProviderInterface>('payments', 'stripe')
 *   const sub = payments?.verifySubscription
 *     ? await payments.verifySubscription(req.body.subscriptionId) // opaque `cs_…`/`sub_…` id
 *     : null
 *   if (!sub) {
 *     return res.status(402).json({ error: 'No active subscription.' }) // trust the verify, not the client
 *   }
 *   if (sub.transactionId && (await paymentExists(sub.transactionId))) {
 *     return res.status(409).json({ error: 'This subscription is already linked.' }) // replay guard
 *   }
 *   await grantEntitlement(userId, sub) // store the VERIFIED result server-side
 *   res.json({ expiresAt: sub.expiresAt, autoRenews: sub.autoRenews })
 * })
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks; use the
 * provider's TEST mode — test cards/sandbox accounts, never a live charge),
 * adapt each item to this app's actual screens/flows, and check every box off
 * one by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Starting an upgrade/subscribe from the pricing or billing surface creates a
 *   checkout session and hands off to the provider flow (redirect or embedded
 *   element) — the button does something real, not a dead click.
 * - [ ] Returning from a canceled/abandoned checkout leaves the user on their
 *   original plan with a sane UI (no phantom entitlement, no error page).
 * - [ ] Entitlement flips ONLY after server-side verification (webhook or verify
 *   call) — reloading after a client-side-only "success" must NOT show a paid
 *   plan unless the server verified it. The sandbox CAPTURES webhook deliveries
 *   — read them with the `read_activity` tool (filter type 'webhook'); never
 *   mock the event or modify production code to fake an entitlement.
 * - [ ] The current subscription status (plan name, renewal/expiry) renders on the
 *   account/billing screen, and canceling updates that status visibly.
 * - [ ] With payment secrets unconfigured, the flow surfaces an actionable
 *   "credentials not configured" message — not a silent no-op or generic 500.
 * - [ ] The provider SECRET key never reaches the browser (page + network traffic
 *   contain only the publishable key).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './errors.js'
export * from './subscription.js'
export * from './types.js'
