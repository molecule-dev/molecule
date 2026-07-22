/**
 * Type definitions for the request-logging middleware.
 *
 * @module
 */

/**
 * Options for the request-logging middleware.
 */
export interface RequestLoggingMiddlewareOptions {
  /**
   * Paths to exclude from logging (EXACT matches against `req.path`,
   * falling back to `req.url` — no prefixes or globs).
   * @default ['/health']
   */
  excludePaths?: string[]

  /**
   * Extra fields merged into every request log record (e.g.
   * `{ service: 'api', env: 'production' }`).
   */
  baseFields?: Record<string, unknown>

  /**
   * Derives extra log fields from the request (e.g. a request id or the
   * authenticated user's id). Runs at response `finish` time; a throwing
   * resolver is swallowed so it can never fail the request log.
   */
  resolveFields?: (req: unknown, res: unknown) => Record<string, unknown>
}
