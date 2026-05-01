/**
 * Address route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router.
 *
 * @module
 */

/**
 * Routes for address CRUD plus a dedicated `setDefault` endpoint that toggles
 * the per-user default-shipping or default-billing flag atomically.
 */
export const routes = [
  { method: 'post', path: '/addresses', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/addresses', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/addresses/:id', handler: 'read', middlewares: ['authenticate'] },
  { method: 'patch', path: '/addresses/:id', handler: 'update', middlewares: ['authenticate'] },
  {
    method: 'post',
    path: '/addresses/:id/default',
    handler: 'setAsDefault',
    middlewares: ['authenticate'],
  },
  { method: 'delete', path: '/addresses/:id', handler: 'del', middlewares: ['authenticate'] },
] as const
