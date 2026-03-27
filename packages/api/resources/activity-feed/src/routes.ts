/**
 * ActivityFeed route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/activity-feeds', handler: 'create' },
  { method: 'get', path: '/activity-feeds', handler: 'list' },
  { method: 'get', path: '/activity-feeds/:id', handler: 'read' },
  { method: 'patch', path: '/activity-feeds/:id', handler: 'update' },
  { method: 'delete', path: '/activity-feeds/:id', handler: 'del' },
] as const
