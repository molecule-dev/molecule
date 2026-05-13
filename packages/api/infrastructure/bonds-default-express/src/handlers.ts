/**
 * Express handler helpers — extracted from the ~1200 inline duplicates
 * across the fleet's `api/src/handlers/*.ts` files.
 *
 * Replaces three patterns that every fleet handler inlines verbatim:
 * (1) `getUserId(res)` / `requireUser(res)` reading the JWT session;
 * (2) `getParamId(req, name)` defending against the express `req.params`
 * string-or-string[] type union;
 * (3) `AuthzResult<T>` + `requireOwnership/requireUserOwnership` for
 * 404-on-IDOR ownership checks against arbitrary tables.
 *
 * Also exports `validationError(res, issues)` and `internalError(res, err)`
 * response helpers that ~21 apps duplicate in their per-app
 * `api/src/lib/authz.ts`.
 *
 * @module
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

interface SessionLike {
  userId?: string
}

/**
 * Read the JWT session userId off `res.locals.session`. Returns null
 * when there is no session (the auth middleware never ran, or the
 * request is unauthenticated).
 */
export function getUserId(res: Response): string | null {
  return (res.locals.session as SessionLike | undefined)?.userId ?? null
}

/**
 * Like `getUserId` but writes a 401 + returns null when there's no
 * session. Use at the top of handler bodies to bail early:
 *
 * ```ts
 * const userId = requireUser(res)
 * if (!userId) return
 * ```
 */
export function requireUser(res: Response): string | null {
  const id = getUserId(res)
  if (!id) {
    res.status(401).json({
      error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return id
}

/**
 * Read a route param as a string, defending against the Express
 * type union `string | string[]` (multi-value when the same param
 * key appears more than once). Defaults to `'id'`.
 */
export function getParamId(req: Request, name: string = 'id'): string {
  const v = req.params[name]
  return Array.isArray(v) ? v[0] : v
}

/**
 * Result of an ownership check. `ok: true` carries the resolved row;
 * `ok: false` carries the HTTP status the handler should return —
 * always 404 to avoid leaking row existence to non-owners (the
 * "no IDOR" rule).
 */
export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

/**
 * Look up a row by id and verify the caller owns it via `owner_id`.
 * Returns the row on success, 404 when missing OR owned by a different
 * user (so attackers can't probe row existence).
 */
export async function requireOwnership<T extends { owner_id?: unknown } = Record<string, unknown>>(
  table: string,
  id: string,
  userId: string,
): Promise<AuthzResult<T>> {
  const row = await findById<T>(table, id)
  if (!row) return { ok: false, status: 404 }
  if (String((row as { owner_id?: unknown }).owner_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row }
}

/**
 * Variant of `requireOwnership` for tables that scope by `user_id`
 * instead of `owner_id` (notifications, user-bound preferences, etc.).
 */
export async function requireUserOwnership<
  T extends { user_id?: unknown } = Record<string, unknown>,
>(table: string, id: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>(table, id)
  if (!row) return { ok: false, status: 404 }
  if (String((row as { user_id?: unknown }).user_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row }
}

/**
 * Express middleware that 401s any request lacking `res.locals.session.userId`.
 * Drop-in for the fleet's 51 inline `requireAuth` copies.
 *
 * @example
 * ```ts
 * router.use(requireAuth)
 * router.get('/private', handler)
 * ```
 */
export const requireAuth: RequestHandler = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!(res.locals.session as SessionLike | undefined)?.userId) {
    res.status(401).json({
      error: t('auth.required', undefined, { defaultValue: 'Authentication required' }),
    })
    return
  }
  next()
}

/**
 * Standard 400 response for zod / schema validation failures.
 * Used by ~21 fleet apps' `api/src/lib/authz.ts` files.
 */
export function validationError(res: Response, issues: unknown): void {
  res.status(400).json({
    error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
    issues,
  })
}

/**
 * Standard 500 response that logs the underlying cause before responding
 * with a generic message. Always pass the original error so silent
 * catches don't ship to prod under green tests.
 */
export function internalError(res: Response, error?: unknown): void {
  if (error !== undefined) {
    logger.error(error)
  } else {
    logger.error(new Error('internalError() called without an underlying cause'))
  }
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}
