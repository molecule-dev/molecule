/**
 * Follow route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/follows', handler: 'create' },
  { method: 'get', path: '/follows', handler: 'list' },
  { method: 'get', path: '/follows/:id', handler: 'read' },
  { method: 'patch', path: '/follows/:id', handler: 'update' },
  { method: 'delete', path: '/follows/:id', handler: 'del' },
] as const
