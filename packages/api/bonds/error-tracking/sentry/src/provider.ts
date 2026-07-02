/**
 * Sentry error tracking provider implementation.
 *
 * Lazily initializes the Sentry SDK from `SENTRY_DSN` on first use. WITHOUT
 * a DSN every method is a documented no-op — an app that installed the bond
 * but hasn't configured Sentry must keep working untouched (the boot-time
 * config report flags the missing key; see `secrets.ts`).
 *
 * @see https://www.npmjs.com/package/@sentry/node
 *
 * @module
 */

import * as Sentry from '@sentry/node'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  ErrorTrackingContext,
  ErrorTrackingLevel,
  ErrorTrackingProvider,
  ErrorTrackingUser,
} from '@molecule/api-error-tracking'

/** Whether `Sentry.init()` has already run (it must run exactly once). */
let initialized = false

/**
 * Parses `SENTRY_TRACES_SAMPLE_RATE` into a valid sample rate.
 *
 * @param raw - The raw env var value.
 * @returns A number in [0, 1], or `undefined` when unset/invalid (invalid
 *   values are warned about — tracing is then disabled, never crashed on).
 */
const parseTracesSampleRate = (raw: string | undefined): number | undefined => {
  if (raw === undefined || raw === '') return undefined
  const rate = Number(raw)
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    logger.warn(
      `error-tracking: SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1 — got "${raw}"; tracing disabled.`,
    )
    return undefined
  }
  return rate
}

/**
 * Lazily initializes the Sentry SDK from the environment (exactly once).
 *
 * @returns `true` when Sentry is initialized and captures may proceed;
 *   `false` when `SENTRY_DSN` is unset (the documented no-op mode).
 */
const ensureInitialized = (): boolean => {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    // Documented no-op: no DSN means the app installed the bond but hasn't
    // configured Sentry. Captures silently do nothing — the boot config
    // report already flags the missing SENTRY_DSN loudly.
    return false
  }
  if (!initialized) {
    Sentry.init({
      dsn,
      // `||` (not `??`): an empty-string env var means "unset" here.
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: parseTracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    })
    initialized = true
  }
  return true
}

/**
 * Maps the normalized molecule user to Sentry's user shape.
 *
 * @param user - The normalized user.
 * @returns The equivalent Sentry `User`.
 */
const toSentryUser = (user: ErrorTrackingUser): Sentry.User => ({
  id: user.id,
  email: user.email,
  username: user.username,
  ip_address: user.ipAddress,
})

/** The Sentry capture context (partial scope) built from normalized context. */
interface SentryCaptureContext {
  tags?: Record<string, string | number | boolean>
  user?: Sentry.User
  extra?: Record<string, unknown>
  level?: Sentry.SeverityLevel
}

/**
 * Maps the normalized {@link ErrorTrackingContext} to a Sentry capture
 * context (scope partial): `tags` → scope tags, `user` → scope user,
 * `extra` → scope extra, and `request` folded into `extra.request` so it
 * shows up as structured additional data.
 *
 * @param context - The normalized context, if any.
 * @param level - The severity level, if any.
 * @returns The Sentry capture context, or `undefined` when there is nothing to attach.
 */
const toCaptureContext = (
  context?: ErrorTrackingContext,
  level?: ErrorTrackingLevel,
): SentryCaptureContext | undefined => {
  const captureContext: SentryCaptureContext = {}
  if (context?.tags) captureContext.tags = context.tags
  if (context?.user) captureContext.user = toSentryUser(context.user)
  if (context?.extra || context?.request) {
    captureContext.extra = {
      ...context.extra,
      ...(context.request ? { request: context.request } : {}),
    }
  }
  if (level) captureContext.level = level
  return Object.keys(captureContext).length > 0 ? captureContext : undefined
}

/**
 * Sentry error tracking provider. Lazily initialized from `SENTRY_DSN`;
 * every method is a documented no-op while the DSN is unset.
 */
export const provider: ErrorTrackingProvider = {
  captureException(error: unknown, context?: ErrorTrackingContext): string | void {
    if (!ensureInitialized()) return undefined
    return Sentry.captureException(error, toCaptureContext(context))
  },

  captureMessage(
    message: string,
    level: ErrorTrackingLevel = 'info',
    context?: ErrorTrackingContext,
  ): string | void {
    if (!ensureInitialized()) return undefined
    return Sentry.captureMessage(message, toCaptureContext(context, level))
  },

  setUser(user: ErrorTrackingUser | null): void {
    if (!ensureInitialized()) return
    Sentry.setUser(user ? toSentryUser(user) : null)
  },

  async flush(timeoutMs?: number): Promise<boolean> {
    // Nothing was ever initialized, so nothing is buffered — report success
    // without touching the SDK (documented no-op mode).
    if (!initialized) return true
    return Sentry.flush(timeoutMs)
  },
}
