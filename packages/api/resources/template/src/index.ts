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
 * import { routes, requestHandlerMap } from '@molecule/api-resource-template'
 *
 * // Wire routes into your Express app via `mlcl inject`:
 * // POST   /resource-templates
 * // GET    /resource-templates
 * // GET    /resource-templates/:id
 * // PATCH  /resource-templates/:id
 * // DELETE /resource-templates/:id
 * // POST   /resource-templates/:id/instantiate
 * ```
 *
 * @example
 * ```typescript
 * import { instantiateTemplate } from '@molecule/api-resource-template'
 *
 * const result = instantiateTemplate(
 *   {
 *     snapshot: { title: 'Hello {{name}}', body: '{{greeting}}!' },
 *     variables: [{ name: 'greeting', defaultValue: 'Welcome' }],
 *   },
 *   { name: 'Ada' },
 * )
 * // result.payload === { title: 'Hello Ada', body: 'Welcome!' }
 * ```
 *
 * @remarks
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server) / `res.data.data` (client, after the
 *   HttpResponse wrapper). Treating the response as a bare array — or `unwrapList`, which only
 *   peels a PURE single-key `{ data }` — yields an EMPTY list.
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

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
