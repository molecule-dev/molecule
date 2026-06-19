/**
 * Subscriber route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for the subscriber resource. Public endpoints (`subscribe`, `confirm`,
 * `unsubscribe`) intentionally have no middleware so anonymous visitors of a
 * status page or newsletter form can use them.
 *
 * Listing, reading, and deletion expose / mutate subscriber PII and are gated
 * **admin-only** by the `requireAdmin` middleware (a real `requestHandlerMap`
 * key — see {@link requireAdmin} — so the injector preserves it; the previously
 * declared global `'authenticate'` string was silently dropped by the route
 * scanner, leaving these routes open to any authenticated user). Each handler
 * additionally re-checks admin authorization internally, so the gate holds even
 * if a consumer wires the routes without applying these middlewares.
 */
export const routes = [
  { method: 'post', path: '/subscribers', handler: 'subscribe' },
  { method: 'get', path: '/subscribers/confirm/:token', handler: 'confirm' },
  { method: 'post', path: '/subscribers/unsubscribe/:token', handler: 'unsubscribe' },
  { method: 'get', path: '/subscribers', handler: 'list', middlewares: ['requireAdmin'] },
  { method: 'get', path: '/subscribers/:id', handler: 'read', middlewares: ['requireAdmin'] },
  { method: 'delete', path: '/subscribers/:id', handler: 'del', middlewares: ['requireAdmin'] },
] as const
