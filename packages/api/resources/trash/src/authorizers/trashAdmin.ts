/**
 * Opt-in trash admin authorizer.
 *
 * The base trash routes are owner-scoped: every caller sees and acts on only
 * their own trash rows. Some apps legitimately need a cross-user trash console
 * (support/compliance reviewing any user's deleted-record snapshots). That is
 * deliberately *opt-in* — compose {@link trashAdmin} onto a route to widen an
 * authenticated *admin* to all users' rows. It never blocks: a non-admin still
 * passes through but stays scoped to themselves (the handlers honor the
 * `res.locals.trashAdmin` flag only when this middleware sets it), so composing
 * it can only widen for admins, never open the endpoint.
 *
 * "Admin" is resolved fail-closed from session claims only, keeping this
 * resource dependency-light: an explicit `isAdmin`/`role`/`roles`/`permissions`
 * claim on `res.locals.session`. Apps with a richer authz model (e.g.
 * `@molecule/api-permissions`) compose their own widening middleware that sets
 * `res.locals.trashAdmin` after their own check.
 *
 * @module
 */

import type { MoleculeRequestHandler, MoleculeResponse } from '@molecule/api-resource'

/**
 * Permission action describing trash administration, e.g. for an app's own
 * `@molecule/api-permissions` wiring.
 */
export const TRASH_PERMISSION_ACTION = 'manage'

/**
 * Permission resource describing trash administration, e.g. for an app's own
 * `@molecule/api-permissions` wiring.
 */
export const TRASH_PERMISSION_RESOURCE = 'trash'

/**
 * Session-claim permission string (`'trash:manage'`) that, when present in a
 * session's `permissions` array, marks the caller as a trash admin.
 */
export const TRASH_ADMIN_PERMISSION = `${TRASH_PERMISSION_RESOURCE}:${TRASH_PERMISSION_ACTION}`

/**
 * Structural view of the fields on `res.locals.session` this authorizer
 * inspects to decide admin authorization. All fields are optional — a standard
 * molecule session carries only `userId`; apps that model roles may also set
 * `isAdmin`/`role`/`roles`/`permissions` claims, which are honored here.
 */
interface TrashSession {
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
 * Resolves whether the current request's session belongs to an actor
 * authorized to administer trash (inspect/restore/purge any user's rows).
 * Fail-closed: returns `false` when there is no authenticated session, and
 * otherwise only `true` when the session carries an admin claim — `isAdmin ===
 * true`, `role === 'admin'`, `roles` containing `'admin'`, or `permissions`
 * containing `'admin'` / `'trash:manage'`.
 *
 * @param res - The response whose `locals.session` is inspected.
 * @returns `true` when the session is an authorized trash admin.
 */
export function isTrashAdmin(res: MoleculeResponse): boolean {
  const session = res.locals.session as TrashSession | undefined
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
    (session.permissions.includes('admin') || session.permissions.includes(TRASH_ADMIN_PERMISSION))
  ) {
    return true
  }
  return false
}

/**
 * Opt-in route middleware that *widens* an authenticated admin to cross-user
 * trash inspection by setting `res.locals.trashAdmin = true`. It never blocks:
 * a non-admin (or anonymous) caller passes through unchanged and remains
 * owner-scoped in the handlers, so composing this onto a route can only widen
 * for admins, never open the endpoint. Wire it onto a dedicated admin trash
 * route when a support/compliance console needs to see every user's rows.
 *
 * @returns An Express-compatible middleware function.
 */
export const trashAdmin =
  (): MoleculeRequestHandler =>
  (_req, res, next): void => {
    if (isTrashAdmin(res)) {
      res.locals.trashAdmin = true
    }
    next()
  }
