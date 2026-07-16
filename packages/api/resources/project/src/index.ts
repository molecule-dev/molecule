/**
 * Owner-scoped project resource for molecule.dev — CRUD handlers, routes, and
 * an `authUser` object-level authorizer, wired via `routes` +
 * `requestHandlerMap`.
 *
 * @example
 * ```ts
 * import { routes, requestHandlerMap } from '@molecule/api-resource-project'
 * // POST|GET /projects · GET|PATCH|DELETE /projects/:id — registered by
 * // mlcl inject, or manually:
 * // for (const r of routes) app[r.method](r.path, requestHandlerMap[r.handler])
 * ```
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
 * Table: `src/__setup__/projects.sql` creates `projects`. An mlcl-scaffolded
 * API replays `__setup__/*.sql` automatically on migrate; anywhere else run
 * it once. User-facing strings use `t(key, …, { defaultValue })`; translations
 * ship in the companion `@molecule/api-locales-project` bond.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
