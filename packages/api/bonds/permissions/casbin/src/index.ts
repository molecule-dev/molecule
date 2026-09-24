/**
 * Casbin-based permissions provider for molecule.dev.
 *
 * Provides role-based access control (RBAC) using Casbin: custom model
 * definitions, policy files, and external adapters for persistent storage.
 *
 * @remarks
 * - **RBAC-only.** This bond does NOT evaluate the `Permission.conditions` (ABAC)
 *   the shared permissions contract carries — the `custom` bond does. To prevent
 *   a silent fail-open on a provider swap (a conditional grant like "delete only
 *   your own record" becoming an unconditional Casbin policy = privilege
 *   escalation), it REJECTS (throws on) conditional permissions at `createRole`/
 *   `addPermission`. Use `@molecule/api-permissions-custom` for attribute-based
 *   (conditional) permissions. The `context` argument of `can()` is ignored.
 * - **Create the role before `assign()`-ing it** — `can()` only allows an exact
 *   `(role, action, resource)` policy match. The default model has NO wildcards:
 *   a `resource: '*'` permission matches only the literal resource `'*'`.
 * - **`scope` is ignored** by `assign()`/`revoke()` (the default model has no domains).
 * - **Nothing is persisted by default**: policies AND role metadata (ids, descriptions)
 *   live in memory and are lost on restart. Pass `adapter` (a Casbin adapter) or
 *   `policyPath` to persist policies; role metadata is always in-memory.
 * - When `modelPath` is set, `modelText` is ignored (despite the option's doc comment).
 * - Role ids are `role-1`, `role-2`, ... per provider instance — `deleteRole()` takes
 *   that id, not the role name.
 *
 * @example
 * ```typescript
 * import { assign, can, createRole, getRoles, setProvider } from '@molecule/api-permissions'
 * import { createProvider } from '@molecule/api-permissions-casbin'
 *
 * // Startup: default in-memory RBAC model (pass `modelPath` / `adapter` to customise/persist).
 * setProvider(createProvider())
 *
 * // Define a role, then give it to a user.
 * await createRole({
 *   name: 'editor',
 *   permissions: [
 *     { id: 'post-read', action: 'read', resource: 'post' },
 *     { id: 'post-write', action: 'write', resource: 'post' },
 *   ],
 * })
 * await assign('user-42', 'editor')
 *
 * const allowed = await can('user-42', 'write', 'post') // true
 * const denied = await can('user-42', 'delete', 'post') // false — no such policy
 * const roles = await getRoles('user-42') // [{ id: 'role-1', name: 'editor', ... }]
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
