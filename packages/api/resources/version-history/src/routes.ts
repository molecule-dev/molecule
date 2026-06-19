/**
 * Version-history route definitions.
 *
 * Declarative routing — `mlcl inject` reads this to generate the Express router.
 *
 * Append-only by design: there are no `PUT` or `DELETE` routes for individual
 * versions. The only mutation paths are `create` (capture a new snapshot) and
 * `restore` (capture a new snapshot equal to a prior one).
 *
 * **Secure by default.** Snapshots can hold any tenant's data, so EVERY route
 * requires an authenticated session (`authenticate`) AND its handler re-derives
 * the caller from `res.locals.session.userId` and authorizes access to the
 * *parent* resource via the pluggable, fail-closed ownership resolver
 * (`registerOwnershipResolver`). The in-handler gate holds even if the injector
 * drops a middleware string (defense-in-depth, mirroring
 * `@molecule/api-resource-trash`); with no registered resolver every read/list/
 * diff/restore returns 404 (no existence leak) rather than exposing snapshots.
 *
 * Legitimate cross-tenant access (an admin/compliance console) is opt-in:
 * compose the {@link versionHistoryAdmin} middleware onto a route to widen an
 * authenticated *admin* to all users' versions. Without it, every caller is
 * subject to the ownership resolver — there is no open endpoint.
 *
 * @module
 */

/**
 * Routes for the version-history resource. All routes require `authenticate`;
 * the handlers additionally authorize every read/mutation against the caller's
 * ownership of the parent resource.
 */
export const routes = [
  {
    method: 'post',
    path: '/:resourceType/:resourceId/versions',
    handler: 'create',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/:resourceType/:resourceId/versions',
    handler: 'list',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/:resourceType/:resourceId/versions/count',
    handler: 'versionCount',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/:resourceType/:resourceId/versions/:version',
    handler: 'readByNumber',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/versions/:versionId', handler: 'read', middlewares: ['authenticate'] },
  {
    method: 'post',
    path: '/versions/:versionId/restore',
    handler: 'restore',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/versions/:fromVersionId/diff/:toVersionId',
    handler: 'diff',
    middlewares: ['authenticate'],
  },
] as const
