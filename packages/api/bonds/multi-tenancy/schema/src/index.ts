/**
 * Multi-tenancy provider for molecule.dev (`@molecule/api-multi-tenancy-schema`).
 *
 * Implements the `TenancyProvider` interface as a request-scoped tenant-context
 * tracker: an active-tenant context (`AsyncLocalStorage`), an in-process tenant
 * registry, and header-based tenant resolution (`x-tenant-id` by default).
 * Despite the package name it does NOT create or select database schemas and
 * does NOT scope queries — it provides tenant CONTEXT, not data isolation. The
 * application must isolate its own data from `getTenant()`; see the remarks for
 * what "schema" does and does not mean here.
 *
 * @remarks
 * **Security model — read before mounting the middleware.**
 *
 * 1. **Tenant context is request-scoped (`AsyncLocalStorage`), not a module
 *    global.** `getTenant()` always returns the current request's tenant, even
 *    across `await`s under concurrency — no cross-request tenant bleed.
 *    `setTenant()` throws outside a request scope; use `runWithTenant()` for
 *    background jobs.
 * 2. **The tenant header is attacker-controlled — secure by default ([M5-2]).**
 *    Any caller can send `x-tenant-id: <victim-tenant>`. Without a
 *    `resolveAuthorizedTenantIds` resolver the middleware REFUSES (403) to honor
 *    the header at all — so the default never grants cross-tenant access. To
 *    authorize the header, pass `resolveAuthorizedTenantIds` (rejects 403 when the
 *    header tenant is not one the authenticated principal is a member of); or, if
 *    you gate membership upstream, set `allowUnauthorizedTenantHeader: true` to opt
 *    into the raw-header path and mount the middleware strictly behind that gate.
 *    Either way the middleware also validates the header tenant exists and is
 *    `active` (404/403 otherwise) before activating it.
 * 3. **Tenant records are IN-MEMORY and this provider does no database
 *    work.** `createTenant()` writes to a per-process `Map` — tenants are
 *    lost on restart (the middleware then 404s every header tenant until
 *    they are re-created) and are NOT shared across instances. No database
 *    schema is created or selected, and queries are NOT scoped for you:
 *    enforcing per-tenant DATA isolation is the application's job — read
 *    `getTenant()` in your data layer and filter every query by it (e.g. a
 *    `tenant_id` column). The package name refers to the *intended*
 *    schema-per-tenant strategy; the actual schema DDL / `search_path`
 *    scoping is not implemented here (there is no `schemaPrefix` option —
 *    it would only mislead), so treat this bond as a tenant-context tracker,
 *    not a data-isolation boundary.
 *
 * @e2e
 * Integration checklist — this bond provides the tenant *context* + a secure
 * header middleware; it does NOT isolate data, so the app must scope its own
 * queries. Drive the real UI (live preview, no mocks) and check every box:
 * - [ ] Secure header handling: with `resolveAuthorizedTenantIds` wired, a
 *   request carrying a spoofed `x-tenant-id` for a tenant the authenticated
 *   caller is NOT a member of is rejected (403) and never activates that
 *   tenant; the same call with the caller's own tenant succeeds.
 * - [ ] Request-scoped context: inside a request `getTenant()` returns that
 *   request's tenant across `await`s, and two concurrent requests never see
 *   each other's tenant (no bleed).
 * - [ ] App-enforced data isolation (THIS bond does not do it for you): every
 *   read/write path filters by `getTenant()` (e.g. a `tenant_id` column).
 *   Create records as tenant A, then as tenant B confirm none of A's data is
 *   visible or reachable anywhere B can look (lists, detail, search, exports),
 *   and vice-versa. A box you can't check is an isolation bug in YOUR data
 *   layer to fix, never a skip.
 * - [ ] No IDOR across the boundary: as tenant B, hitting a record id that
 *   belongs to A returns 403/404, never A's data — your handlers re-check
 *   tenant membership server-side on every access, not just at list time.
 * - [ ] Registry lifecycle: `createTenant`/`listTenants`/`deleteTenant` reflect
 *   the in-process registry; tenants are per-process and lost on restart, so
 *   back them with a persistent store before relying on them in production.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import {
 *   createTenant,
 *   getTenant,
 *   getTenantMiddleware,
 *   setProvider,
 * } from '@molecule/api-multi-tenancy'
 * import { createProvider } from '@molecule/api-multi-tenancy-schema'
 *
 * // Startup — SECURE wiring: authorize the attacker-controlled `x-tenant-id` header
 * // against the authenticated principal (403 for any tenant not in this list).
 * setProvider(
 *   createProvider({
 *     resolveAuthorizedTenantIds: (req) => {
 *       const user = req.user as { tenantIds?: string[] } | undefined
 *       return user?.tenantIds ?? []
 *     },
 *   }),
 * )
 *
 * // The registry is IN-MEMORY: create/load tenants at every boot.
 * const acme = await createTenant({ name: 'Acme Corp' })
 * const globex = await createTenant({ name: 'Globex' })
 * const projects = [
 *   { tenantId: acme.id, name: 'Rocket' },
 *   { tenantId: globex.id, name: 'Widget' },
 * ] // your database table in a real app
 *
 * const app = express()
 * // Stand-in for your real auth middleware: it must set req.user from a VERIFIED session.
 * app.use((req, _res, next) => {
 *   Object.assign(req, { user: { id: 'u_1', tenantIds: [acme.id] } })
 *   next()
 * })
 * // Framework-neutral handler types, so Express needs a cast.
 * app.use(getTenantMiddleware() as unknown as express.RequestHandler)
 *
 * app.get('/api/projects', (_req, res) => {
 *   const tenantId = getTenant() // request-scoped — this bond does NOT filter data for you
 *   res.json(projects.filter((project) => project.tenantId === tenantId))
 * })
 *
 * app.listen(Number(process.env.PORT ?? 4000))
 * // GET /api/projects  x-tenant-id: <acme.id>   → 200 [{ tenantId: <acme.id>, name: 'Rocket' }]
 * // GET /api/projects  x-tenant-id: <globex.id> → 403 (u_1 is not a member)
 * // GET /api/projects  (no header)              → 400 Missing required header: x-tenant-id
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
