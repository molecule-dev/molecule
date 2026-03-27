/**
 * Multi-tenancy core interface for molecule.dev.
 *
 * Provides the `TenancyProvider` interface for multi-tenant data isolation
 * including tenant lifecycle management, context switching, and middleware
 * integration. Bond a concrete provider (e.g. `@molecule/api-multi-tenancy-schema`)
 * at startup via `setProvider()`.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, setTenant, getTenant, createTenant, listTenants, getTenantMiddleware } from '@molecule/api-multi-tenancy'
 * import { provider } from '@molecule/api-multi-tenancy-schema'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Create a new tenant
 * const tenant = await createTenant({ name: 'Acme Corp' })
 *
 * // Set tenant context for subsequent operations
 * setTenant(tenant.id)
 *
 * // Use middleware to auto-resolve tenant from requests
 * app.use(getTenantMiddleware())
 * ```
 */

export * from './provider.js'
export * from './types.js'
