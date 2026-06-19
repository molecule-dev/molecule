/**
 * Status resource route definitions.
 *
 * Declarative route definitions used to generate the Express router.
 *
 * The GET routes are intentionally **public** (the status page is a public
 * surface). The mutating routes are gated by the `requireAdmin` status-management
 * authorizer (a real `requestHandlerMap` key — see `authorizers/index.ts` — so the
 * injector preserves it; the previously declared `'auth'` string was silently
 * dropped by the route scanner because it isn't a handler-map key, leaving the
 * mutating routes open to any caller). Each mutation handler additionally
 * re-checks authorization internally, so the gate holds even if a consumer wires
 * the routes without applying these middlewares.
 *
 * @module
 */

/** Route array for status page endpoints: public read routes and admin-gated mutation routes. */
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
    middlewares: ['requireAdmin'],
    handler: 'createService',
  },
  {
    method: 'patch' as const,
    path: '/status/services/:id',
    middlewares: ['requireAdmin'],
    handler: 'updateService',
  },
  {
    method: 'delete' as const,
    path: '/status/services/:id',
    middlewares: ['requireAdmin'],
    handler: 'deleteService',
  },
  {
    method: 'post' as const,
    path: '/status/incidents',
    middlewares: ['requireAdmin'],
    handler: 'createIncident',
  },
  {
    method: 'patch' as const,
    path: '/status/incidents/:id',
    middlewares: ['requireAdmin'],
    handler: 'updateIncident',
  },
]
