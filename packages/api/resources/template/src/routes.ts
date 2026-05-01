/**
 * Resource template route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router.
 *
 * @module
 */

/**
 * HTTP routes for template CRUD and instantiation.
 */
export const routes = [
  { method: 'post', path: '/resource-templates', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/resource-templates', handler: 'list', middlewares: ['authenticate'] },
  {
    method: 'get',
    path: '/resource-templates/:id',
    handler: 'read',
    middlewares: ['authenticate'],
  },
  {
    method: 'patch',
    path: '/resource-templates/:id',
    handler: 'update',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/resource-templates/:id',
    handler: 'del',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/resource-templates/:id/instantiate',
    handler: 'instantiate',
    middlewares: ['authenticate'],
  },
] as const
