/**
 * Comment route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for comment CRUD and threaded replies.
 */
export const routes = [
  {
    method: 'post',
    path: '/:resourceType/:resourceId/comments',
    handler: 'create',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/:resourceType/:resourceId/comments', handler: 'list' },
  { method: 'get', path: '/:resourceType/:resourceId/comments/count', handler: 'commentCount' },
  { method: 'get', path: '/comments/:commentId', handler: 'read' },
  { method: 'put', path: '/comments/:commentId', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/comments/:commentId', handler: 'del', middlewares: ['authenticate'] },
  { method: 'get', path: '/comments/:commentId/replies', handler: 'replies' },
] as const
