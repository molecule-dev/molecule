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
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
