/**
 * JWT session authorization for user resources.
 *
 * Provides middleware to verify, set, and refresh JWT tokens.
 *
 * @module
 */

import { v4 as uuid } from 'uuid'

import { get, getLogger } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import { decode, sign, verify as jwtVerify } from '@molecule/api-jwt'
import type {
  MoleculeRequest,
  MoleculeRequestHandler,
  MoleculeResponse,
} from '@molecule/api-resource'

import type { Session } from './schema.js'

const logger = getLogger()

const getJwtRefreshTime = (): number => {
  try {
    return Number(getConfig('JWT_REFRESH_TIME', '30d')) || 1000 * 60 * 30 // 30 minutes
  } catch (_error) {
    // Config read is optional — fall back to the hard-coded default safely.
    return 1000 * 60 * 30 // 30 minutes default
  }
}

const isProduction = (): boolean => {
  try {
    return getConfig('NODE_ENV') === 'production'
  } catch (_error) {
    // Config read is optional — treat an unreadable env as non-production so
    // we never accidentally emit `__Host-` cookies on an insecure (non-HTTPS)
    // origin where the browser would silently reject them.
    return false
  }
}

/**
 * Resolve the actual cookie name for an auth cookie.
 *
 * In production the auth-bearing cookies get the `__Host-` prefix. Browsers
 * reject any `__Host-`-prefixed cookie that carries a `Domain` attribute (and
 * require `Secure` + `Path=/`), so a sibling subdomain (e.g. a tenant preview
 * at `<token>.preview.molecule.dev`) can no longer create a colliding
 * `.molecule.dev`-scoped duplicate that shadows the platform's real session
 * cookie — closing the cross-tenant cookie-tossing / session-fixation hole.
 *
 * In dev/test the cookies are not `Secure` (plain HTTP origins), so a
 * `__Host-` cookie would be rejected by the browser; use the plain name there.
 *
 * Exported so consumers (e.g. molecule-dev's guest-session / OAuth-state code)
 * set and read the exact same name the platform expects.
 *
 * @param base - The base cookie name (e.g. `'token'`, `'sessionId'`).
 * @returns The environment-appropriate cookie name.
 */
export const getAuthCookieName = (base: string): string =>
  isProduction() ? `__Host-${base}` : base

/**
 * Read an auth cookie by its base name, accepting BOTH the `__Host-`-prefixed
 * production name and the plain name. Reading both keeps existing sessions
 * working across a deploy that flips the prefix on, and keeps the dev/prod
 * read paths identical.
 *
 * @param cookies - The request cookies map.
 * @param base - The base cookie name.
 * @returns The cookie value, or `undefined` if neither name is present.
 */
const readAuthCookie = (cookies: Record<string, unknown> | undefined, base: string): unknown =>
  cookies?.[getAuthCookieName(base)] ?? cookies?.[base]

/**
 * Short-TTL positive cache for "device still exists" lookups, to bound the
 * per-request DB cost of server-side session-revocation enforcement.
 *
 * IMPORTANT: only POSITIVE results (device exists) are cached. A "device not
 * found" result is NEVER cached, so logout / remote device revocation /
 * password-reset invalidation take effect immediately for every copy of the
 * token rather than lingering for the TTL.
 */
const deviceExistsCacheTtlMs = 10_000
const deviceExistsCache = new Map<string, number>()

/**
 * Determine whether a session's device is still active (i.e. has not been
 * revoked by logout, remote device removal, or a password reset). This is the
 * server-side revocation check that makes those controls actually terminate a
 * session instead of leaving the JWT valid until natural expiry.
 *
 * Behaviour:
 * - If no device bond exposing `exists` is wired (e.g. an app that doesn't
 *   track devices), revocation cannot be enforced, so the session is allowed
 *   (backward-compatible — no functionality regression).
 * - If `exists` returns `false`, the device was revoked → reject.
 * - If the lookup throws (transient infra failure), the session is allowed
 *   (best-effort, fail-open on errors only) and the error is logged, so a DB
 *   blip does not log out the entire platform. A genuine revocation returns a
 *   definitive `false`, which is always honoured.
 *
 * @param deviceId - The device id from the verified session.
 * @returns `true` if the session may proceed, `false` if it was revoked.
 */
const isDeviceActive = async (deviceId: string): Promise<boolean> => {
  const deviceService = get<{ exists?(deviceId: string): Promise<boolean> }>('device')

  // No device-tracking bond, or a bond that predates the `exists` capability —
  // cannot enforce revocation here; do not break auth.
  if (typeof deviceService?.exists !== 'function') {
    return true
  }

  const cachedAt = deviceExistsCache.get(deviceId)
  if (cachedAt !== undefined && Date.now() - cachedAt < deviceExistsCacheTtlMs) {
    return true
  }

  try {
    const exists = await deviceService.exists(deviceId)
    if (exists) {
      deviceExistsCache.set(deviceId, Date.now())
      return true
    }
    // Definitive revocation — drop any stale positive cache entry and reject.
    deviceExistsCache.delete(deviceId)
    return false
  } catch (error) {
    // Best-effort: a transient lookup failure must not log out everyone.
    logger.warn('authorization: device revocation check failed; allowing session', {
      deviceId,
      error,
    })
    return true
  }
}

/**
 * Set authorization headers and cookie for a session.
 *
 * @param _req - The request object (unused; reserved for handler signature parity).
 * @param res - The response object.
 * @param session - The session.
 * @returns The signed JWT token string, or null if signing failed.
 */
export const set = (
  _req: MoleculeRequest,
  res: MoleculeResponse,
  session: Session,
): string | null => {
  try {
    // Create a session ID for web browser clients.
    if (!session.id) {
      session.id = uuid()
    }

    // Strip JWT-specific claims from the session before re-signing —
    // sign() sets expiresIn which conflicts with an existing exp property.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exp, iat, nbf, ...sessionPayload } = session as Session & {
      exp?: number
      iat?: number
      nbf?: number
    }
    const token = sign(sessionPayload)

    if (token) {
      res.setHeader('Authorization', `Bearer ${token}`)

      // Set as cookies for web browser clients.
      // In production the names are `__Host-`-prefixed (see getAuthCookieName),
      // which REQUIRES Secure + Path=/ + NO Domain — all satisfied below — and
      // makes the cookies unshadowable by a sibling subdomain.
      const secure = isProduction()
      const maxAge = 1000 * 60 * 60 * 24 * 7 // 7 days (match JWT expiry)
      res.cookie(getAuthCookieName('token'), token, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge,
        path: '/',
      })
      res.cookie(getAuthCookieName('sessionId'), session.id, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge,
        // Path=/ is required for the `__Host-` prefix to be accepted.
        path: '/',
      })

      return token
    }
  } catch (error) {
    logger.error(error)
  }

  return null
}

/**
 * Middleware that verifies the JWT token from the `Authorization` header and sets `res.locals.session`.
 * Falls back to cookie-based session for browser clients. Auto-refreshes tokens older than `JWT_REFRESH_TIME`.
 * @returns An Express-compatible middleware function.
 */
export const verifyMiddleware = (): MoleculeRequestHandler => async (req, res, next) => {
  try {
    // Get token from Authorization header, falling back to the `token`
    // cookie that `set()` writes alongside the header. The JSDoc above
    // promises this fallback for browser clients; without it the cookie
    // we hand out is decorative — every page-driven request after login
    // gets a 401, even though the cookie is sitting right there. We still
    // verify the signature via `jwtVerify` so a tampered cookie value is
    // never trusted (no decode-fallback bypass).
    const rawAuth = req.headers.authorization
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const cookies = (req as unknown as { cookies?: Record<string, unknown> }).cookies
    const cookieToken = readAuthCookie(cookies, 'token')
    const token =
      headerToken ?? (typeof cookieToken === 'string' && cookieToken ? cookieToken : null)

    if (!token) {
      return next()
    }

    // Try to verify the token.
    let session: Session | null = null

    try {
      session = jwtVerify(token) as Session
    } catch (_error) {
      // Token is invalid or expired — do NOT accept unverified tokens.
      // Previous code used decode() (no signature check) as a fallback,
      // which allowed expired/tampered tokens to be accepted if a cookie matched.
      // This was an authentication bypass. Require re-authentication instead.
    }

    if (session?.userId && session?.deviceId) {
      // Server-side session revocation. A logged-out / remotely-revoked /
      // password-reset device row is deleted; that MUST invalidate every copy
      // of the JWT, not just the browser that called logout. Without this a
      // valid signature alone keeps the session alive until natural expiry
      // (default 7 days), so logout is purely cosmetic. Check BEFORE exposing
      // the session so a revoked token never reaches a handler.
      if (!(await isDeviceActive(session.deviceId))) {
        return next()
      }

      res.locals.session = session

      // Auto-refresh the token if it's old enough.
      try {
        const decoded = decode(token) as { iat?: number } | null
        if (decoded?.iat) {
          const tokenAge = Date.now() - decoded.iat * 1000
          if (tokenAge > getJwtRefreshTime()) {
            // Update device last seen timestamp via bond.
            await get<{ updateLastSeen(deviceId: string): Promise<void> }>(
              'device',
            )?.updateLastSeen(session.deviceId)

            // Issue a fresh token.
            set(req, res, session)
          }
        }
      } catch (_error) {
        // Non-critical — token refresh is best-effort; continue with existing session.
      }
    }
  } catch (error) {
    logger.error('authorization.verify error:', error)
  }

  return next()
}
