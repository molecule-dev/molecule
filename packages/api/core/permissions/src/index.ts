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
 * import { assign, can, createRole, setProvider } from '@molecule/api-permissions'
 * // In-memory, zero-dependency bond; `@molecule/api-permissions-casbin` for persisted policies.
 * import { createProvider } from '@molecule/api-permissions-custom'
 *
 * // Startup: bond the provider, then define roles and their permissions.
 * setProvider(createProvider({ wildcards: true }))
 * await createRole({
 *   name: 'editor',
 *   permissions: [
 *     { id: 'post-read', action: 'read', resource: 'post' },
 *     // ABAC: only matches when the check's context has { ownerOnly: true }.
 *     { id: 'post-update-own', action: 'update', resource: 'post', conditions: { ownerOnly: true } },
 *   ],
 * })
 * await assign('user:123', 'editor')
 *
 * // In a handler: derive the context from the LOADED record, never from the request body.
 * const post = { id: 'post-1', authorId: 'user:123' }
 * const subject = 'user:123' // the authenticated user
 * const canRead = await can(subject, 'read', 'post') // true
 * const canEdit = await can(subject, 'update', 'post', { ownerOnly: post.authorId === subject }) // true
 * const canDelete = await can(subject, 'delete', 'post') // false → respond 403
 * ```
 *
 * @remarks
 * - **Roles must exist before `can()` can grant anything.** `assign(subject, 'editor')`
 *   only records the assignment; with the custom bond, a role never created via
 *   `createRole` (or with no permissions) grants nothing — `can()` returns `false`.
 * - **Permission checks are server-side only.** Hiding a button in the UI is not
 *   authorization; every mutating handler must `await can(...)` and 403 on `false`.
 * - `can()` is ASYNC — `if (can(...))` without `await` is always truthy (a Promise).
 * - ABAC `conditions` are matched by strict equality against the `context` you pass
 *   (all keys must match); a condition with no `context` never matches.
 * - The custom bond keeps roles/assignments IN MEMORY (lost on restart, not shared
 *   between instances) — seed roles at startup and re-`assign` from your own user table,
 *   or use the Casbin bond with a persistent `adapter`/`policyPath`.
 * - Neither shipped bond enforces the optional `scope` argument of `assign`/`revoke` in
 *   `can()` — do per-tenant/per-record isolation with `context` conditions or your own
 *   ownership check.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A user whose role HAS a permission can perform the gated action through
 *   the UI; a user whose role lacks it cannot.
 * - [ ] Denial is enforced SERVER-SIDE: attempting the gated action anyway (or
 *   reloading after the attempt) shows nothing changed — hiding the button
 *   alone is not enforcement.
 * - [ ] Role-gated screens/navigation are unreachable for unauthorized roles
 *   (redirect or clear denial — never a blank page or leaked data).
 * - [ ] Assigning a role through the app's admin surface grants the new
 *   abilities, and revoking it removes them.
 * - [ ] The same checks hold against OWNED resources: a permitted role still
 *   cannot act on another user's private records unless the app intends it.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
