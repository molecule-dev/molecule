/**
 * Review route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for review CRUD, rating statistics, and helpfulness voting.
 */
export const routes = [
  {
    method: 'post',
    path: '/:resourceType/:resourceId/reviews',
    handler: 'create',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/:resourceType/:resourceId/reviews', handler: 'list' },
  { method: 'get', path: '/:resourceType/:resourceId/reviews/rating', handler: 'averageRating' },
  { method: 'get', path: '/reviews/:reviewId', handler: 'read' },
  {
    method: 'put',
    path: '/reviews/:reviewId',
    handler: 'update',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/reviews/:reviewId',
    handler: 'del',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/reviews/:reviewId/helpful',
    handler: 'helpful',
    middlewares: ['authenticate'],
  },
] as const
