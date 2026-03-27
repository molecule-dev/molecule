/**
 * Order route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/orders', handler: 'create' },
  { method: 'get', path: '/orders', handler: 'list' },
  { method: 'get', path: '/orders/:id', handler: 'read' },
  { method: 'patch', path: '/orders/:id', handler: 'update' },
  { method: 'delete', path: '/orders/:id', handler: 'del' },
] as const
