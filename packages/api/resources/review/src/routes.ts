/**
 * Review route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/reviews', handler: 'create' },
  { method: 'get', path: '/reviews', handler: 'list' },
  { method: 'get', path: '/reviews/:id', handler: 'read' },
  { method: 'patch', path: '/reviews/:id', handler: 'update' },
  { method: 'delete', path: '/reviews/:id', handler: 'del' },
] as const
