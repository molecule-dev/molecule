/**
 * Error tracking convenience functions.
 *
 * Unlike most core convenience modules, these NEVER throw:
 *
 * - When no provider is bonded they are a silent, documented no-op (returning
 *   `undefined` / `true`). Error tracking is a diagnostic side-channel — an
 *   app that hasn't wired a tracker must behave exactly as if the calls
 *   weren't there.
 * - When the bonded provider itself throws, the failure is logged (warn) and
 *   swallowed for the same reason: a broken reporter must never take down the
 *   request or process it is reporting on.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'

import { getOptionalProvider } from './provider.js'
import type { ErrorTrackingContext, ErrorTrackingLevel, ErrorTrackingUser } from './types.js'

const logger = getLogger()

/**
 * Reports an exception (or any thrown value) to the bonded error tracking
 * provider. Silent no-op when no provider is bonded; never throws.
 *
 * @param error - The thrown value to report.
 * @param context - Optional normalized context (tags/user/extra/request).
 * @returns The backend's event id when available, otherwise `undefined`.
 */
export const captureException = (
  error: unknown,
  context?: ErrorTrackingContext,
): string | undefined => {
  const provider = getOptionalProvider()
  // Documented no-op: no provider bonded means error tracking is not enabled
  // for this app — behave as if the call weren't there.
  if (!provider) return undefined
  try {
    return provider.captureException(error, context) ?? undefined
  } catch (captureError) {
    logger.warn('error-tracking: captureException failed — the report was not delivered', {
      error: captureError,
    })
    return undefined
  }
}

/**
 * Reports a standalone message to the bonded error tracking provider.
 * Silent no-op when no provider is bonded; never throws.
 *
 * @param message - The message to report.
 * @param level - Severity level (providers default to `'info'` when omitted).
 * @param context - Optional normalized context (tags/user/extra/request).
 * @returns The backend's event id when available, otherwise `undefined`.
 */
export const captureMessage = (
  message: string,
  level?: ErrorTrackingLevel,
  context?: ErrorTrackingContext,
): string | undefined => {
  const provider = getOptionalProvider()
  // Documented no-op: see captureException.
  if (!provider) return undefined
  try {
    return provider.captureMessage(message, level, context) ?? undefined
  } catch (captureError) {
    logger.warn('error-tracking: captureMessage failed — the report was not delivered', {
      error: captureError,
    })
    return undefined
  }
}

/**
 * Associates subsequent captures with a user (`null` clears it). Silent
 * no-op when no provider is bonded or the provider has no user scoping;
 * never throws.
 *
 * @param user - The user to associate, or `null` to clear.
 */
export const setUser = (user: ErrorTrackingUser | null): void => {
  const provider = getOptionalProvider()
  // Documented no-op: see captureException. Also a no-op when the bonded
  // provider doesn't implement optional user scoping.
  if (!provider?.setUser) return
  try {
    provider.setUser(user)
  } catch (setUserError) {
    logger.warn('error-tracking: setUser failed — user scoping was not applied', {
      error: setUserError,
    })
  }
}

/**
 * Flushes buffered events to the backend — call before process exit so
 * queued reports aren't lost. Resolves `true` when no provider is bonded or
 * the provider delivers synchronously (nothing to flush); never rejects.
 *
 * @param timeoutMs - Maximum time to wait for delivery.
 * @returns `true` when everything flushed within the timeout.
 */
export const flush = async (timeoutMs?: number): Promise<boolean> => {
  const provider = getOptionalProvider()
  // Documented no-op: nothing bonded (or nothing buffered) means there is
  // nothing to flush — report success.
  if (!provider?.flush) return true
  try {
    return await provider.flush(timeoutMs)
  } catch (flushError) {
    logger.warn('error-tracking: flush failed — buffered reports may be lost', {
      error: flushError,
    })
    return false
  }
}
