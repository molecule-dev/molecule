/**
 * project resource for molecule.dev.
 *
 * @remarks
 * The shipped routes are owner-scoped and **fail closed** — they do not expose
 * other tenants' projects by default. `GET /projects` (`list`) returns only the
 * authenticated caller's rows (scoped to `session.userId`), and the object-level
 * routes `GET/PATCH/DELETE /projects/:id` are gated by the `authUser` authorizer,
 * which loads the project scoped to the caller's `userId`, stashes it on
 * `res.locals.project`, and responds `401` (no session) / `403` (not the owner)
 * otherwise. This mirrors `@molecule/api-resource-device`. A consumer that needs
 * a richer access model (e.g. owner-or-team) can gate the route with its own
 * middleware and set `res.locals.project` to the pre-authorized row — `read`,
 * `update`, and `del` reuse it instead of re-deriving ownership.
 *
 * @module
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
