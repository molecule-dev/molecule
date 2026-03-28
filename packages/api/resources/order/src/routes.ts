/**
 * Order route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Order resource routes. All routes require authentication.
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
