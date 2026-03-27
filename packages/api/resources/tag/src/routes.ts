/**
 * Tag route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/tags', handler: 'create' },
  { method: 'get', path: '/tags', handler: 'list' },
  { method: 'get', path: '/tags/:id', handler: 'read' },
  { method: 'patch', path: '/tags/:id', handler: 'update' },
  { method: 'delete', path: '/tags/:id', handler: 'del' },
] as const
