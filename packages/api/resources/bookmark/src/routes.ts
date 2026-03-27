/**
 * Bookmark route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/bookmarks', handler: 'create' },
  { method: 'get', path: '/bookmarks', handler: 'list' },
  { method: 'get', path: '/bookmarks/:id', handler: 'read' },
  { method: 'patch', path: '/bookmarks/:id', handler: 'update' },
  { method: 'delete', path: '/bookmarks/:id', handler: 'del' },
] as const
