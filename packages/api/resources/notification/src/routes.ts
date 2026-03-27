/**
 * Notification route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/notifications', handler: 'create' },
  { method: 'get', path: '/notifications', handler: 'list' },
  { method: 'get', path: '/notifications/:id', handler: 'read' },
  { method: 'patch', path: '/notifications/:id', handler: 'update' },
  { method: 'delete', path: '/notifications/:id', handler: 'del' },
] as const
