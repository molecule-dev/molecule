/**
 * Product route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * A product is a shared catalog entity with no per-user owner column, so the
 * mutation routes `update` (price/stock), `del`, and `createVariant` are gated
 * **admin-only** by the `requireAdmin` middleware (a real `requestHandlerMap`
 * key — see `authorizers/index.ts` — so the injector preserves it; the
 * previously declared global `'authenticate'` string was silently dropped by the
 * route scanner, leaving these routes open to any authenticated user). Each
 * handler additionally re-checks admin authorization internally, so the gate
 * holds even if a consumer wires the routes without applying these middlewares.
 *
 * @module
 */

/** Route array for product CRUD plus variant sub-resource. */
export const routes = [
  { method: 'post', path: '/products', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/products', handler: 'list' },
  { method: 'get', path: '/products/:id', handler: 'read' },
  { method: 'patch', path: '/products/:id', handler: 'update', middlewares: ['requireAdmin'] },
  { method: 'delete', path: '/products/:id', handler: 'del', middlewares: ['requireAdmin'] },
  { method: 'get', path: '/products/:id/variants', handler: 'listVariants' },
  {
    method: 'post',
    path: '/products/:id/variants',
    handler: 'createVariant',
    middlewares: ['requireAdmin'],
  },
] as const
