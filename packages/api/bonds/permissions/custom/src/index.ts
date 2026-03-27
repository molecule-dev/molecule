/**
 * Simple in-memory role-based permissions provider for molecule.dev.
 *
 * Provides role-based and attribute-based access control (RBAC/ABAC)
 * using pure in-memory storage with no external dependencies. Supports
 * wildcard matching on actions/resources and basic ABAC condition
 * evaluation. Ideal for development, testing, or single-instance
 * deployments.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-permissions'
 * import { provider } from '@molecule/api-permissions-custom'
 *
 * setProvider(provider)
 *
 * // Or create a custom instance
 * import { createProvider } from '@molecule/api-permissions-custom'
 *
 * const perms = createProvider({ wildcards: true })
 * setProvider(perms)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
