/**
 * Streak route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the
 * Express router for streak endpoints.
 *
 * @module
 */

/**
 * Routes for streak record / read / freeze operations. All require an
 * authenticated session — the user ID is derived from `res.locals.session`,
 * never from the request body or path.
 */
export const routes = [
  {
    method: 'post',
    path: '/streaks/:activityKind',
    handler: 'record',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/streaks/:activityKind', handler: 'read', middlewares: ['authenticate'] },
  {
    method: 'post',
    path: '/streaks/:activityKind/freeze',
    handler: 'freeze',
    middlewares: ['authenticate'],
  },
] as const
