/**
 * Schema-based multi-tenancy provider for molecule.dev.
 *
 * Implements the `TenancyProvider` interface with schema-based tenant
 * isolation. Each tenant is logically mapped to a database schema via
 * a configurable prefix. Includes middleware that resolves the tenant
 * from a configurable HTTP header (`x-tenant-id` by default).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, getTenantMiddleware } from '@molecule/api-multi-tenancy'
 * import { provider } from '@molecule/api-multi-tenancy-schema'
 *
 * // Wire the provider at startup (default config)
 * setProvider(provider)
 *
 * // Or create with custom config
 * import { createProvider } from '@molecule/api-multi-tenancy-schema'
 * const customProvider = createProvider({
 *   tenantHeader: 'x-org-id',
 *   schemaPrefix: 'org_',
 * })
 * setProvider(customProvider)
 * ```
 */

export * from './provider.js'
export * from './types.js'
