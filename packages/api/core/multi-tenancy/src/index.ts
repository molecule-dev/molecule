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
 * Any caller can send `x-tenant-id: <victim-tenant>`, so a header-named tenant must never
 * be honored on trust. Configure `resolveAuthorizedTenantIds` so the middleware rejects
 * (403) any header tenant the authenticated principal doesn't belong to, and mount
 * `getTenantMiddleware()` AFTER auth so the resolver can read the authenticated principal.
 *
 * - **Providers are secure by default — an unconfigured provider fails CLOSED.** With no
 *   `resolveAuthorizedTenantIds` configured, the schema bond REFUSES (403) every
 *   header-named tenant rather than activating it. So "403 on every tenant request" means
 *   the authorizer isn't wired — not that the package is broken. Only when membership is
 *   already enforced upstream may you opt into the raw-header path
 *   (`allowUnauthorizedTenantHeader: true` on the schema bond), and then the middleware
 *   MUST sit strictly behind that gate. A server-configured `defaultTenantId` (used only
 *   when no header is present) is trusted config and bypasses these checks.
 * - **Tenant context is request-scoped, never a module global.** `getTenant()` reflects
 *   the currently executing request, and the schema provider's `setTenant()` THROWS
 *   outside a request scope (this prevents cross-request tenant bleed). For background
 *   jobs, seeds, and scripts, establish a scope explicitly (e.g. the schema bond's
 *   `runWithTenant(tenantId, fn)`) instead of calling `setTenant()` at top level.
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
