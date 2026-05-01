/**
 * Trash route definitions.
 *
 * Declarative routing — `mlcl inject` reads this to generate the Express
 * router. Restore is intentionally a separate POST route from the
 * trash-row read so that read access can be relaxed to non-mutating
 * inspection while restore stays gated by `authenticate`.
 *
 * @module
 */

/**
 * Routes for the trash helper.
 */
export const routes = [
  {
    method: 'post',
    path: '/:resourceType/:resourceId/trash',
    handler: 'trash',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/trash', handler: 'list' },
  { method: 'get', path: '/trash/count', handler: 'trashCount' },
  { method: 'get', path: '/trash/:trashId', handler: 'read' },
  {
    method: 'post',
    path: '/trash/:trashId/restore',
    handler: 'restore',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/trash/:trashId/purge',
    handler: 'purge',
    middlewares: ['authenticate'],
  },
] as const
