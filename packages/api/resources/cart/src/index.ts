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
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Adding a product (`POST /cart/items`) puts a line in the cart at the
 *   quantity requested, and the cart view + subtotal reflect it.
 * - [ ] Adding the SAME product (same `productId`/`variantId`) again MERGES —
 *   the existing line's quantity increments, it does NOT create a second
 *   duplicate line; a different product stays its own line.
 * - [ ] Changing a line's quantity (`PUT /cart/items/:itemId`) and removing a
 *   line (`DELETE /cart/items/:itemId`) update the cart, and the computed
 *   subtotal/total RECOMPUTE correctly: subtotal is the sum of price × quantity,
 *   and total = subtotal - discount + tax (tax is 0 until you wire a rate).
 *   Apply a coupon (`POST /cart/coupon`, looked up server-side in the `coupons`
 *   table) and confirm discount + total drop; removing it restores them.
 * - [ ] An invalid quantity (0, negative, or non-integer) and a negative price
 *   are REJECTED with a visible error and leave the cart unchanged — the totals
 *   shown are for DISPLAY only; a real checkout must re-resolve prices server-side.
 * - [ ] Clearing the cart (`DELETE /cart`) empties it — items and any applied
 *   coupon gone, totals back to 0. If the app builds checkout, it hands off the
 *   right items and a SERVER-recomputed total, never the client cart total.
 * - [ ] AUTHORIZATION — the cart is a per-user singleton keyed by the session;
 *   no route takes a `cartId`/`userId`. A second signed-in user sees only their
 *   own cart, and a line `itemId` from another user's cart is neither readable
 *   nor mutable (update/remove return not-found) — no path to someone else's cart.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
