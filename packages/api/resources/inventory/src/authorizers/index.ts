/**
 * Inventory authorizers.
 *
 * Inventory is store/admin-scoped: stock is a shared catalog resource with no
 * per-user owner. The destructive admin-side mutations — `updateStock` and
 * `bulkUpdate` — directly rewrite stock levels and are therefore **admin-only**.
 * That intent is enforced in two independent layers:
 *
 * 1. {@link requireInventoryAdmin} — a route middleware referenced from
 *    {@link routes}. It is a key in `requestHandlerMap`, so the mlcl injector's
 *    route scanner keeps it (a bare `'authenticate'` string is silently dropped
 *    because it isn't a handler-map key — which is exactly why the old gate was
 *    inert and any authenticated user could rewrite stock).
 * 2. {@link isInventoryAdmin} — called at the top of every admin handler, so
 *    protection holds even when the resource is wired via the middleware-less
 *    module `@example` (`requestHandlerMap[route.handler]` only). Secure by
 *    default: the handler fails closed regardless of whether the route
 *    middleware survives codegen.
 *
 * Reservation lifecycle endpoints (`reserve`/`release`/`confirm`) are tied to a
 * cart/order rather than the catalog: any authenticated user may reserve stock,
 * the reservation is bound to the caller's `userId`, and `release`/`confirm`
 * verify ownership (owner **or** admin) in-handler.
 *
 * "Admin" is resolved fail-closed from session claims only, keeping this resource
 * dependency-light: an explicit `isAdmin`/`role`/`roles`/`permissions` claim on
 * `res.locals.session`. With none, access is denied — the app developer must
 * define who may administer inventory (or compose a richer authz middleware,
 * e.g. `@molecule/api-permissions`, that sets an admin claim before this runs).
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import type { MoleculeRequestHandler, MoleculeResponse } from '@molecule/api-resource'

/**
 * Permission action describing inventory administration, e.g. for an app's own
 * `@molecule/api-permissions` wiring.
 */
export const INVENTORY_PERMISSION_ACTION = 'manage'

/**
 * Permission resource describing inventory administration, e.g. for an app's own
 * `@molecule/api-permissions` wiring.
 */
export const INVENTORY_PERMISSION_RESOURCE = 'inventory'

/**
 * Session-claim permission string (`'inventory:manage'`) that, when present in a
 * session's `permissions` array, grants inventory administration.
 */
export const INVENTORY_ADMIN_PERMISSION = `${INVENTORY_PERMISSION_RESOURCE}:${INVENTORY_PERMISSION_ACTION}`

/**
 * Structural view of the fields on `res.locals.session` this resource inspects to
 * decide authorization. All fields are optional — a standard molecule session
 * carries only `userId`; apps that model roles may also set `isAdmin`/`role`/
 * `roles`/`permissions` claims, which are honored here.
 */
export interface InventorySession {
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
 * Reads the structural session off `res.locals`.
 *
 * @param res - The response whose `locals.session` is inspected.
 * @returns The session, or `undefined` when unauthenticated.
 */
export function getInventorySession(res: MoleculeResponse): InventorySession | undefined {
  return res.locals.session as InventorySession | undefined
}

/**
 * Resolves whether the current request's session belongs to an actor authorized
 * to administer inventory (rewrite/bulk-update stock, release/confirm any
 * reservation). Fail-closed: returns `false` when there is no authenticated
 * session, and otherwise only `true` when the session carries an admin claim —
 * `isAdmin === true`, `role === 'admin'`, `roles` containing `'admin'`, or
 * `permissions` containing `'admin'` / `'inventory:manage'`.
 *
 * Use this for in-handler defense-in-depth (it does not depend on the route
 * middleware being preserved by the injector).
 *
 * @param res - The response whose `locals.session` is inspected.
 * @returns `true` when the session is an authorized inventory admin.
 */
export function isInventoryAdmin(res: MoleculeResponse): boolean {
  const session = getInventorySession(res)
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
      session.permissions.includes(INVENTORY_ADMIN_PERMISSION))
  ) {
    return true
  }
  return false
}

/**
 * In-handler admin guard for the admin-only inventory mutations. Writes the
 * appropriate JSON error and returns `false` when the caller is not an
 * authorized admin — `401` when unauthenticated, `403` when authenticated but
 * not an admin. Returns `true` (and writes nothing) when the caller is an admin.
 *
 * Call this at the top of every admin handler so protection holds independently
 * of the route middleware (defense-in-depth, fail-closed).
 *
 * @param res - The response, whose `locals.session` is inspected and onto which
 *   an error is written when access is denied.
 * @returns `true` when the caller is an authorized admin, otherwise `false`.
 */
export function assertInventoryAdmin(res: MoleculeResponse): boolean {
  const session = getInventorySession(res)
  if (!session?.userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return false
  }
  if (!isInventoryAdmin(res)) {
    res.status(403).json({
      error: t('inventory.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage inventory',
      }),
      errorKey: 'inventory.error.forbidden',
    })
    return false
  }
  return true
}

/**
 * In-handler guard for reservation-lifecycle mutations (`release`, `confirm`).
 * A reservation is owned by the user who created it; only that owner — or an
 * inventory admin — may release or confirm it. Writes the appropriate JSON
 * error and returns `false` when access is denied (`401` when unauthenticated,
 * `403` when authenticated but neither the owner nor an admin); returns `true`
 * (writing nothing) when the caller may act.
 *
 * Fail-closed: a reservation with no recorded owner (`null` — e.g. a legacy row
 * created before ownership binding) is accessible only to admins.
 *
 * @param res - The response, whose `locals.session` is inspected and onto which
 *   an error is written when access is denied.
 * @param reservationUserId - The `userId` recorded on the reservation, or `null`.
 * @returns `true` when the caller is the owner or an admin, otherwise `false`.
 */
export function assertReservationActor(
  res: MoleculeResponse,
  reservationUserId: string | null,
): boolean {
  const userId = getInventorySession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return false
  }
  if (isInventoryAdmin(res)) {
    return true
  }
  if (reservationUserId !== null && reservationUserId === userId) {
    return true
  }
  res.status(403).json({
    error: t('inventory.error.reservationForbidden', undefined, {
      defaultValue: 'You do not have permission to modify this reservation',
    }),
    errorKey: 'inventory.error.reservationForbidden',
  })
  return false
}

/**
 * Route middleware that gates the admin-only inventory routes (`updateStock`,
 * `bulkUpdate`). Calls `next()` only for an authenticated admin; otherwise
 * forwards an error to the framework error handler — `Unauthorized` when no
 * session is present, `Forbidden` when the session is authenticated but not an
 * admin.
 *
 * Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
 * (unlike the inert global `'authenticate'` string, which is dropped).
 *
 * @returns An Express-compatible middleware function.
 */
export const requireInventoryAdmin =
  (): MoleculeRequestHandler =>
  (req, res, next): void => {
    const session = getInventorySession(res)
    if (!session?.userId) {
      return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
    }
    if (isInventoryAdmin(res)) {
      return next()
    }
    return next(
      t('inventory.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage inventory',
      }),
    )
  }
