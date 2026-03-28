/**
 * Express middleware factory for rate limiting.
 *
 * Creates a middleware that consumes rate-limit tokens per incoming request
 * and returns HTTP 429 when the limit is exceeded.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import { getProvider } from './provider.js'
import type { RateLimitOptions } from './types.js'

/** Express-compatible request object (minimal shape). */
interface Request {
  ip?: string
  [key: string]: unknown
}

/** Express-compatible response object (minimal shape). */
interface Response {
  status(code: number): Response
  json(body: unknown): Response
  set(field: string, value: string): Response
  [key: string]: unknown
}

/** Express-compatible next function. */
type NextFunction = (err?: unknown) => void

/** Express-compatible request handler. */
export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>

/**
 * Creates an Express middleware that enforces rate limiting.
 *
 * When the rate limit is exceeded, responds with HTTP 429 and sets standard
 * rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`,
 * `Retry-After`).
 *
 * @param options - Optional rate limit configuration to apply before the middleware runs.
 * @returns An Express request handler.
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { createRateLimitMiddleware } from '@molecule/api-rate-limit'
 *
 * const app = express()
 * app.use(createRateLimitMiddleware({ windowMs: 60_000, max: 100 }))
 * ```
 */
export const createRateLimitMiddleware = (options?: RateLimitOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const provider = getProvider()

    if (options) {
      provider.configure(options)
    }

    const key = (req.ip as string) ?? 'unknown'
    const result = await provider.consume(key)

    res.set('RateLimit-Limit', String(result.total))
    res.set('RateLimit-Remaining', String(result.remaining))
    res.set('RateLimit-Reset', String(Math.ceil(result.resetAt.getTime() / 1000)))

    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter ?? 1))
      res.status(429).json({
        error: t('rateLimit.error.tooManyRequests', undefined, {
          defaultValue: 'Too many requests. Please try again later.',
        }),
      })
      return
    }

    next()
  }
}
