/**
 * Subscriber authorizers.
 *
 * The public `subscribe`, `confirm`, and `unsubscribe` endpoints are intentionally
 * unauthenticated — anonymous visitors of a status page or newsletter form must
 * be able to use them.
 *
 * The `list`, `read`, and `del` endpoints expose / mutate subscriber PII (email
 * addresses, phone numbers, webhook URLs) and are therefore **admin-only**. That
 * intent is enforced in two independent layers:
 *
 * 1. {@link requireAdmin} — a route middleware referenced from {@link routes}. It
 *    is a key in `requestHandlerMap`, so the mlcl injector's route scanner keeps
 *    it (a bare `'authenticate'` string is silently dropped because it isn't a
 *    handler-map key, which is exactly why the old gate was inert).
 * 2. {@link isSubscriberAdmin} — called at the top of every protected handler, so
 *    protection holds even when the resource is wired via the middleware-less
 *    module `@example` (`requestHandlerMap[route.handler]` only).
 *
 * "Admin" is resolved fail-closed via {@link isSubscriberAdmin}: an explicit admin
 * claim on the session, **or** an `@molecule/api-permissions` grant. With neither,
 * access is denied — the app developer must define who may administer subscribers.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequestHandler, MoleculeResponse } from '@molecule/api-resource'

/**
 * Permission action checked against `@molecule/api-permissions` for subscriber
 * administration.
 */
export const SUBSCRIBER_PERMISSION_ACTION = 'manage'

/**
 * Permission resource checked against `@molecule/api-permissions` for subscriber
 * administration.
 */
export const SUBSCRIBER_PERMISSION_RESOURCE = 'subscriber'

/**
 * Session-claim permission string (`'subscriber:manage'`) that, when present in a
 * session's `permissions` array, grants subscriber administration without a bonded
 * permissions provider.
 */
export const SUBSCRIBER_ADMIN_PERMISSION = `${SUBSCRIBER_PERMISSION_RESOURCE}:${SUBSCRIBER_PERMISSION_ACTION}`

/**
 * Structural view of the fields on `res.locals.session` this resource inspects to
 * decide admin authorization. All fields are optional — a standard molecule session
 * carries only `userId`; apps that model roles may also set `isAdmin`/`role`/
 * `roles`/`permissions` claims, which are honored here.
 */
interface SubscriberSession {
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
 * `'admin'`, or `permissions` containing `'admin'` / `'subscriber:manage'`.
 *
 * @param session - The structural session, or `undefined`.
 * @returns `true` when the session carries an admin claim.
 */
function sessionClaimIsAdmin(session: SubscriberSession | undefined): boolean {
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
    (session.permissions.includes('admin') ||
      session.permissions.includes(SUBSCRIBER_ADMIN_PERMISSION))
  ) {
    return true
  }
  return false
}

/**
 * Whether a bonded `@molecule/api-permissions` provider grants the current user
 * the `manage subscriber` permission. Fail-closed: returns `false` when the
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
      SUBSCRIBER_PERMISSION_ACTION,
      SUBSCRIBER_PERMISSION_RESOURCE,
    )
  } catch (error) {
    // Best-effort: api-permissions is an optional peer dep. If it isn't installed,
    // has no bonded provider, or the check throws, deny (fail-closed) rather than
    // leaking PII — the app must wire permissions (or set an admin session claim).
    logger.debug('Subscriber permissions check unavailable; denying access (fail-closed)', {
      error,
      userId,
    })
    return false
  }
}

/**
 * Resolves whether the current request's session belongs to an actor authorized
 * to administer subscribers (list/read/delete PII). Fail-closed: returns `false`
 * when there is no authenticated session, and otherwise only `true` when the
 * session carries an admin claim or a bonded permissions provider grants the
 * `manage subscriber` permission.
 *
 * Use this for in-handler defense-in-depth (it does not depend on the route
 * middleware being preserved by the injector).
 *
 * @param res - The response whose `locals.session` is inspected.
 * @returns `true` when the session is an authorized subscriber admin.
 */
export async function isSubscriberAdmin(res: MoleculeResponse): Promise<boolean> {
  const session = res.locals.session as SubscriberSession | undefined
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
 * Route middleware that gates the admin-only subscriber routes (`list`, `read`,
 * `del`). Calls `next()` only for an authenticated admin; otherwise forwards an
 * error to the framework error handler — `Unauthorized` when no session is
 * present, `Forbidden` when the session is authenticated but not an admin.
 *
 * Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
 * (unlike the inert global `'authenticate'` string, which is dropped).
 *
 * @returns An Express-compatible middleware function.
 */
export const requireAdmin =
  (): MoleculeRequestHandler =>
  async (req, res, next): Promise<void> => {
    const session = res.locals.session as SubscriberSession | undefined
    if (!session?.userId) {
      return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
    }
    if (await isSubscriberAdmin(res)) {
      return next()
    }
    return next(
      t('subscriber.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage subscribers',
      }),
    )
  }
