/**
 * Product route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/products', handler: 'create' },
  { method: 'get', path: '/products', handler: 'list' },
  { method: 'get', path: '/products/:id', handler: 'read' },
  { method: 'patch', path: '/products/:id', handler: 'update' },
  { method: 'delete', path: '/products/:id', handler: 'del' },
] as const
