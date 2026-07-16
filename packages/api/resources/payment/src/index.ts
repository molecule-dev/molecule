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
