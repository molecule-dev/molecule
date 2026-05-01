/**
 * Reputation route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the
 * Express router for reputation endpoints.
 *
 * @module
 */

/**
 * Routes for public reputation reads. No authentication is required:
 * reputation/badge data is treated as public profile information by
 * the social-app templates that consume this package.
 */
export const routes = [
  {
    method: 'get',
    path: '/users/:id/reputation',
    handler: 'getReputation',
    middlewares: [],
  },
  {
    method: 'get',
    path: '/users/:id/badges',
    handler: 'getBadges',
    middlewares: [],
  },
] as const
