/**
 * Order route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * SECURITY: the MERCHANT-ONLY lifecycle routes — `PUT /orders/:id/status`
 * (`updateStatus`) for a transition into a merchant state (confirmed/processing/
 * shipped/delivered/refunded), `POST /orders/:id/refund` (`refund`), and
 * `POST /orders/:id/cancel` (`cancel`) of an already-progressed order — must NOT
 * be driven by the order owner. The order owner is the BUYER, so an owner check
 * alone would let a buyer self-service the merchant lifecycle on their own order.
 * These routes stay auto-mounted (the gate lives in the handlers, not the route
 * table), but the merchant ops DENY by default and fail-closed until the
 * consuming app registers a merchant authorizer via `setOrderMerchantAuthorizer`
 * — until then every merchant op returns 403. The only buyer self-service
 * lifecycle action is cancelling an order while it is still `pending` (owner
 * check); everything else is merchant-only. Create / list / read / history
 * remain buyer-owned and self-enforce ownership.
 *
 * @module
 */

/**
 * Order resource routes. All routes require authentication. The lifecycle
 * mutations (updateStatus/refund/cancel) additionally gate merchant-only
 * operations behind `setOrderMerchantAuthorizer` (see the module SECURITY note).
 */
export const routes = [
  { method: 'post', path: '/orders', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/orders', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/orders/:id', handler: 'read', middlewares: ['authenticate'] },
  {
    method: 'put',
    path: '/orders/:id/status',
    handler: 'updateStatus',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/orders/:id/cancel',
    handler: 'cancel',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/orders/:id/refund',
    handler: 'refund',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/orders/:id/history',
    handler: 'getHistory',
    middlewares: ['authenticate'],
  },
] as const
