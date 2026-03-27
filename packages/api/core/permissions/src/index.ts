/**
 * Provider-agnostic permissions interface for molecule.dev.
 *
 * Defines the `PermissionsProvider` interface for role-based and
 * attribute-based access control (RBAC/ABAC). Bond packages (Casbin,
 * custom, etc.) implement this interface. Application code uses the
 * convenience functions (`can`, `assign`, `revoke`, `getRoles`) which
 * delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, can, assign } from '@molecule/api-permissions'
 * import { provider as casbin } from '@molecule/api-permissions-casbin'
 *
 * setProvider(casbin)
 *
 * await assign('user:123', 'editor')
 * const allowed = await can('user:123', 'write', 'project')
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
