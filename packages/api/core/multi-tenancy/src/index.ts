/**
 * Multi-tenancy core interface for molecule.dev.
 *
 * Provides the `TenancyProvider` interface for multi-tenant data isolation
 * including tenant lifecycle management, context switching, and middleware
 * integration. Bond a concrete provider (e.g. `@molecule/api-multi-tenancy-schema`)
 * at startup via `setProvider()`.
 *
 * @remarks
 * **Tenant resolution is security-critical — the tenant header is attacker-controlled.**
 * Any caller can send `x-tenant-id: <victim-tenant>`. A provider wired with NO membership
 * check (the bare default `provider` export) trusts that header and grants cross-tenant
 * access — a broken-isolation default. ALWAYS configure `resolveAuthorizedTenantIds` so the
 * middleware rejects (403) when the header tenant is not one the authenticated principal
 * belongs to, **or** mount `getTenantMiddleware()` strictly behind your own auth +
 * tenant-membership gate. Mount it AFTER auth so the resolver can read `req.user`. Never ship
 * the unauthenticated default to production.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, createTenant, getTenantMiddleware } from '@molecule/api-multi-tenancy'
 * import { createProvider } from '@molecule/api-multi-tenancy-schema'
 *
 * // SECURE wiring: authorize the (attacker-controlled) tenant header against the
 * // authenticated principal. `req.user` is populated by your auth middleware earlier
 * // in the chain; the middleware 403s if the header tenant isn't in this list.
 * setProvider(
 *   createProvider({
 *     resolveAuthorizedTenantIds: (req) => {
 *       const user = req.user as { tenantIds?: string[] } | undefined
 *       return user?.tenantIds ?? []
 *     },
 *   }),
 * )
 *
 * // Create a new tenant
 * const tenant = await createTenant({ name: 'Acme Corp' })
 *
 * // Mount tenant resolution AFTER auth so the membership check has req.user.
 * app.use(authMiddleware, getTenantMiddleware())
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
