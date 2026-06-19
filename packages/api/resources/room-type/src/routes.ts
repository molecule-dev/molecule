/**
 * Room-type route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router. Reads are open so that public listings work without a session.
 *
 * A room type has no per-user owner column, so the price/inventory mutation
 * routes `create`/`update`/`del` are gated **admin-only** by the `requireAdmin`
 * middleware (a real `requestHandlerMap` key — see `authorizers/index.ts` — so
 * the injector preserves it; the previously declared global `'authenticate'`
 * string was silently dropped by the route scanner, leaving these routes open to
 * any authenticated user). Each handler additionally re-checks admin
 * authorization internally, so the gate holds even if a consumer wires the
 * routes without applying these middlewares.
 *
 * @module
 */

/**
 * Room-type resource routes.
 */
export const routes = [
  { method: 'post', path: '/room-types', handler: 'create', middlewares: ['requireAdmin'] },
  { method: 'get', path: '/room-types', handler: 'list' },
  { method: 'get', path: '/room-types/:id', handler: 'read' },
  { method: 'patch', path: '/room-types/:id', handler: 'update', middlewares: ['requireAdmin'] },
  { method: 'delete', path: '/room-types/:id', handler: 'del', middlewares: ['requireAdmin'] },
] as const
