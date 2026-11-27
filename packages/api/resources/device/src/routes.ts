/** Declarative route definitions for the Device resource, used to generate the Express router. */
export const routes = [
  // Declared BEFORE /devices/:id so a literal "push" segment can never be
  // captured as an :id. Public (no auth): the VAPID public key ships inside
  // every push-service subscription request the browser makes anyway. Mounted
  // only with a push provider: without one it answers 404 on every request.
  {
    method: 'get' as const,
    path: '/devices/push/public-key',
    middlewares: [],
    handler: 'pushPublicKey',
    optional: 'push',
  },
  {
    method: 'get' as const,
    path: '/devices',
    middlewares: ['auth'],
    handler: 'query',
    optional: 'devices',
  },
  {
    method: 'get' as const,
    path: '/devices/:id',
    middlewares: ['authUser'],
    handler: 'read',
    optional: 'devices',
  },
  {
    method: 'patch' as const,
    path: '/devices/:id',
    middlewares: ['authUser'],
    handler: 'update',
    optional: 'devices',
  },
  {
    method: 'delete' as const,
    path: '/devices/:id',
    middlewares: ['authUser'],
    handler: 'del',
    optional: 'devices',
  },
]
