import { getLogger } from '@molecule/api-bond'
import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { AUTH_TOKEN_LOCALS_KEY } from '../authorization.js'
import type * as types from '../types.js'
import { getPlan } from '../utilities/getPlan.js'
import { stripSensitiveUserColumns } from '../utilities/stripSensitiveUserColumns.js'

const logger = getLogger()

/**
 * Reads the AUTHENTICATED user from the session — no `:id` param. Backs
 * `GET /users/me`, which the app's auth client calls on init to RESTORE the
 * session after a full page load.
 *
 * [M1-1] The bearer token is held in memory (a localStorage copy is
 * XSS-exfiltratable and is forbidden), so it is lost on reload; the httpOnly
 * session cookie is the persistent credential. The `auth` middleware reads that
 * cookie into `res.locals.session`, and this handler returns the current user
 * so the client can re-establish `authenticated` state WITHOUT the token ever
 * being exposed to JavaScript. Always self, so it mirrors `read`'s self branch
 * (plan + two-factor status).
 *
 * **Token-only clients get the token back as `accessToken`.** When the request
 * authenticated with an `Authorization` header (any accepted scheme — `Bearer` or
 * `Token`), the middleware records that raw JWT and this response echoes it, so a
 * RealWorld-style client can restore `{ user, token }` from `GET /user` the same way
 * login and registration return it. A session resolved from the httpOnly cookie
 * NEVER gets this field: exposing that token to JavaScript would defeat the cookie.
 * @param resource - The user resource configuration: `{ name, tableName, schema? }` (`name` and `schema` are optional here).
 * @param resource.tableName - The database table name for users.
 * @returns A request handler responding `{ statusCode: 200, body: { props, plan?, twoFactorEnabled?, accessToken? } }`, or 401 when unauthenticated.
 */
export const readSelf = ({ tableName }: types.HandlerResource) => {
  return async (_req: MoleculeRequest, res: MoleculeResponse) => {
    try {
      const userId = (res.locals.session as { userId?: string } | undefined)?.userId
      if (!userId) {
        return {
          statusCode: 401,
          body: {
            error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
            errorKey: 'resource.error.unauthorized',
          },
        }
      }

      const user = await findById<types.Props>(tableName, userId)
      if (!user) {
        // Valid session whose user row no longer exists (deleted account holding
        // a still-live cookie) — treat as unauthenticated so the client clears
        // its state, not 404.
        return {
          statusCode: 401,
          body: {
            error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
            errorKey: 'resource.error.unauthorized',
          },
        }
      }

      const plan = await getPlan(user)
      const body: Record<string, unknown> = { props: stripSensitiveUserColumns(user) }
      if (plan) {
        body.plan = plan
      }

      // A header-authenticated caller already holds this token; the middleware
      // records it only for that case, never for a cookie-resolved session.
      const accessToken = res.locals?.[AUTH_TOKEN_LOCALS_KEY]
      if (typeof accessToken === 'string' && accessToken) {
        body.accessToken = accessToken
      }

      // Always self — include two-factor setup info like `read`'s self branch.
      try {
        const secrets = await findById<types.SecretProps>(`${tableName}Secrets`, userId)
        if (secrets) {
          body.twoFactorEnabled = user.twoFactorEnabled || false
          body.hasPendingTwoFactor = Boolean(secrets.pendingTwoFactorSecret)
        }
      } catch (_error) {
        // Non-critical: the secrets table may not exist yet (pre-migration) or the
        // row may be absent. Callers treat absence as false.
      }

      return { statusCode: 200, body }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: { error: t('user.error.failedToReadUser'), errorKey: 'user.error.failedToReadUser' },
      }
    }
  }
}
