/**
 * Article route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express
 * router. `feed` and `tags` come before `:slug`, and those two words are never
 * given to an article as its slug.
 *
 * @module
 */

/**
 * Routes for articles, the feed, tags and favorites.
 */
export const routes = [
  { method: 'post', path: '/articles', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/articles', handler: 'list' },
  { method: 'get', path: '/articles/feed', handler: 'feed', middlewares: ['authenticate'] },
  { method: 'get', path: '/articles/tags', handler: 'tags' },
  { method: 'get', path: '/articles/:slug', handler: 'read' },
  { method: 'put', path: '/articles/:slug', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/articles/:slug', handler: 'del', middlewares: ['authenticate'] },
  {
    method: 'post',
    path: '/articles/:slug/favorite',
    handler: 'favorite',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/articles/:slug/favorite',
    handler: 'unfavorite',
    middlewares: ['authenticate'],
  },
] as const
