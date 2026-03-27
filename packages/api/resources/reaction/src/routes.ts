/**
 * Reaction route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for reaction add/remove/summary.
 */
export const routes = [
  {
    method: 'post',
    path: '/:resourceType/:resourceId/reactions',
    handler: 'create',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/:resourceType/:resourceId/reactions',
    handler: 'del',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/:resourceType/:resourceId/reactions', handler: 'list' },
] as const
