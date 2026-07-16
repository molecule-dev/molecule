/**
 * Schema-based multi-tenancy provider for molecule.dev.
 *
 * Implements the `TenancyProvider` interface with request-scoped tenant
 * context and header-based tenant resolution (`x-tenant-id` by default).
 * Tenant records live in an in-process registry; the provider does NOT
 * create or select database schemas — see the remarks for what "schema"
 * does and does not mean here.
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
 *    derive per-tenant scoping in your own data layer from `getTenant()`
 *    (e.g. a `tenant_id` column filter or your own schema switching). The
 *    `schemaPrefix` config option is currently reserved and has no effect.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, getTenantMiddleware } from '@molecule/api-multi-tenancy'
 * import { provider, createProvider } from '@molecule/api-multi-tenancy-schema'
 *
 * // Wire the provider at startup (default config)
 * setProvider(provider)
 *
 * // SECURE wiring: authorize the header against the authenticated principal.
 * // `req.user` is populated by your auth middleware mounted earlier in the chain.
 * const secureProvider = createProvider({
 *   tenantHeader: 'x-org-id',
 *   schemaPrefix: 'org_',
 *   resolveAuthorizedTenantIds: (req) => {
 *     const user = req.user as { tenantIds?: string[] } | undefined
 *     return user?.tenantIds ?? []
 *   },
 * })
 * setProvider(secureProvider)
 * // app.use(authMiddleware, getTenantMiddleware())
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
