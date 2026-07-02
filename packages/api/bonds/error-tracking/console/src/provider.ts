/**
 * Console (logger-based) error tracking provider implementation.
 *
 * Zero-credential development default: every capture is written as a
 * structured log line through the bonded logger (`getLogger()` from
 * `@molecule/api-bond`, console fallback). Nothing leaves the process, so
 * there is nothing to configure and nothing to flush.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { getLogger } from '@molecule/api-bond'
import type {
  ErrorTrackingContext,
  ErrorTrackingLevel,
  ErrorTrackingProvider,
  ErrorTrackingUser,
} from '@molecule/api-error-tracking'

const logger = getLogger()

/** Maps a normalized severity level to the logger method that renders it. */
const levelToLogMethod: Record<ErrorTrackingLevel, 'error' | 'warn' | 'info' | 'debug'> = {
  fatal: 'error',
  error: 'error',
  warning: 'warn',
  info: 'info',
  debug: 'debug',
}

/** The user set via `setUser()`, merged into subsequent captures (Sentry-scope parity). */
let currentUser: ErrorTrackingUser | null = null

/**
 * Builds the structured log payload for a capture: the per-capture context
 * with the scoped `setUser()` user applied when the capture has none.
 *
 * @param context - The capture's normalized context, if any.
 * @returns Structured fields for the log line (empty fields omitted).
 */
const toLogFields = (context?: ErrorTrackingContext): Record<string, unknown> => {
  const fields: Record<string, unknown> = {}
  if (context?.tags) fields.tags = context.tags
  const user = context?.user ?? currentUser
  if (user) fields.user = user
  if (context?.extra) fields.extra = context.extra
  if (context?.request) fields.request = context.request
  return fields
}

/**
 * Console error tracking provider. Logs structured captures through the
 * bonded logger and reports a generated event id, mirroring the remote
 * providers' behavior so app code works identically in development.
 */
export const provider: ErrorTrackingProvider = {
  captureException(error: unknown, context?: ErrorTrackingContext): string | void {
    const eventId = randomUUID()
    logger.error('error-tracking: exception captured', {
      eventId,
      error,
      ...toLogFields(context),
    })
    return eventId
  },

  captureMessage(
    message: string,
    level: ErrorTrackingLevel = 'info',
    context?: ErrorTrackingContext,
  ): string | void {
    const eventId = randomUUID()
    logger[levelToLogMethod[level]]('error-tracking: message captured', {
      eventId,
      message,
      level,
      ...toLogFields(context),
    })
    return eventId
  },

  setUser(user: ErrorTrackingUser | null): void {
    currentUser = user
  },

  async flush(_timeoutMs?: number): Promise<boolean> {
    // Captures are written synchronously to the logger — nothing is ever
    // buffered, so a flush always trivially succeeds.
    return true
  },
}
