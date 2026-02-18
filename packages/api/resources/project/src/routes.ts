/**
 * Project route definitions.
 *
 * Declarative route definitions used to generate the Express router.
 *
 * @module
 */

/** Route array for project CRUD: POST create, GET list, GET/:id read, PATCH/:id update, DELETE/:id del. */
export const routes = [
  { method: 'post', path: '/projects', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/projects', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/projects/:id', handler: 'read', middlewares: ['authenticate'] },
  { method: 'patch', path: '/projects/:id', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/projects/:id', handler: 'del', middlewares: ['authenticate'] },
] as const
