/**
 * Room-type route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router. Routes that mutate inventory (create/update/delete) require the
 * `authenticate` middleware; reads are open so that public listings work
 * without a session.
 *
 * @module
 */

/**
 * Room-type resource routes.
 */
export const routes = [
  { method: 'post', path: '/room-types', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/room-types', handler: 'list' },
  { method: 'get', path: '/room-types/:id', handler: 'read' },
  { method: 'patch', path: '/room-types/:id', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/room-types/:id', handler: 'del', middlewares: ['authenticate'] },
] as const
