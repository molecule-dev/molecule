/**
 * Request-logging middleware for molecule.dev.
 *
 * Emits one structured log record per HTTP request — method, path, status
 * code, and duration — through the bonded `@molecule/api-logger`, on the
 * response `finish` event.
 *
 * @module
 */

import { logger } from '@molecule/api-logger'

import type { RequestLoggingMiddlewareOptions } from './types.js'

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
 * Creates a request-logging middleware that logs every API request.
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { createRequestLoggingMiddleware } from '@molecule/api-middleware-request-logging'
 *
 * const app = express()
 * app.use(createRequestLoggingMiddleware())
 * ```
 * @param options - Configuration options including paths to exclude from logging.
 * @returns Express-compatible middleware that logs requests on the `finish` event.
 */
export const createRequestLoggingMiddleware = (options?: RequestLoggingMiddlewareOptions) => {
  const excludePaths = options?.excludePaths ?? ['/health']
  const baseFields = options?.baseFields
  const resolveFields = options?.resolveFields

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
      const status = response.statusCode || 0
      const record: Record<string, unknown> = {
        event: 'http.request',
        method: request.method || 'UNKNOWN',
        path,
        status,
        duration_ms: Date.now() - start,
        ...baseFields,
      }
      if (resolveFields) {
        try {
          Object.assign(record, resolveFields(req, res))
        } catch (_error) {
          // A throwing field resolver must never lose the request log itself —
          // the base record above is complete on its own.
        }
      }
      // 5xx → error, 4xx → warn, everything else → info: log-level alerting
      // rules (and humans tailing logs) key off severity, not the payload.
      if (status >= 500) logger.error('http.request', record)
      else if (status >= 400) logger.warn('http.request', record)
      else logger.info('http.request', record)
    })

    next()
  }
}
