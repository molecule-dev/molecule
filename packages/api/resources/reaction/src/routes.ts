/**
 * Reaction route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/reactions', handler: 'create' },
  { method: 'get', path: '/reactions', handler: 'list' },
  { method: 'get', path: '/reactions/:id', handler: 'read' },
  { method: 'patch', path: '/reactions/:id', handler: 'update' },
  { method: 'delete', path: '/reactions/:id', handler: 'del' },
] as const
