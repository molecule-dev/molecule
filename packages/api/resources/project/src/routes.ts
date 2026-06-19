/**
 * Project route definitions.
 *
 * Declarative route definitions used to generate the Express router.
 *
 * @module
 */

/**
 * Route array for project CRUD: POST create, GET list, GET/:id read, PATCH/:id update, DELETE/:id del.
 *
 * `create`/`list` only need an authenticated session (`authenticate`); the `list`
 * handler itself scopes results to the caller's `userId`. The object-level
 * routes (`read`/`update`/`del`) are gated by `authUser`, which fails closed —
 * it loads the project scoped to the caller's `userId` and 401/403s otherwise —
 * so generated apps that wire this resource do NOT expose other tenants' projects
 * by default. Mirrors `@molecule/api-resource-device`.
 */
export const routes = [
  { method: 'post', path: '/projects', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/projects', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/projects/:id', handler: 'read', middlewares: ['authUser'] },
  { method: 'patch', path: '/projects/:id', handler: 'update', middlewares: ['authUser'] },
  { method: 'delete', path: '/projects/:id', handler: 'del', middlewares: ['authUser'] },
] as const
