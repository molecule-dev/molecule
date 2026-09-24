/**
 * Resource-template resource for molecule.dev.
 *
 * Generic template registry: store reusable, versioned snapshots keyed by
 * (`resourceType`, `slug`) plus a pure-data `instantiate` helper that
 * resolves `{{variable}}` placeholders inside the snapshot to materialise
 * a concrete payload. Handler errors flow through `t()` with English
 * defaults — no companion locale bond is shipped (no user-visible UI text
 * lives in this package).
 *
 * @module
 * @example
 * ```typescript
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { createTemplate, instantiateById } from '@molecule/api-resource-template'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL). `mlcl inject`
 * // mounts `routes` (POST/GET /resource-templates, GET/PATCH/DELETE /resource-templates/:id,
 * // POST /resource-templates/:id/instantiate { variables }) behind `authenticate`.
 * setStore(store)
 *
 * // Server-side code: `createdBy` is always the SESSION user (res.locals.session.userId).
 * const template = await createTemplate({
 *   resourceType: 'document',
 *   slug: 'welcome-letter',
 *   name: 'Welcome letter',
 *   snapshot: { title: 'Hello {{name}}', body: '{{greeting}}!' },
 *   variables: [{ name: 'name', required: true }, { name: 'greeting', defaultValue: 'Welcome' }],
 *   createdBy: 'user-1',
 * })
 *
 * const result = await instantiateById(template.id, { name: 'Ada' })
 * console.log(result?.payload) // { title: 'Hello Ada', body: 'Welcome!' }
 * console.log(result?.missingVariables) // [] — names of required/unresolved variables otherwise
 * ```
 *
 * @remarks
 * - **Bond the DataStore before any call** (`setStore(...)`), or every service function throws.
 * - **Instantiating does NOT create anything.** `instantiateById`/`instantiateTemplate` only
 *   return `{ payload, resolvedVariables, missingVariables }`; persist `payload` through the
 *   target resource yourself, and refuse it when `missingVariables` is non-empty (missing
 *   placeholders are left as-is, not thrown).
 * - `createTemplate` throws an Error with `code: 'conflict'` for a duplicate
 *   `(resourceType, slug)`; templates are private (`isPublic: false`) unless you say otherwise.
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
 * Session-auth prerequisite: every route — including reads — requires an
 * authenticated session; handlers read `res.locals.session.userId` and fail
 * closed with 401, so mount behind your global auth middleware. Visibility is
 * per-row: a template is readable when `isPublic` is true or the caller is its
 * `createdBy` creator (`canViewTemplate`), and editable/deletable ONLY by its
 * creator (`canEditTemplate`) — a non-visible row returns 404 (existence is
 * not leaked); a public row edited by a non-owner returns 403. `createdBy` is
 * derived from the session, never from the request body.
 *
 * `(resourceType, slug)` is UNIQUE — a duplicate `create` returns 409
 * (`template.error.conflict`).
 *
 * Tables: `src/__setup__/resource-templates.sql` creates `resource-templates`
 * (note the hyphenated table name). An mlcl-scaffolded API replays
 * `__setup__/*.sql` automatically on migrate; anywhere else run it once —
 * nothing at runtime creates them.
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
