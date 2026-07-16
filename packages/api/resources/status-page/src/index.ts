/**
 * Status page resource for molecule.dev.
 *
 * Public status-page backend: monitored services, incidents with lifecycle
 * updates, health-check history, and uptime windows. The read endpoints power
 * a public status page; the mutation endpoints are for operators.
 *
 * @module
 * @example
 * ```typescript
 * import { createRequestHandler } from '@molecule/api-resource'
 * import { createRequestHandlerMap, routes } from '@molecule/api-resource-status-page'
 *
 * // The handler map is a FACTORY (like api-resource-device) — build it with
 * // the createRequestHandler from @molecule/api-resource (mlcl inject does this):
 * const requestHandlerMap = createRequestHandlerMap(createRequestHandler)
 *
 * // Public reads: GET /status, GET /status/services, GET /status/services/:id,
 * //               GET /status/incidents, GET /status/uptime
 * // Admin-only:   POST/PATCH/DELETE /status/services(/:id),
 * //               POST/PATCH /status/incidents(/:id)
 * ```
 *
 * @remarks
 * The GET routes are PUBLIC by design — a status page is a public surface; do
 * not put them behind auth. The mutating routes are ADMIN-ONLY and DENY by
 * default: they are gated by the `requireAdmin` middleware AND re-checked
 * inside every mutation handler via `isStatusAdmin` — fail-closed
 * defense-in-depth that holds even if a route scanner drops the middleware.
 * "Admin" resolves as: an admin session claim (`isAdmin: true`,
 * `role: 'admin'`, `roles` containing `'admin'`, or a `'status:manage'` /
 * `'admin'` entry in `session.permissions`) OR a bonded
 * `@molecule/api-permissions` grant of `manage` on `status`. Until the app
 * grants one of those, every mutation is denied — grant the claim/permission
 * at startup, do NOT strip the gate: an open mutation surface lets any caller
 * deface the public status page (fabricate outages, delete services).
 *
 * Handler text flows through `t()` with English defaults; the companion
 * locale bond `@molecule/api-locales-status-page` provides translations.
 *
 * Tables: `setup/*.sql` creates `services`, `incidents`, `checks`, and
 * `uptimeWindows`. An mlcl-scaffolded API replays these setup files
 * automatically on migrate; anywhere else run them once — nothing at runtime
 * creates them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * as handlers from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './resource.js'
export * from './routes.js'
export * from './schema.js'
export * as types from './types.js'
