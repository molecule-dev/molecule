/**
 * Product authorizers.
 *
 * A product is a **shared catalog entity** with no per-user owner/store column
 * (see `__setup__/products.sql`), so the owner-scoped model used by owned
 * resources (e.g. `@molecule/api-resource-project`'s `authUser`) does not apply.
 * Instead, mutating the catalog — `create`, `update` (price/stock), `del`, and
 * `createVariant` — is **admin-only** (a merchant / catalog-manager role). The
 * gate is enforced in two independent layers so it can never silently regress:
 *
 * 1. {@link requireAdmin} — a route middleware referenced from `routes.ts`. It is
 *    a key in `requestHandlerMap`, so the mlcl injector's route scanner preserves
 *    it (a bare `'authenticate'` middleware string is silently dropped because it
 *    isn't a handler-map key — which is exactly why the previous gate was inert
 *    and any authenticated user could edit prices/stock, add variants, or delete
 *    any product).
 * 2. {@link isProductAdmin} — called at the top of every mutation handler, so the
 *    gate holds even when the resource is wired via the middleware-less module
 *    `@example` (`requestHandlerMap[route.handler]` only). Fail-closed.
 *
 * Apps grant merchants/catalog managers the `manage product` permission via
 * `@molecule/api-permissions` (or set an admin session claim) — that is the
 * extension point for a richer multi-vendor ownership model.
 *
 * "Admin" is resolved fail-closed via {@link isProductAdmin}: an explicit admin
 * claim on the session, **or** an `@molecule/api-permissions` grant. With neither,
 * access is denied — the app developer must define who may administer products.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequestHandler, MoleculeResponse } from '@molecule/api-resource'

/**
 * Permission action checked against `@molecule/api-permissions` for product
 * administration.
 */
export const PRODUCT_PERMISSION_ACTION = 'manage'

/**
 * Permission resource checked against `@molecule/api-permissions` for product
 * administration.
 */
export const PRODUCT_PERMISSION_RESOURCE = 'product'

/**
 * Session-claim permission string (`'product:manage'`) that, when present in a
 * session's `permissions` array, grants product administration without a bonded
 * permissions provider.
 */
export const PRODUCT_ADMIN_PERMISSION = `${PRODUCT_PERMISSION_RESOURCE}:${PRODUCT_PERMISSION_ACTION}`

/**
 * Structural view of the fields on `res.locals.session` this resource inspects to
 * decide admin authorization. All fields are optional — a standard molecule
 * session carries only `userId`; apps that model roles may also set `isAdmin`/
 * `role`/`roles`/`permissions` claims, which are honored here.
 */
interface ProductSession {
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
 * `'admin'`, or `permissions` containing `'admin'` / `'product:manage'`.
 *
 * @param session - The structural session, or `undefined`.
 * @returns `true` when the session carries an admin claim.
 */
function sessionClaimIsAdmin(session: ProductSession | undefined): boolean {
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
      session.permissions.includes(PRODUCT_ADMIN_PERMISSION))
  ) {
    return true
  }
  return false
}

/**
 * Whether a bonded `@molecule/api-permissions` provider grants the current user
 * the `manage product` permission. Fail-closed: returns `false` when the
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
      PRODUCT_PERMISSION_ACTION,
      PRODUCT_PERMISSION_RESOURCE,
    )
  } catch (error) {
    // Best-effort: api-permissions is an optional peer dep. If it isn't installed,
    // has no bonded provider, or the check throws, deny (fail-closed) rather than
    // letting any authenticated user mutate the catalog.
    logger.debug('Product permissions check unavailable; denying access (fail-closed)', {
      error,
      userId,
    })
    return false
  }
}

/**
 * Resolves whether the current request's session belongs to an actor authorized
 * to administer products (create/update/delete/create variants). Fail-closed: returns
 * `false` when there is no authenticated session, and otherwise only `true` when
 * the session carries an admin claim or a bonded permissions provider grants the
 * `manage product` permission.
 *
 * Use this for in-handler defense-in-depth (it does not depend on the route
 * middleware being preserved by the injector).
 *
 * @param res - The response whose `locals.session` is inspected.
 * @returns `true` when the session is an authorized product admin.
 */
export async function isProductAdmin(res: MoleculeResponse): Promise<boolean> {
  const session = res.locals.session as ProductSession | undefined
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
 * Route middleware that gates the admin-only product mutation routes (`create`,
 * `update`, `del`, `createVariant`). Calls `next()` only for an authenticated admin;
 * otherwise forwards an error to the framework error handler — `Unauthorized`
 * when no session is present, `Forbidden` when the session is authenticated but
 * not an admin.
 *
 * Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
 * (unlike the inert global `'authenticate'` string, which is dropped).
 *
 * @returns An Express-compatible middleware function.
 */
export const requireAdmin =
  (): MoleculeRequestHandler =>
  async (_req, res, next): Promise<void> => {
    const session = res.locals.session as ProductSession | undefined
    if (!session?.userId) {
      return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
    }
    if (await isProductAdmin(res)) {
      return next()
    }
    return next(
      t('product.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage products',
      }),
    )
  }
