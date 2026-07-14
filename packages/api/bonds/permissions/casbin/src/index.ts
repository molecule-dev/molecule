/**
 * Casbin-based permissions provider for molecule.dev.
 *
 * Provides role-based access control (RBAC) using Casbin: custom model
 * definitions, policy files, and external adapters for persistent storage.
 *
 * @remarks
 * RBAC-only. This bond does NOT evaluate the `Permission.conditions` (ABAC)
 * the shared permissions contract carries — the `custom` bond does. To prevent
 * a silent fail-open on a provider swap (a conditional grant like "delete only
 * your own record" becoming an unconditional Casbin policy = privilege
 * escalation), it REJECTS (throws on) conditional permissions at `createRole`/
 * `addPermission`. Use `@molecule/api-permissions-custom` for attribute-based
 * (conditional) permissions.
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

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
