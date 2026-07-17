/**
 * Payment resource with subscription plan management.
 *
 * @remarks
 * A plan/entitlement is granted ONLY after a SERVER-VERIFIED payment — never from anything
 * the client reports. The flow (implemented by the user resource's `verifyPayment` handler):
 *
 * 1. **Verify** the provider token/receipt server-side via the bonded payments provider
 *    (`@molecule/api-payments` — read its docs). Trust only its normalized result.
 * 2. **Record** it with {@link paymentRecordService}`.store`, which enforces
 *    `UNIQUE(platformKey, transactionId)` so one receipt binds to exactly ONE account.
 * 3. **Resolve** the plan from the verified product/price id against the registered
 *    {@link plans} (match BOTH `productId` and `priceId`), then grant it.
 *
 * Weak-integration mistakes to avoid:
 * - **Never trust a client-sent plan / subscription / "isPro".** The plan is derived from
 *   the verified provider result, not a request field.
 * - **Never swallow the duplicate-record error.** {@link paymentRecordService}`.store`
 *   THROWS when a `transactionId` is already claimed — that is the replay guard
 *   (first-claim-wins). Catch it and REJECT; do not grant the plan to a second account.
 * - **Register your catalogue** with {@link registerPlans} using YOUR price/product ids
 *   (the env-configured `price_…`), and resolve by BOTH product and price id — providers
 *   report the product on a subscription while checkout uses the price.
 * - Re-verify entitlement server-side wherever it gates access; never cache "is subscribed"
 *   somewhere the client can set.
 *
 * The `payments` table ships in `setup/payments.sql` — an mlcl-scaffolded API
 * copies and replays it automatically on migrate; anywhere else run it once.
 * Missing it surfaces as `relation "payments" does not exist` on the first
 * billing call — nothing at runtime creates the table.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual billing screens/flows, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip. This resource RECORDS a server-verified provider result (a receipt or
 * subscription id verified via `@molecule/api-payments`) and resolves the plan
 * — it does NOT charge cards and has no amount/status column, so drive the
 * provider's real verify path; never fabricate a record or a status:
 * - [ ] A completed purchase/subscribe flow reflects in the account: the paid
 *   tier's capabilities unlock and a payment record binds to THIS user with the
 *   right platformKey (stripe/apple/google), productId/priceId, and
 *   transactionId — and it appears in the user's own billing/subscription view.
 * - [ ] The plan and price shown match what was actually purchased: the tier is
 *   resolved from the VERIFIED product/price id against the registered plans,
 *   and any amount/currency shown comes from that plan (its `price`) or the
 *   provider's verified `data` — never a client-sent field. An amount renders
 *   formatted with its currency, not as a raw smallest-unit integer.
 * - [ ] Status follows the provider, not the client: a verified payment grants
 *   the plan (pending is granted only once it succeeds), and a provider
 *   cancellation/refund/expiry webhook (`handlePaymentNotification`) REVOKES it
 *   so the user loses premium. No request field (`planKey`, `isPro`, a bare
 *   `subscriptionId`) lets the client set or keep an active/paid status.
 * - [ ] Replay and re-complete guard: one receipt/subscription transaction
 *   binds to exactly ONE account (UNIQUE(platformKey, transactionId),
 *   first-claim-wins) — replaying the same receipt into a second account is
 *   REJECTED, re-verifying your own is idempotent (no double grant), and a
 *   refunded/canceled entitlement can't be reclaimed without a NEW verified
 *   payment.
 * - [ ] Authorization — a user sees only THEIR OWN payments: guessing another
 *   user's payment/transaction id returns nothing (records scope by userId), and
 *   NO endpoint lets a user mark their own payment succeeded/refunded or set
 *   their own plan/isPro to spoof having paid — only the verified provider
 *   result grants the tier.
 * - [ ] The provider secret (e.g. STRIPE_SECRET_KEY / APPLE_SHARED_SECRET /
 *   GOOGLE_API_SERVICE_KEY_OBJECT) is used only server-side for verification and
 *   never reaches the browser bundle or a client request — this resource is
 *   SERVER-ONLY.
 *
 * @example
 * ```ts
 * import { registerPlans, stripeMonthly, stripeYearly } from '@molecule/api-resource-payment'
 *
 * // Register your plan catalogue at startup. The keys are YOUR plan ids; the ready-made
 * // Plan objects carry the env-configured Stripe price/product ids (also register the
 * // apple and google plan exports when you support those providers):
 * registerPlans({ monthly: stripeMonthly, yearly: stripeYearly })
 *
 * // Then grant a plan ONLY after a SERVER-VERIFIED payment — never from a client field.
 * // The full verify → record (replay-guarded) → resolve → grant flow lives in the scaffolded
 * // user `verifyPayment` handler; verify receipts against @molecule/api-payments and store
 * // them with `paymentRecordService.store` (it THROWS on a replayed transactionId — reject).
 * ```
 *
 * @module `@molecule/api-resource-payment`
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './plans.js'
export * from './planService.js'
export * from './recordService.js'
export * from './resource.js'
export * from './schema.js'
export * as types from './types.js'
export * from './utilities.js'
