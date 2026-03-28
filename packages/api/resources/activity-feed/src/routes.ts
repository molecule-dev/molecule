/**
 * Activity feed route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for activity feed operations.
 */
export const routes = [
  {
    method: 'post',
    path: '/activities',
    handler: 'logActivity',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/activities/feed',
    handler: 'feed',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/activities/unseen',
    handler: 'unseen',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/activities/seen',
    handler: 'markSeen',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/activities/:resourceType/:resourceId',
    handler: 'timeline',
  },
] as const
