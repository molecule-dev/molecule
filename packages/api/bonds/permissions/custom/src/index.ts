/**
 * Simple in-memory role-based permissions provider for molecule.dev.
 *
 * Provides role-based and attribute-based access control (RBAC/ABAC)
 * using pure in-memory storage with no external dependencies. Supports
 * wildcard matching on actions/resources and basic ABAC condition
 * evaluation. Ideal for development, testing, or single-instance
 * deployments.
 *
 * @remarks
 * - **All state is in memory** (roles AND assignments) — lost on restart and not shared
 *   between instances. Re-create roles at startup; multi-instance apps need a persistent bond.
 * - **Create the role before `assign()`**: `assign()` accepts any role name, but `can()` only
 *   grants permissions of roles that exist. `addPermission()` on an unknown role is a silent no-op.
 * - **Conditions are exact-equality ANDs** against `can()`'s 4th `context` argument
 *   (`context[key] === value`, no operators/nesting). A conditional permission checked
 *   WITHOUT a context is denied.
 * - **`scope` is stored but NOT enforced** — `can()` ignores it; it only shows up in `getRoles()`.
 * - Wildcards are whole-value only: `'*'` matches anything, `'post:*'` is a literal string.
 *   Disable with `createProvider({ wildcards: false })`.
 *
 * @example
 * ```typescript
 * import { assign, can, createRole, setProvider } from '@molecule/api-permissions'
 * import { createProvider } from '@molecule/api-permissions-custom'
 *
 * // Startup (in-memory; roles must be re-created on every boot).
 * setProvider(createProvider({ wildcards: true }))
 *
 * await createRole({ name: 'admin', permissions: [{ id: 'all', action: '*', resource: '*' }] })
 * await createRole({
 *   name: 'author',
 *   permissions: [
 *     { id: 'post-read', action: 'read', resource: 'post' },
 *     // ABAC: only when the caller passes a matching context
 *     { id: 'post-edit-own', action: 'update', resource: 'post', conditions: { isOwner: true } },
 *   ],
 * })
 * await assign('user-1', 'admin')
 * await assign('user-2', 'author')
 *
 * await can('user-1', 'delete', 'invoice') // true — wildcard
 * await can('user-2', 'update', 'post', { isOwner: true }) // true
 * await can('user-2', 'update', 'post', { isOwner: false }) // false
 * await can('user-2', 'update', 'post') // false — no context, condition unmet
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
