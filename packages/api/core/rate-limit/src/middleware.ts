/**
 * Express middleware factory for rate limiting.
 *
 * Creates a middleware that consumes rate-limit tokens per incoming request
 * and returns HTTP 429 when the limit is exceeded.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import { getProvider } from './provider.js'
import type { RateLimitOptions } from './types.js'

/** Bonded logger (falls back to console) for surfacing refund failures. */
const logger = getLogger()

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
  /** Final HTTP status code, read after the response completes. */
  statusCode: number
  /** Registers a listener (used for the `'finish'` event) to observe completion. */
  on(event: string, listener: () => void): Response
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
 * If `options.skipFailedRequests` or `options.skipSuccessfulRequests` is set, the
 * token consumed for an allowed request is refunded (via `provider.refund()`) once
 * the response completes and its final status matches — failed is `statusCode >= 400`,
 * successful is `< 400` — so those requests are not counted against the limit.
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

    const skipFailed = options?.skipFailedRequests ?? false
    const skipSuccessful = options?.skipSuccessfulRequests ?? false

    if (skipFailed || skipSuccessful) {
      // The final status is only known after the handler responds, so roll the
      // just-consumed token back once the response completes if it matches a
      // skip flag. Consuming up front (rather than deferring) preserves the
      // provider's atomicity guarantee under concurrency.
      res.on('finish', () => {
        const failed = res.statusCode >= 400
        const shouldSkip = (failed && skipFailed) || (!failed && skipSuccessful)
        if (!shouldSkip) {
          return
        }
        provider.refund(key).catch((error: unknown) => {
          logger.warn(
            '[api-rate-limit] failed to refund a skipped request; its token stays counted',
            { error },
          )
        })
      })
    }

    next()
  }
}
