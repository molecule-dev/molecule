/**
 * Resource-share route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router. The public-link resolve endpoint intentionally has no
 * `authenticate` middleware: the slug itself is the credential.
 *
 * @module
 */

/**
 * HTTP routes for share grants and public link tokens.
 */
export const routes = [
  // Direct ACL grants
  { method: 'post', path: '/resource-shares', handler: 'create', middlewares: ['authenticate'] },
  {
    method: 'get',
    path: '/resource-shares/:resourceType/:resourceId',
    handler: 'list',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/resource-shares/:resourceType/:resourceId/role',
    handler: 'read',
    middlewares: ['authenticate'],
  },
  {
    method: 'patch',
    path: '/resource-shares/:id',
    handler: 'update',
    middlewares: ['authenticate'],
  },
  { method: 'delete', path: '/resource-shares/:id', handler: 'del', middlewares: ['authenticate'] },

  // Public share links
  {
    method: 'post',
    path: '/resource-share-links',
    handler: 'createLink',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/resource-share-links/:resourceType/:resourceId',
    handler: 'listLinks',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/resource-share-links/:id',
    handler: 'revokeLink',
    middlewares: ['authenticate'],
  },
  // Public — slug is the credential.
  { method: 'get', path: '/resource-share-links/resolve/:slug', handler: 'resolveLink' },
] as const
