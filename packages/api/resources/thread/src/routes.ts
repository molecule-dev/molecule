/**
 * Thread route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/threads', handler: 'create' },
  { method: 'get', path: '/threads', handler: 'list' },
  { method: 'get', path: '/threads/:id', handler: 'read' },
  { method: 'patch', path: '/threads/:id', handler: 'update' },
  { method: 'delete', path: '/threads/:id', handler: 'del' },
] as const
