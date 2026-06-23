/**
 * Order authorizers.
 *
 * Order routes use the `authenticate` middleware declared in route definitions.
 * Buyer-facing reads/writes self-enforce ownership inside each handler
 * (`orderRow.userId === userId` — the order owner is the BUYER).
 *
 * MERCHANT-ONLY lifecycle operations (confirm / process / ship / deliver /
 * refund, plus cancelling an already-progressed order) are gated by a
 * registerable merchant authorizer and DENY by default — mirroring
 * `@molecule/api-resource-share`'s `setShareAdminAuthorizer`. An order row
 * records only the BUYER (`userId`), so it cannot know who the seller/merchant
 * is; the consuming app MUST supply that knowledge. Until an app registers an
 * authorizer, every merchant op returns 403 (secure by default) — otherwise a
 * buyer could self-service the merchant lifecycle on their own order.
 *
 * @module
 */

import type { MoleculeRequest } from '@molecule/api-resource'

import type { OrderRow } from '../types.js'

/**
 * Merchant-ownership predicate: returns `true` when `userId` is a merchant /
 * seller / admin entitled to drive the given order's lifecycle (confirm,
 * process, ship, deliver, refund, or cancel an already-progressed order). It is
 * deliberately distinct from the buyer ownership check (`orderRow.userId ===
 * userId`): the order row records only the BUYER, so it has no inherent
 * knowledge of who the seller is — only the consuming app does.
 *
 * @param orderRow - The order being acted on.
 * @param userId - The authenticated user ID requesting the lifecycle op.
 * @param req - The originating request (optional), for apps that derive
 *   merchant identity from headers/claims rather than `userId` alone.
 * @returns `true` to allow the merchant op, `false` to deny.
 */
export type OrderMerchantAuthorizer = (
  orderRow: OrderRow,
  userId: string,
  req?: MoleculeRequest,
) => Promise<boolean> | boolean

let orderMerchantAuthorizer: OrderMerchantAuthorizer | null = null

/**
 * Registers the merchant authorizer consulted by the order lifecycle handlers
 * (`refund`, a merchant-state `updateStatus`, and cancellation of an
 * already-progressed order) before any mutation. **Until an app registers one,
 * every merchant op is DENIED (secure by default)** — the order row records
 * only the buyer, so the consuming app MUST supply who is entitled to act as
 * the seller/merchant on an order.
 *
 * Pass `null` to clear a previously-registered authorizer (restores default
 * deny).
 *
 * @param authorizer - The merchant predicate, or `null` to clear.
 */
export function setOrderMerchantAuthorizer(authorizer: OrderMerchantAuthorizer | null): void {
  orderMerchantAuthorizer = authorizer
}

/**
 * Returns the currently-registered merchant authorizer, or `null` when none
 * has been registered.
 *
 * @returns The registered authorizer, or `null`.
 */
export function getOrderMerchantAuthorizer(): OrderMerchantAuthorizer | null {
  return orderMerchantAuthorizer
}

/**
 * Default-DENY merchant gate. Returns `true` only when an authorizer has been
 * registered via {@link setOrderMerchantAuthorizer} AND that authorizer allows
 * `userId` to drive this order's lifecycle. When no authorizer is registered,
 * this returns `false` — the merchant-only handlers respond 403.
 *
 * @param orderRow - The order being acted on.
 * @param userId - The authenticated user ID.
 * @param req - The originating request (optional).
 * @returns `true` if the merchant op is allowed, otherwise `false`.
 */
export async function canDriveOrderLifecycle(
  orderRow: OrderRow,
  userId: string,
  req?: MoleculeRequest,
): Promise<boolean> {
  if (!orderMerchantAuthorizer) return false
  return orderMerchantAuthorizer(orderRow, userId, req)
}
