/**
 * Shopping cart resource for molecule.dev.
 *
 * Provides a user-scoped singleton cart with item management, coupon support,
 * and computed totals (subtotal, discount, tax, total).
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-cart'
 * ```
 * @remarks
 * **SECURITY — cart item prices are CLIENT-SUPPLIED and unverified.** This
 * resource is GENERIC (no product/catalog table), so `addItem()` stores the
 * `price` from the request body verbatim; the computed `subtotal`/`discount`/
 * `tax`/`total` (see `utilities.ts`) are derived from those client prices.
 * Input validation rejects malformed money (negative `price`, non-integer or
 * `< 1` `quantity`) but does NOT establish that the prices are CORRECT — a
 * client can submit `price: 0`. NEVER charge a customer off a cart total: at
 * checkout, re-resolve every unit price SERVER-SIDE from the product/menu table
 * (keyed by `productId`/`variantId`) and recompute the totals from those
 * trusted values, ignoring the client-supplied `price`. The cart total is for
 * DISPLAY only. (`applyCoupon()` is already safe — it looks the coupon up in
 * the `coupons` table and ignores any client-supplied discount value.)
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
