/**
 * Schema-based multi-tenancy provider for molecule.dev.
 *
 * Implements the `TenancyProvider` interface with schema-based tenant
 * isolation. Each tenant is logically mapped to a database schema via
 * a configurable prefix. Includes middleware that resolves the tenant
 * from a configurable HTTP header (`x-tenant-id` by default).
 *
 * @remarks
 * **Security model — read before mounting the middleware.**
 *
 * 1. **Tenant context is request-scoped (`AsyncLocalStorage`), not a module
 *    global.** `getTenant()` always returns the current request's tenant, even
 *    across `await`s under concurrency — no cross-request tenant bleed.
 *    `setTenant()` throws outside a request scope; use `runWithTenant()` for
 *    background jobs.
 * 2. **The tenant header is attacker-controlled.** Any caller can send
 *    `x-tenant-id: <victim-tenant>`. The raw-header middleware on its own is
 *    *unauthenticated*. ALWAYS either pass `resolveAuthorizedTenantIds` (so the
 *    middleware rejects 403 when the header tenant is not one the authenticated
 *    principal is a member of) **or** mount the middleware strictly behind your
 *    own auth + tenant-membership gate. The middleware additionally validates
 *    the header tenant exists and is `active` (404/403 otherwise) before
 *    activating it.
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

export * from './provider.js'
export * from './types.js'
