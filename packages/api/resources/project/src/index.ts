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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip.
 * Project is strictly OWNER-scoped: a project belongs to exactly one user
 * (`userId`), with no members, collaborators, or roles — so every check is
 * about the owner seeing/mutating only their own rows, never a shared grant:
 * - [ ] Creating a project persists its real fields (name → derived slug,
 *   projectType, framework, packages) and it appears at the top of the owner's
 *   project list (the list is scoped to the session user, newest-updated first).
 * - [ ] Editing reflects and persists: renaming updates the name; a single-key
 *   settings/envVars PATCH MERGES onto the stored bag without wiping sibling
 *   keys; a sandboxStatus change round-trips. Reload — the changes survive.
 * - [ ] Deleting a project removes it from the owner's list and a re-fetch of
 *   its id no longer returns it; there are no members to notify or re-scope.
 * - [ ] Authorization — the list and every `:id` route return ONLY projects the
 *   caller owns. Signed in as a second user (or guessing another user's project
 *   id), GET/PATCH/DELETE `/projects/:id` is refused (403/404) and the row is
 *   neither readable nor mutable; existence is not leaked to a non-owner.
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
