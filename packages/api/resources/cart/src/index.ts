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
 *
 * **Migration required — and `coupons` is NOT included.**
 * `src/__setup__/carts.sql` creates `carts` + `cart_items` (scaffolded apps
 * apply it automatically). `applyCoupon()` looks coupons up in a `coupons`
 * table this package does NOT create — provide one (your own migration or a
 * commerce package that ships it) before surfacing coupon UI, or the mounted
 * `POST /cart/coupon` route fails at runtime.
 *
 * **The cart is a per-user singleton, keyed by the session.** `GET /cart`
 * creates the row on first read; never accept a `cartId`/`userId` from the
 * client — all routes operate on the caller's own cart.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
