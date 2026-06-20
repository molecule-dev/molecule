import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import { configure, consume, hasProvider } from '@molecule/api-rate-limit'
import type { RateLimitResult } from '@molecule/api-rate-limit'
import type { MoleculeRequest, MoleculeRequestHandler } from '@molecule/api-resource'

const logger = getLogger()

/** Default sliding window for auth endpoints: 15 minutes. */
const DEFAULT_WINDOW_MS = 15 * 60_000

/** Default per-account max attempts per window — a deliberately low ceiling. */
const DEFAULT_MAX = 10

/**
 * Default per-IP max attempts per window. Deliberately more generous than the
 * per-account ceiling so a shared-NAT / office / mobile-carrier IP isn't locked
 * out by many distinct legitimate users — the tight per-account bucket is the
 * real anti-brute-force gate. Still bounds raw flooding and password-spray from
 * a single source.
 */
const DEFAULT_IP_MAX = 60

/**
 * Configuration for {@link rateLimit}.
 */
export interface RateLimitAuthOptions {
  /**
   * Key namespace so each protected surface gets an isolated bucket
   * (e.g. `'login'`, `'forgot-password'`, `'2fa'`). Buckets never collide
   * across scopes.
   */
  scope: string

  /** Sliding window in milliseconds (default: 15 minutes). */
  windowMs?: number

  /**
   * Maximum attempts per window for the per-account bucket before a 429
   * (default: 10). This is the tight brute-force gate; a legitimate user makes
   * only a handful of attempts, so it never trips for them.
   */
  max?: number

  /**
   * Maximum attempts per window for the per-IP bucket (default: 60). Kept
   * higher than {@link RateLimitAuthOptions.max} so shared public IPs aren't
   * locked out; primarily catches single-source flooding and password-spray
   * across many accounts, and is the only guard when no account is resolvable
   * (e.g. an OAuth login carrying no email).
   */
  ipMax?: number

  /**
   * Optional extractors for an account identifier (submitted email/username,
   * the target user id, etc.). When one resolves, the request is ALSO bucketed
   * per account — so a distributed attack against a single account is throttled
   * even when the source IP rotates, and the second factor is temp-locked after
   * `max` consecutive misses regardless of IP. Each extractor is tried; every
   * value that resolves contributes a bucket.
   */
  accountFrom?: ReadonlyArray<(req: MoleculeRequest) => string | undefined>
}

/**
 * Resolves the client IP for rate-limit bucketing. Prefers the
 * framework-populated `req.ip` (Express honors `trust proxy`, so it is not
 * client-spoofable) and falls back to `'unknown'` so a missing IP still shares
 * a single throttled bucket rather than bypassing the limit.
 *
 * @param req - The incoming request.
 * @returns A stable IP key.
 */
const resolveIp = (req: MoleculeRequest): string => {
  return req.ip ?? 'unknown'
}

/**
 * Creates an authorizer middleware that brute-force-protects an auth endpoint.
 *
 * Consumes a rate-limit token per request, keyed by client IP and — where
 * resolvable — by account identifier, returning HTTP 429 once the low ceiling
 * is exceeded. This closes the unthrottled-auth default that left passwords and
 * the 6-digit TOTP second factor brute-forceable on `mlcl`-generated apps.
 *
 * Availability is preserved over absolute enforcement: if no rate-limit
 * provider is bonded (an app deliberately removed it) or the limiter itself
 * errors, the request is allowed through (with a logged warning/error) so a
 * limiter outage never locks out every legitimate login. Generated apps wire
 * the default in-memory provider via the registry's `alwaysInclude`/
 * `defaultProvider`, so the throttle is active out of the box.
 *
 * @param options - Scope, window, ceiling, and optional account-key extractors.
 * @returns A `MoleculeRequestHandler` to place ahead of the protected handler.
 */
export const rateLimit = (options: RateLimitAuthOptions): MoleculeRequestHandler => {
  const { scope } = options
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const max = options.max ?? DEFAULT_MAX
  const ipMax = options.ipMax ?? Math.max(DEFAULT_IP_MAX, max)
  const accountFrom = options.accountFrom ?? []

  return async (req, res, next) => {
    if (!hasProvider()) {
      logger.warn(
        `Rate-limit provider not bonded; auth endpoint "${scope}" is running unthrottled. ` +
          'Wire @molecule/api-rate-limit-memory (or -redis) to enable brute-force protection.',
      )
      return next()
    }

    try {
      // Each bucket carries its own ceiling: the per-IP bucket is generous (so
      // shared public IPs aren't locked out) while each per-account bucket is
      // tight (the real brute-force gate). `configure` is applied right before
      // each `consume` so the bucket-specific limit is in effect for it.
      const buckets: ReadonlyArray<{ key: string; max: number }> = [
        { key: `auth:${scope}:ip:${resolveIp(req)}`, max: ipMax },
        ...[...new Set(accountFrom.map((extract) => extract(req)).filter(Boolean) as string[])].map(
          (value) => ({ key: `auth:${scope}:acct:${value.toLowerCase()}`, max }),
        ),
      ]

      let tightest: RateLimitResult | undefined
      let limited: RateLimitResult | undefined
      for (const bucket of buckets) {
        configure({ windowMs, max: bucket.max })
        const result = await consume(bucket.key)
        if (!tightest || result.remaining < tightest.remaining) {
          tightest = result
        }
        if (!result.allowed && (!limited || (result.retryAfter ?? 0) > (limited.retryAfter ?? 0))) {
          limited = result
        }
      }

      if (tightest) {
        res.setHeader('RateLimit-Limit', String(tightest.total))
        res.setHeader('RateLimit-Remaining', String(tightest.remaining))
        res.setHeader('RateLimit-Reset', String(Math.ceil(tightest.resetAt.getTime() / 1000)))
      }

      if (limited) {
        res.setHeader('Retry-After', String(limited.retryAfter ?? 1))
        res.status(429).json({
          error: t('user.error.tooManyRequests', undefined, {
            defaultValue: 'Too many attempts. Please wait and try again.',
          }),
          errorKey: 'user.error.tooManyRequests',
        })
        return
      }
    } catch (error) {
      // A rate-limit infrastructure failure (e.g. Redis down) must never lock
      // out legitimate users: log and let the request through. The handler
      // still enforces credentials/authorization.
      logger.error(`Rate-limit check failed for auth endpoint "${scope}"`, { error })
      return next()
    }

    return next()
  }
}

/**
 * Account-identifier extractor for the login endpoint: the submitted username
 * or email. Bucketing on this temp-locks a single targeted account after `max`
 * failed attempts even across rotating IPs (which also covers TOTP-via-login
 * brute force, since the login handler verifies the second factor).
 *
 * @param req - The incoming request.
 * @returns The submitted username or email (if present).
 */
export const loginAccountKey = (req: MoleculeRequest): string | undefined => {
  const body = (req.body ?? {}) as { username?: unknown; email?: unknown }
  const username = typeof body.username === 'string' ? body.username : undefined
  const email = typeof body.email === 'string' ? body.email : undefined
  return username || email
}

/**
 * Account-identifier extractor for the forgot-password endpoint: the submitted
 * email.
 *
 * @param req - The incoming request.
 * @returns The submitted email (if present).
 */
export const emailAccountKey = (req: MoleculeRequest): string | undefined => {
  const body = (req.body ?? {}) as { email?: unknown }
  return typeof body.email === 'string' ? body.email : undefined
}

/**
 * Account-identifier extractor for the verify-two-factor endpoint: the target
 * user id in the route params. Temp-locks the second factor per account after
 * `max` consecutive misses.
 *
 * @param req - The incoming request.
 * @returns The target user id (if present).
 */
export const paramIdAccountKey = (req: MoleculeRequest): string | undefined => {
  const id = req.params?.id
  return typeof id === 'string' ? id : undefined
}
