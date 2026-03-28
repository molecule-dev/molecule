/**
 * Follow route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for follow/unfollow, followers, following, and status check.
 */
export const routes = [
  {
    method: 'post',
    path: '/follow/:targetType/:targetId',
    handler: 'create',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/follow/:targetType/:targetId',
    handler: 'del',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/:targetType/:targetId/followers', handler: 'list' },
  { method: 'get', path: '/following', handler: 'following', middlewares: ['authenticate'] },
  {
    method: 'get',
    path: '/follow/check/:targetType/:targetId',
    handler: 'checkFollowing',
    middlewares: ['authenticate'],
  },
] as const
