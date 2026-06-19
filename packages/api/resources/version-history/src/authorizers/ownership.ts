/**
 * Parent-resource ownership authorizer for the version-history routes.
 *
 * The version-history store is polymorphic (snapshots of *any* resource type)
 * and append-only, so it owns no permission model itself. {@link isVersionAuthorized}
 * is the in-handler gate every route calls after re-deriving the caller from
 * `res.locals.session.userId`: it dispatches to the app-registered
 * {@link VersionOwnershipResolver} for the parent `resourceType` and is
 * **fail-closed** — with no registered resolver it denies, so mounting the raw
 * routes never silently exposes another tenant's snapshots.
 *
 * Cross-tenant access (an admin/compliance console that may read or restore any
 * user's versions) is **opt-in**: compose {@link versionHistoryAdmin} onto a
 * route to widen an authenticated *admin* by setting `res.locals.versionHistoryAdmin`,
 * which bypasses the resolver. It never blocks — a non-admin (or anonymous)
 * caller passes through unchanged and stays subject to the resolver, so
 * composing it can only widen for admins, never open the endpoint.
 *
 * @module
 */

import type { MoleculeRequestHandler, MoleculeResponse } from '@molecule/api-resource'

import { getOwnershipResolver, type VersionOwnershipContext } from '../registry.js'

/**
 * Permission action describing version-history administration, e.g. for an
 * app's own `@molecule/api-permissions` wiring.
 */
export const VERSION_HISTORY_PERMISSION_ACTION = 'manage'

/**
 * Permission resource describing version-history administration, e.g. for an
 * app's own `@molecule/api-permissions` wiring.
 */
export const VERSION_HISTORY_PERMISSION_RESOURCE = 'versionHistory'

/**
 * Session-claim permission string (`'versionHistory:manage'`) that, when
 * present in a session's `permissions` array, marks the caller as a
 * version-history admin.
 */
export const VERSION_HISTORY_ADMIN_PERMISSION = `${VERSION_HISTORY_PERMISSION_RESOURCE}:${VERSION_HISTORY_PERMISSION_ACTION}`

/**
 * Structural view of the fields on `res.locals.session` this authorizer
 * inspects to decide admin authorization. All fields are optional — a standard
 * molecule session carries only `userId`; apps that model roles may also set
 * `isAdmin`/`role`/`roles`/`permissions` claims, which are honored here.
 */
interface VersionHistorySession {
  /** Authenticated user id (set by the global auth middleware). */
  userId?: string
  /** Optional boolean admin claim. */
  isAdmin?: boolean
  /** Optional single-role claim. */
  role?: string
  /** Optional multi-role claim. */
  roles?: string[]
  /** Optional permission strings claim. */
  permissions?: string[]
}

/**
 * Authorizes whether the authenticated caller may access versions of a parent
 * resource. Admins widened by {@link versionHistoryAdmin} are always allowed;
 * otherwise the app-registered {@link VersionOwnershipResolver} for the parent
 * `resourceType` decides. **Fail-closed:** when no resolver is registered the
 * caller is denied, so the polymorphic version store never leaks a snapshot it
 * cannot prove the caller owns.
 *
 * @param res - The response whose `locals.session`/`locals.versionHistoryAdmin`
 *              is inspected.
 * @param context - The {@link VersionOwnershipContext} (parent resource + caller).
 * @returns `true` when the caller may access the parent resource's versions.
 */
export async function isVersionAuthorized(
  res: MoleculeResponse,
  context: VersionOwnershipContext,
): Promise<boolean> {
  if (res.locals.versionHistoryAdmin === true) {
    return true
  }
  const resolver = getOwnershipResolver(context.resourceType)
  if (!resolver) {
    // Fail-closed: with no registered ownership resolver for this resource
    // type the polymorphic version store cannot prove the caller owns the
    // parent resource, so it must deny rather than leak snapshots.
    return false
  }
  return resolver(context)
}

/**
 * Resolves whether the current request's session belongs to an actor
 * authorized to administer version history (read/restore any user's versions).
 * Fail-closed: returns `false` when there is no authenticated session, and
 * otherwise only `true` when the session carries an admin claim — `isAdmin ===
 * true`, `role === 'admin'`, `roles` containing `'admin'`, or `permissions`
 * containing `'admin'` / `'versionHistory:manage'`.
 *
 * @param res - The response whose `locals.session` is inspected.
 * @returns `true` when the session is an authorized version-history admin.
 */
export function isVersionHistoryAdmin(res: MoleculeResponse): boolean {
  const session = res.locals.session as VersionHistorySession | undefined
  if (!session?.userId) {
    return false
  }
  if (session.isAdmin === true) {
    return true
  }
  if (session.role === 'admin') {
    return true
  }
  if (Array.isArray(session.roles) && session.roles.includes('admin')) {
    return true
  }
  if (
    Array.isArray(session.permissions) &&
    (session.permissions.includes('admin') ||
      session.permissions.includes(VERSION_HISTORY_ADMIN_PERMISSION))
  ) {
    return true
  }
  return false
}

/**
 * Opt-in route middleware that *widens* an authenticated admin to cross-tenant
 * version access by setting `res.locals.versionHistoryAdmin = true`. It never
 * blocks: a non-admin (or anonymous) caller passes through unchanged and
 * remains subject to the ownership resolver in the handlers, so composing this
 * onto a route can only widen for admins, never open the endpoint. Wire it onto
 * a dedicated admin route when a support/compliance console needs to read or
 * restore every user's versions.
 *
 * @returns An Express-compatible middleware function.
 */
export const versionHistoryAdmin =
  (): MoleculeRequestHandler =>
  (_req, res, next): void => {
    if (isVersionHistoryAdmin(res)) {
      res.locals.versionHistoryAdmin = true
    }
    next()
  }
