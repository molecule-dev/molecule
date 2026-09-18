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
 * **SECURITY — unit prices are SERVER-RE-PRICED when a product catalog
 * exists; without one, `create()` still trusts client-supplied amounts.**
 * `create()` runs a server-side re-pricer: when the bonded data store
 * exposes a `products` table (the catalog owned by
 * `@molecule/api-resource-product`), each item's unit price is re-resolved
 * from the catalog by `productId` (honouring a `product_variants` price
 * override), `subtotal`/`total` are computed from the CATALOG prices, and
 * the persisted `order_items.price` carries the server value — the
 * client's `price` is discarded. Items whose product is missing from (or
 * soft-deleted in) an existing catalog are rejected 400. FALLBACK: this
 * resource is GENERIC and owns no catalog; when the data store has no
 * readable `products` table, `create()` keeps the legacy behavior — the
 * order `total` (`subtotal − discount + tax + shipping`) comes from the
 * body's `items[].price`, `discount`, `tax`, and `shipping`, with only
 * malformed money rejected (negative amounts, non-integer or `< 1`
 * `quantity`). `discount`/`tax`/`shipping` are client-supplied in BOTH
 * modes. Any code that CHARGES off an order must still resolve those
 * server-side (or install the product catalog so item prices are
 * authoritative). Use the stock `create()` for non-charging flows (drafts,
 * internal/admin order entry, an order that was already server-priced
 * upstream), or wire payments only alongside an installed catalog.
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
 *   submitted (productId, name, quantity) and a correctly-computed total:
 *   `subtotal` = the sum of price x quantity across items, and `total`
 *   = subtotal - discount + tax + shipping. The amount the UI shows matches
 *   that formula to the cent. NOTE the price SOURCE: with a `products`
 *   catalog installed it is the server-resolved catalog price (a UI
 *   displaying a stale/different price than the persisted order item is an
 *   integration bug to fix on the UI side); without a catalog it is the
 *   submitted `price` verbatim.
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
