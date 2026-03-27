/**
 * Cart route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/carts', handler: 'create' },
  { method: 'get', path: '/carts', handler: 'list' },
  { method: 'get', path: '/carts/:id', handler: 'read' },
  { method: 'patch', path: '/carts/:id', handler: 'update' },
  { method: 'delete', path: '/carts/:id', handler: 'del' },
] as const
