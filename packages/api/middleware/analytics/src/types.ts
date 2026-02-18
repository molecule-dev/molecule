/**
 * Type definitions for the analytics middleware.
 *
 * @module
 */

/**
 * Options for the analytics middleware.
 */
export interface AnalyticsMiddlewareOptions {
  /**
   * Paths to exclude from tracking.
   * @default ['/health']
   */
  excludePaths?: string[]
}
