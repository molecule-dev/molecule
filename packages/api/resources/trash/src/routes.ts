/**
 * Trash route definitions.
 *
 * Declarative routing — `mlcl inject` reads this to generate the Express
 * router.
 *
 * Every trash route requires an authenticated session (`authenticate`) AND
 * is owner-scoped inside its handler: trash rows capture snapshots of
 * deleted records (potentially sensitive), so list/count/read return only
 * the caller's own rows and restore/purge act only on rows the caller owns.
 * The handlers re-derive the owner from `res.locals.session.userId` and
 * ignore any client-supplied `userId`, so the gate holds even if the
 * injector drops a middleware string (defense-in-depth, mirroring
 * `@molecule/api-resource-project`).
 *
 * Legitimate cross-user inspection (an admin trash console) is opt-in:
 * compose the {@link trashAdmin} middleware onto a route to widen an
 * authenticated *admin* to all users' rows. Without it, every caller is
 * scoped to themselves — there is no open endpoint.
 *
 * @module
 */

/**
 * Routes for the trash helper. All routes require `authenticate`; the
 * handlers additionally scope every read/mutation to the caller's `userId`.
 */
export const routes = [
  {
    method: 'post',
    path: '/:resourceType/:resourceId/trash',
    handler: 'trash',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/trash', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/trash/count', handler: 'trashCount', middlewares: ['authenticate'] },
  { method: 'get', path: '/trash/:trashId', handler: 'read', middlewares: ['authenticate'] },
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
