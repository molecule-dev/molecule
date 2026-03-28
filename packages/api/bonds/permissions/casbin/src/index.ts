/**
 * Casbin-based permissions provider for molecule.dev.
 *
 * Provides role-based and attribute-based access control (RBAC/ABAC)
 * using Casbin. Supports custom model definitions, policy files,
 * and external adapters for persistent storage.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-permissions'
 * import { provider } from '@molecule/api-permissions-casbin'
 *
 * setProvider(provider)
 *
 * // Or create a custom instance with a specific model
 * import { createProvider } from '@molecule/api-permissions-casbin'
 *
 * const casbinPerms = createProvider({ modelPath: './rbac_model.conf' })
 * setProvider(casbinPerms)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
