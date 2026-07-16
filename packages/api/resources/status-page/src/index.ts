/**
 * Status page resource for molecule.dev.
 *
 * Public status-page backend: monitored services, incidents with lifecycle
 * updates, health-check history, and uptime windows. The read endpoints power
 * a public status page; the mutation endpoints are for operators.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual status-page screens/flows, and check every
 * box off one by one. A box you can't check is an integration bug to fix — not
 * a skip. Verify BEHAVIOR and the public/admin split, not just that CRUD
 * compiles:
 * - [ ] The PUBLIC status page renders every monitored service (component)
 *   with its current status and an OVERALL banner that is DERIVED, never
 *   hardcoded: GET /status returns `operational` when no enabled service's
 *   latest `check` is `down` or `degraded` ("All systems operational"), `down`
 *   if ANY latest check is `down`, else `degraded` if any is `degraded` — the
 *   banner reflects the WORST service, and a service with no check reads
 *   `unknown` (which never turns the banner red). GET /status/services lists
 *   each service with its latest check.
 * - [ ] An admin creating an INCIDENT (POST /status/incidents with serviceId,
 *   title, severity minor|major|critical, status `investigating`, startedAt)
 *   persists it and it shows on the public GET /status/incidents. The affected
 *   service reads down/degraded on the page because its latest `check` says so
 *   (checks are monitor-written, never typed in), so the overall banner goes
 *   non-green while the incident is open.
 * - [ ] Updating the incident (PATCH /status/incidents/:id) advances its
 *   timeline through the real lifecycle investigating -> identified ->
 *   monitoring -> resolved (bumping updatedAt), and each stage shows on the
 *   public page. Marking it `resolved` (with resolvedAt) moves it to history —
 *   the public list filtered `?status=resolved` includes it while the active
 *   incidents drop it — and once the affected service's latest check returns
 *   to `up`, GET /status recovers to "All systems operational" (the banner
 *   tracks live check state, so a still-down check keeps it red).
 * - [ ] AUTHORIZATION — reads are PUBLIC: with NO session, every GET (/status,
 *   /status/services, /status/services/:id, /status/incidents, /status/uptime)
 *   returns 200 — the status page is meant to be seen without signing in.
 * - [ ] AUTHORIZATION — writes are ADMIN-ONLY, deny by default: every mutation
 *   (POST/PATCH/DELETE /status/services(/:id), POST/PATCH
 *   /status/incidents(/:id)) is refused for an anonymous caller (401) and for
 *   a normal signed-in user with no admin claim / `manage status` grant (403),
 *   and nothing changes — enforced twice (the `requireAdmin` route middleware
 *   AND the in-handler `isStatusAdmin` re-check). A non-admin has NO path to
 *   fabricate an outage, delete a service, or post a fake incident, and no
 *   endpoint sets a service up/down at all (that is monitor-written).
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
