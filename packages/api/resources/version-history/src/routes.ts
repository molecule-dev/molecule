/**
 * Version-history route definitions.
 *
 * Declarative routing — `mlcl inject` reads this to generate the Express router.
 *
 * Append-only by design: there are no `PUT` or `DELETE` routes for individual
 * versions. The only mutation paths are `create` (capture a new snapshot) and
 * `restore` (capture a new snapshot equal to a prior one).
 *
 * @module
 */

/**
 * Routes for the version-history resource.
 */
export const routes = [
  {
    method: 'post',
    path: '/:resourceType/:resourceId/versions',
    handler: 'create',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/:resourceType/:resourceId/versions', handler: 'list' },
  { method: 'get', path: '/:resourceType/:resourceId/versions/count', handler: 'versionCount' },
  {
    method: 'get',
    path: '/:resourceType/:resourceId/versions/:version',
    handler: 'readByNumber',
  },
  { method: 'get', path: '/versions/:versionId', handler: 'read' },
  {
    method: 'post',
    path: '/versions/:versionId/restore',
    handler: 'restore',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/versions/:fromVersionId/diff/:toVersionId', handler: 'diff' },
] as const
