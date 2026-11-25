/**
 * Helpers for a resource package's own route handlers: the signed-in user's id, a 401 for a
 * request without one, one route parameter as a string, and the `:id` parameter schema.
 *
 * They take {@link MoleculeRequest} and {@link MoleculeResponse}, so an Express `Request` and
 * `Response` pass as they are, and a resource that uses them depends on this package only, not
 * on an app's bond bundle.
 *
 * @module
 */

import { z } from 'zod'

import { t } from '@molecule/api-i18n'

import type { MoleculeRequest, MoleculeResponse } from './http-types.js'

/**
 * The signed-in user's id, from the session the auth middleware puts on `res.locals.session`.
 *
 * @param res - The response of the request.
 * @returns The user id, or null when the request has no session (the auth middleware did not
 *   run, or the request is anonymous).
 */
export function getUserId(res: MoleculeResponse): string | null {
  return (res.locals.session as { userId?: string } | undefined)?.userId ?? null
}

/**
 * Like {@link getUserId}, but answers 401 when the request has no session. It is for a route
 * function that answers through `res` itself (a package's own Express `routes.ts`); a handler
 * wrapped by `createRequestHandler` returns its answer instead and reads {@link getUserId}. Call
 * it at the top of the route function and return when it gives null:
 *
 * ```ts
 * const userId = requireUser(res)
 * if (!userId) return
 * ```
 *
 * @param res - The response of the request.
 * @returns The user id, or null after the 401 is sent.
 */
export function requireUser(res: MoleculeResponse): string | null {
  const id = getUserId(res)
  if (!id) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized.' }),
    })
    return null
  }
  return id
}

/**
 * One route parameter as a string. Express 5 types a parameter as `string | string[]` (a
 * repeated or wildcard segment is an array), so this takes the first value of an array.
 *
 * @param req - The request.
 * @param name - The parameter's name (default `id`).
 * @returns The parameter's value.
 */
export function getParamId(req: MoleculeRequest, name: string = 'id'): string {
  const value = req.params[name]
  return Array.isArray(value) ? value[0] : value
}

/**
 * The `:id` route parameter: any non-empty string. Pair it with a params validator
 * (`validateParams(idParamSchema)` from `@molecule/api-middleware-validation`, whose own
 * `idParamSchema` requires a UUID).
 */
export const idParamSchema = z.object({ id: z.string().min(1) })
