/**
 * Shared error responder for resource handlers.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'

import type { MoleculeResponse } from './http-types.js'

const logger = getLogger()

/**
 * Fallback HTTP response used when a caught error is NOT a molecule-tagged error
 * (i.e. a genuinely-unexpected failure).
 */
export interface ErrorFallback {
  /** HTTP status for the fallback (typically 500). */
  status: number
  /** Human-readable fallback message (already localized by the caller). */
  message: string
  /** Machine-readable key the frontend maps to a localized message. */
  errorKey: string
}

/**
 * Respond to a caught handler error, honoring molecule's "tagged error" convention.
 *
 * A tagged error carries BOTH a numeric `statusCode` AND a string `errorKey` — the same
 * contract `@molecule/api-server-default-express`'s error middleware (`classifyTaggedError`)
 * uses. Providers throw these for expected, user-actionable conditions — e.g. a
 * config-missing throw (`503` + `'config.notConfigured'`) when `STRIPE_SECRET_KEY` is unset.
 *
 * Handlers that catch errors MUST funnel through this instead of a blanket
 * `res.status(500)`, so a tagged error surfaces its REAL status + errorKey rather than
 * being flattened to a generic 500. Otherwise the app looks broken at the exact moment the
 * user tries to use the feature — the worst possible time for a payment (the conversion
 * path). A swallowed tag is why the middleware-only fix was insufficient: ~185 handlers
 * catch-and-500, so the tag never reached the middleware.
 *
 * Tagged errors are logged at `warn` (expected/actionable, not a server fault); everything
 * else is logged at `error` and returns the caller's `fallback`. Requiring BOTH fields is
 * deliberate: it keeps arbitrary library errors that merely carry a `.statusCode` (e.g. an
 * AWS SDK 403) from being surfaced with a status molecule never chose.
 *
 * @param res - The response object.
 * @param error - The caught error.
 * @param fallback - Status/message/errorKey to use when `error` isn't a tagged error.
 */
export function respondError(res: MoleculeResponse, error: unknown, fallback: ErrorFallback): void {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (error as { errorKey?: unknown }).errorKey === 'string'
  ) {
    const tagged = error as { statusCode: number; errorKey: string; message?: unknown }
    const message = typeof tagged.message === 'string' ? tagged.message : fallback.message
    logger.warn(message, { errorKey: tagged.errorKey })
    res.status(tagged.statusCode).json({ error: message, errorKey: tagged.errorKey })
    return
  }
  logger.error(fallback.message, { error })
  res.status(fallback.status).json({ error: fallback.message, errorKey: fallback.errorKey })
}
