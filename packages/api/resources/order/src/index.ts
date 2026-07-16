/**
 * Order resource for molecule.dev.
 *
 * Provides order management with status tracking, lifecycle transitions,
 * cancellation, refunds, and event history.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-order'
 * ```
 * @remarks
 * **SECURITY — `create()` TRUSTS client-supplied prices; do NOT wire it to a
 * payment-charging path.** This resource is GENERIC: it owns no product/catalog
 * table, so it CANNOT verify a price. `create()` builds the order — and its
 * `total` (`subtotal − discount + tax + shipping`) — from the request body's
 * `items[].price`, `quantity`, `discount`, `tax`, and `shipping`. Input
 * validation rejects malformed money (negative `price`/`discount`/`tax`/
 * `shipping`, non-integer or `< 1` `quantity`) but does NOT establish that the
 * prices are CORRECT. A client can therefore submit `price: 0` (or otherwise
 * understate the total). Any code that CHARGES off an order MUST resolve each
 * unit price SERVER-SIDE from the product/menu table (keyed by `productId`/
 * `variantId`), ignore the client's `price`, and recompute the totals from
 * those trusted values — as every flagship checkout flow does. Use the stock
 * `create()` only for non-charging flows (drafts, internal/admin order entry,
 * an order that was already server-priced upstream).
 *
 * Lifecycle ops (confirm/process/ship/deliver/refund, and cancelling an
 * already-progressed order) are MERCHANT-ONLY and DENY by default until an app
 * registers a merchant authorizer via `setOrderMerchantAuthorizer` — the order
 * row records only the BUYER (`userId`), so it cannot know who the seller is.
 *
 * Tables: `src/__setup__/orders.sql` creates `orders`, `order_items`, and
 * `order_events`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run it once — nothing at runtime
 * creates them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual order/checkout screens, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip. Ground every check in the REAL statuses
 * (pending/confirmed/processing/shipped/delivered/cancelled/refunded) and the
 * defined transitions — never a status the interface lacks:
 * - [ ] Placing an order creates it `pending` with the exact line items
 *   submitted (productId, name, price, quantity) and a correctly-computed
 *   total: `subtotal` = the sum of price x quantity across items, and `total`
 *   = subtotal - discount + tax + shipping. The amount the UI shows matches
 *   that formula to the cent.
 * - [ ] The fulfillment lifecycle advances ONLY through the defined
 *   transitions — pending -> confirmed -> processing -> shipped -> delivered.
 *   An illegal jump (e.g. pending -> shipped, or shipped -> pending) is
 *   rejected 409 and the order's stored status is left unchanged.
 * - [ ] Cancel is honored only from a cancellable state (pending, confirmed,
 *   or processing); cancelling a shipped, delivered, cancelled, or already
 *   refunded order is rejected 409 — you cannot cancel or ship a cancelled
 *   order.
 * - [ ] Refund is honored ONLY from `delivered` (the sole state whose
 *   transitions include `refunded`); refunding an unpaid/`pending` or a merely
 *   shipped order is rejected 409, and a refund amount <= 0 or greater than the
 *   order `total` is rejected 400.
 * - [ ] Line items and money stay consistent across the flow: a status change
 *   never alters the stored items, subtotal, or total, and a refund records
 *   its amount (<= total) without corrupting the order total.
 * - [ ] AUTHORIZATION — a user sees and mutates only their OWN orders. The
 *   list returns just the caller's orders; reading or acting on another user's
 *   order id returns 403 (or 404 when it does not exist) — guessing an id never
 *   leaks or mutates someone else's order.
 * - [ ] AUTHORIZATION — no endpoint lets a normal user push an order into a
 *   privileged merchant state. Marking an order confirmed/processing/shipped/
 *   delivered, or issuing a refund, is DENIED 403 unless a merchant authorizer
 *   (`setOrderMerchantAuthorizer`) approves the caller — deny by default. The
 *   only buyer-driven lifecycle action is cancelling a still-`pending` order.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
