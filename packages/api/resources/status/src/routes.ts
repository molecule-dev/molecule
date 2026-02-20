/**
 * Status resource route definitions.
 *
 * Declarative route definitions used to generate the Express router.
 *
 * @module
 */

/** Route array for status page endpoints: public read routes and authenticated admin routes. */
export const routes = [
  // Public endpoints
  { method: 'get' as const, path: '/status', middlewares: [], handler: 'getStatus' },
  { method: 'get' as const, path: '/status/services', middlewares: [], handler: 'listServices' },
  {
    method: 'get' as const,
    path: '/status/services/:id',
    middlewares: [],
    handler: 'getService',
  },
  {
    method: 'get' as const,
    path: '/status/incidents',
    middlewares: [],
    handler: 'listIncidents',
  },
  { method: 'get' as const, path: '/status/uptime', middlewares: [], handler: 'getUptime' },

  // Admin endpoints
  {
    method: 'post' as const,
    path: '/status/services',
    middlewares: ['auth'],
    handler: 'createService',
  },
  {
    method: 'patch' as const,
    path: '/status/services/:id',
    middlewares: ['auth'],
    handler: 'updateService',
  },
  {
    method: 'delete' as const,
    path: '/status/services/:id',
    middlewares: ['auth'],
    handler: 'deleteService',
  },
  {
    method: 'post' as const,
    path: '/status/incidents',
    middlewares: ['auth'],
    handler: 'createIncident',
  },
  {
    method: 'patch' as const,
    path: '/status/incidents/:id',
    middlewares: ['auth'],
    handler: 'updateIncident',
  },
]
