/**
 * Inventory route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Inventory resource routes. All routes require authentication.
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
    middlewares: ['authenticate'],
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
    middlewares: ['authenticate'],
  },
] as const
