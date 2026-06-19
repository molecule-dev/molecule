/**
 * Inventory route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Inventory resource routes.
 *
 * All routes require authentication. The destructive admin-side mutations
 * (`updateStock`, `bulkUpdate`) are additionally gated by the
 * `requireInventoryAdmin` middleware — a real `requestHandlerMap` key (see
 * {@link requireInventoryAdmin}) so the injector preserves it; the previously
 * declared bare `'authenticate'` string was silently dropped by the route
 * scanner, leaving stock open to rewrite by any authenticated user. Each
 * admin/reservation handler additionally re-checks authorization internally, so
 * the gate holds even if a consumer wires the routes without these middlewares.
 */
export const routes = [
  {
    method: 'get',
    path: '/inventory/:productId',
    handler: 'getStock',
    middlewares: ['authenticate'],
  },
  {
    method: 'put',
    path: '/inventory/:productId',
    handler: 'updateStock',
    middlewares: ['requireInventoryAdmin'],
  },
  {
    method: 'post',
    path: '/inventory/:productId/reserve',
    handler: 'reserve',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/inventory/reservations/:reservationId',
    handler: 'release',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/inventory/reservations/:reservationId/confirm',
    handler: 'confirm',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/inventory/alerts',
    handler: 'getAlerts',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/inventory/:productId/movements',
    handler: 'getMovements',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/inventory/bulk',
    handler: 'bulkUpdate',
    middlewares: ['requireInventoryAdmin'],
  },
] as const
