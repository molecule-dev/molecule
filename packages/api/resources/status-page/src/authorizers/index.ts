/**
 * Status page authorizers.
 *
 * The status page is a **public** surface — anyone may read `/status`,
 * `/status/services`, `/status/incidents`, and `/status/uptime`. But the
 * mutating routes (`POST`/`PATCH`/`DELETE /status/services`, `POST`/`PATCH
 * /status/incidents`) must be locked down: an open mutation surface lets any
 * caller deface the public status page (fabricate outages, delete services,
 * post fake incidents). There is no per-row owner here — a service/incident is
 * platform-operations data — so the secure-by-default model is a **role gate**:
 * mutating the status page is restricted to a status-management authority
 * (operator / admin). The gate is enforced in two independent layers so it can
 * never silently regress:
 *
 * 1. {@link requireAdmin} — a route middleware referenced from `routes.ts`. It is
 *    a key in the request handler map, so the mlcl injector's route scanner
 *    preserves it (a bare `'auth'` middleware string is silently dropped because
 *    it isn't a handler-map key — which is exactly why the previous gate was
 *    inert and the mutating routes shipped PUBLIC).
 * 2. {@link isStatusAdmin} — called at the top of every mutation handler, so the
 *    gate holds even when the resource is wired without the middleware
 *    (`requestHandlerMap[route.handler]` only). Fail-closed.
 *
 * Apps grant operators the `manage status` permission via
 * `@molecule/api-permissions` (or set an admin session claim) — that is the
 * extension point for a richer operator-role model.
 *
 * "Admin" is resolved fail-closed via {@link isStatusAdmin}: an explicit admin
 * claim on the session, **or** an `@molecule/api-permissions` grant. With neither,
 * access is denied — the app developer must define who may administer the status
 * page.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequestHandler, MoleculeResponse } from '@molecule/api-resource'

const logger = getLogger()

/**
 * Permission action checked against `@molecule/api-permissions` for status page
 * administration.
 */
export const STATUS_PERMISSION_ACTION = 'manage'

/**
 * Permission resource checked against `@molecule/api-permissions` for status page
 * administration.
 */
export const STATUS_PERMISSION_RESOURCE = 'status'

/**
 * Session-claim permission string (`'status:manage'`) that, when present in a
 * session's `permissions` array, grants status page administration without a
 * bonded permissions provider.
 */
export const STATUS_ADMIN_PERMISSION = `${STATUS_PERMISSION_RESOURCE}:${STATUS_PERMISSION_ACTION}`

/**
 * Structural view of the fields on `res.locals.session` this resource inspects to
 * decide admin authorization. All fields are optional — a standard molecule
 * session carries only `userId`; apps that model roles may also set `isAdmin`/
 * `role`/`roles`/`permissions` claims, which are honored here.
 */
interface StatusSession {
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
 * Whether an admin signal is present directly on the session claims (no provider
 * lookup). Honors `isAdmin === true`, `role === 'admin'`, `roles` containing
 * `'admin'`, or `permissions` containing `'admin'` / `'status:manage'`.
 *
 * @param session - The structural session, or `undefined`.
 * @returns `true` when the session carries an admin claim.
 */
function sessionClaimIsAdmin(session: StatusSession | undefined): boolean {
  if (!session) {
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
    (session.permissions.includes('admin') || session.permissions.includes(STATUS_ADMIN_PERMISSION))
  ) {
    return true
  }
  return false
}

/**
 * Whether a bonded `@molecule/api-permissions` provider grants the current user
 * the `manage status` permission. Fail-closed: returns `false` when the
 * permissions package is not installed, no provider is bonded, or the check
 * throws — so a missing/misconfigured permissions layer denies rather than opens
 * access.
 *
 * @param userId - The authenticated user id.
 * @returns `true` only when a bonded provider affirmatively allows the action.
 */
async function permissionAllows(userId: string): Promise<boolean> {
  try {
    const permissions = await import('@molecule/api-permissions')
    if (!permissions.hasProvider()) {
      return false
    }
    return await permissions.can(
      `user:${userId}`,
      STATUS_PERMISSION_ACTION,
      STATUS_PERMISSION_RESOURCE,
    )
  } catch (error) {
    // Best-effort: api-permissions is an optional peer dep. If it isn't installed,
    // has no bonded provider, or the check throws, deny (fail-closed) rather than
    // letting any caller deface the public status page.
    logger.debug('Status permissions check unavailable; denying access (fail-closed)', {
      error,
      userId,
    })
    return false
  }
}

/**
 * Resolves whether the current request's session belongs to an actor authorized
 * to administer the status page (create/update/delete services + incidents).
 * Fail-closed: returns `false` when there is no authenticated session, and
 * otherwise only `true` when the session carries an admin claim or a bonded
 * permissions provider grants the `manage status` permission.
 *
 * Use this for in-handler defense-in-depth (it does not depend on the route
 * middleware being preserved by the injector).
 *
 * @param res - The response whose `locals.session` is inspected.
 * @returns `true` when the session is an authorized status page admin.
 */
export async function isStatusAdmin(res: MoleculeResponse): Promise<boolean> {
  const session = res.locals.session as StatusSession | undefined
  const userId = session?.userId
  if (!userId) {
    return false
  }
  if (sessionClaimIsAdmin(session)) {
    return true
  }
  return permissionAllows(userId)
}

/**
 * Route middleware that gates the admin-only status page mutation routes. Calls
 * `next()` only for an authenticated status page admin; otherwise forwards an
 * error to the framework error handler — `Unauthorized` when no session is
 * present, `Forbidden` when the session is authenticated but not authorized to
 * manage the status page.
 *
 * Exposed as a request-handler-map key so the injector's route scanner keeps it
 * (unlike the inert global `'auth'` string, which is dropped).
 *
 * @returns An Express-compatible middleware function.
 */
export const requireAdmin =
  (): MoleculeRequestHandler =>
  async (_req, res, next): Promise<void> => {
    const session = res.locals.session as StatusSession | undefined
    if (!session?.userId) {
      return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
    }
    if (await isStatusAdmin(res)) {
      return next()
    }
    return next(
      t('status.error.forbidden', undefined, {
        defaultValue: 'Permission required to manage the status page',
      }),
    )
  }
