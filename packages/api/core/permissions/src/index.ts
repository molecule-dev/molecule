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
export * from './types.js'

// Provider exports
export * from './provider.js'
