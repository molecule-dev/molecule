/**
 * Tag route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * Tags are a shared global taxonomy with no per-row owner, so the mutation
 * routes `update`/`del` are gated **admin-only** by the `requireAdmin`
 * middleware (a real `requestHandlerMap` key — see `authorizers/index.ts` — so
 * the injector preserves it; the previously declared global `'authenticate'`
 * string was silently dropped by the route scanner, leaving these routes open
 * to any authenticated user). Each handler additionally re-checks admin
 * authorization internally, so the gate holds even if a consumer wires the
 * routes without applying these middlewares. The resource↔tag association routes
 * (`addTag`/`removeTag`) keep `authenticate` — they are governed by the owner of
 * the tagged resource, not by tag administration.
 *
 * @module
 */

/** Route array for tag CRUD plus resource-tagging and popular/slug lookups. */
export const routes = [
  { method: 'post', path: '/tags', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/tags', handler: 'list' },
  { method: 'get', path: '/tags/popular', handler: 'popular' },
  { method: 'get', path: '/tags/:id', handler: 'read' },
  { method: 'patch', path: '/tags/:id', handler: 'update', middlewares: ['requireAdmin'] },
  { method: 'delete', path: '/tags/:id', handler: 'del', middlewares: ['requireAdmin'] },
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
