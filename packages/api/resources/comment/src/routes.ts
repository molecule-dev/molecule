/**
 * Comment route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/comments', handler: 'create' },
  { method: 'get', path: '/comments', handler: 'list' },
  { method: 'get', path: '/comments/:id', handler: 'read' },
  { method: 'patch', path: '/comments/:id', handler: 'update' },
  { method: 'delete', path: '/comments/:id', handler: 'del' },
] as const
