/**
 * Default Express middleware helpers used by the molecule fleet's
 * `api/src/middleware/<name>.ts` files.
 *
 * @module
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { track } from '@molecule/api-analytics'
import { logger } from '@molecule/api-logger'

/**
 * Emits an analytics event AND a log entry for an auth-related mutation
 * (signup, login, password reset, plan change, etc.). Logs at info on
 * success and warn on auth failure (4xx) so security signal is captured.
 *
 * Replaces the per-app `api/src/middleware/auth-analytics.ts` shipped
 * by 10 fleet apps.
 *
 * @example
 * ```ts
 * import { trackAuthEvent } from '@molecule/api-bonds-default-express'
 * router.post('/users/log-in', trackAuthEvent('user.login'), User.logIn)
 * ```
 */
export function trackAuthEvent(eventName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0]
      const ok = res.statusCode >= 200 && res.statusCode < 400
      if (ok) {
        void track({
          name: eventName,
          properties: { method: req.method, userId: id },
        })
        logger.info(
          `[auth] ${eventName} method=${req.method} userId=${id ?? '-'} status=${res.statusCode}`,
        )
      } else if (res.statusCode >= 400 && res.statusCode < 500) {
        logger.warn(
          `[auth] ${eventName} failed method=${req.method} userId=${id ?? '-'} status=${res.statusCode}`,
        )
      }
    })
    next()
  }
}
