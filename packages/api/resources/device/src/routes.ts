/** Declarative route definitions for the Device resource, used to generate the Express router. */
export const routes = [
  { method: 'get' as const, path: '/devices', middlewares: ['auth'], handler: 'query' },
  { method: 'get' as const, path: '/devices/:id', middlewares: ['authUser'], handler: 'read' },
  { method: 'patch' as const, path: '/devices/:id', middlewares: ['authUser'], handler: 'update' },
  { method: 'delete' as const, path: '/devices/:id', middlewares: ['authUser'], handler: 'del' },
]
