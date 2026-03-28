/**
 * Tag route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/** Route array for tag CRUD plus resource-tagging and popular/slug lookups. */
export const routes = [
  { method: 'post', path: '/tags', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/tags', handler: 'list' },
  { method: 'get', path: '/tags/popular', handler: 'popular' },
  { method: 'get', path: '/tags/:id', handler: 'read' },
  { method: 'patch', path: '/tags/:id', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/tags/:id', handler: 'del', middlewares: ['authenticate'] },
  { method: 'get', path: '/tags/:slug/resources', handler: 'getBySlug' },
  {
    method: 'post',
    path: '/:resourceType/:resourceId/tags',
    handler: 'addTag',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/:resourceType/:resourceId/tags/:tagId',
    handler: 'removeTag',
    middlewares: ['authenticate'],
  },
] as const
