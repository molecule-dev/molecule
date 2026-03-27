/**
 * Bookmark route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for bookmark add/remove/list/check and folder listing.
 */
export const routes = [
  { method: 'post', path: '/bookmarks', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/bookmarks', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/bookmarks/folders', handler: 'folders', middlewares: ['authenticate'] },
  {
    method: 'get',
    path: '/bookmarks/check/:resourceType/:resourceId',
    handler: 'check',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/bookmarks/:resourceType/:resourceId',
    handler: 'del',
    middlewares: ['authenticate'],
  },
] as const
