/**
 * Analytics middleware for molecule.dev.
 *
 * Tracks API request metrics (method, path, status, duration) via `getAnalytics()`.
 *
 * @module
 */

import { getAnalytics, getLogger } from '@molecule/api-bond'

import type { AnalyticsMiddlewareOptions } from './types.js'

/**
 * Minimal request shape used by the middleware.
 */
interface Req {
  method?: string
  url?: string
  path?: string
}

/**
 * Minimal response shape used by the middleware.
 */
interface Res {
  statusCode?: number
  on(event: string, listener: () => void): void
}

/**
 * Creates an analytics middleware that tracks every API request.
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { createAnalyticsMiddleware } from '@molecule/api-middleware-analytics'
 *
 * const app = express()
 * app.use(createAnalyticsMiddleware())
 * ```
 * @param options - Configuration options including paths to exclude from tracking.
 * @returns Express-compatible middleware that tracks requests on the `finish` event.
 */
export const createAnalyticsMiddleware = (options?: AnalyticsMiddlewareOptions) => {
  const excludePaths = options?.excludePaths ?? ['/health']
  const analytics = getAnalytics()
  const logger = getLogger()

  return (req: unknown, res: unknown, next: (err?: unknown) => void): void => {
    const request = req as Req
    const response = res as Res
    const path = request.path || request.url || ''

    if (excludePaths.includes(path)) {
      next()
      return
    }

    const start = Date.now()

    response.on('finish', () => {
      analytics
        .track({
          name: 'api.request',
          properties: {
            method: request.method || 'UNKNOWN',
            path,
            status: response.statusCode || 0,
            duration_ms: Date.now() - start,
          },
        })
        .catch((error) => {
          // Best-effort telemetry: it must never break the response path, but
          // a silently dropped event is worth a debug line.
          logger.debug('api.request analytics track failed', {
            error,
            method: request.method,
            path,
          })
        })
    })

    next()
  }
}
