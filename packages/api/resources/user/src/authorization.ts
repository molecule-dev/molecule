/**
 * JWT session authorization for user resources.
 *
 * Provides middleware to verify, set, and refresh JWT tokens.
 *
 * @module
 */

// Side-effect import: registers this resource's secret definitions so the
// runtime registry is populated even when authorization.js is imported directly
// (not through the package barrel).
import './secrets.js'
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
 * Whether this API serves an app embedded in a CROSS-SITE iframe — i.e. the
 * molecule.dev live preview, where the app renders at `127.0.0.1:<port>` inside
 * the `localhost:3000` (prod: `*.preview.molecule.dev` inside `molecule.dev`)
 * IDE. The platform sets `MOL_CROSS_SITE_COOKIES=1` in the sandbox container's
 * env for exactly this case; a normally-deployed or locally-run app (which is a
 * TOP-LEVEL document) never sets it.
 *
 * This is deliberately NOT derived from `NODE_ENV`: the molecule.dev IDE itself
 * and a developer running their generated app locally are BOTH non-production
 * AND top-level, so keying cross-site cookies off `NODE_ENV` wrongly forced
 * `SameSite=None; Partitioned` onto those top-level sessions — which then
 * coexisted with the browser's pre-existing `Lax` cookie of the same name in a
 * SEPARATE jar, sending a duplicate `token` header and breaking auth.
 *
 * @returns `true` only when the app is served cross-site in the preview iframe.
 */
const isCrossSitePreview = (): boolean => {
  try {
    return getConfig('MOL_CROSS_SITE_COOKIES') === '1'
  } catch (_error) {
    // Config read is optional — absence means "not the preview" (top-level).
    return false
  }
}

/**
 * Base cookie attributes shared by EVERY auth cookie this resource sets and
 * clears — the single source of truth so a SET and its matching CLEAR always
 * agree (a mismatched attribute leaves an undeletable cookie) and every auth
 * cookie gets identical behaviour.
 *
 * - **Cross-site preview** (see {@link isCrossSitePreview}) → `{ secure: true,
 *   sameSite: 'none', partitioned: true, path: '/' }`. The molecule.dev live
 *   preview renders the app in a CROSS-SITE iframe; browsers evaluate SameSite
 *   against the TOP-LEVEL site, so a `Lax`/`Strict` cookie is neither stored nor
 *   sent on ANY preview request — the httpOnly session cookie vanishes on every
 *   iframe reload and the user is logged out of their own app. `SameSite=None`
 *   makes it cross-site-sendable (which REQUIRES `Secure` — permitted over http
 *   on the potentially-trustworthy `localhost` / `127.0.0.1` origins), and
 *   `Partitioned` (CHIPS) keeps it working when third-party cookies are blocked
 *   (Brave/Chrome), which `None` alone does not. Applies whether the platform is
 *   dev or prod, because the preview app is cross-site either way.
 * - **Production, top-level** → `{ secure: true, sameSite: 'lax', path: '/' }`.
 *   The correct, CSRF-hardened default; pairs with the `__Host-` prefix (see
 *   {@link getAuthCookieName}). NEVER weaken it.
 * - **Development, top-level** → `{ secure: false, sameSite: 'lax', path: '/' }`.
 *   The original dev posture (plain http, not `Secure`) — used by the molecule.dev
 *   IDE and by a developer running their generated app locally. Both are top-level
 *   documents, so `Lax` is correct and `Secure`/`None`/`Partitioned` would be both
 *   unnecessary and (as above) actively harmful.
 *
 * `httpOnly` and `maxAge` are intentionally omitted: the SET call adds those per
 * cookie, and the CLEAR call spreads these attributes verbatim so the deletion
 * targets the exact same (possibly Partitioned) cookie jar.
 *
 * @returns The environment-appropriate base cookie options.
 */
export const getAuthCookieOptions = (): {
  secure: boolean
  sameSite: 'lax' | 'none'
  partitioned?: boolean
  path: string
} => {
  if (isCrossSitePreview()) {
    return { secure: true, sameSite: 'none', partitioned: true, path: '/' }
  }
  return isProduction()
    ? { secure: true, sameSite: 'lax', path: '/' }
    : { secure: false, sameSite: 'lax', path: '/' }
}

/**
 * Read an auth cookie by its base name. In production the cookie is `__Host-`-
 * prefixed (untossable: browsers reject `__Host-` cookies carrying a Domain), so
 * we read ONLY that name and do NOT fall back to the plain name. [C4-1] Accepting
 * the plain name in production re-opens cookie-tossing session fixation: a tenant
 * on a sibling `*.molecule.dev` preview can write a `.molecule.dev`-scoped plain
 * cookie that a plain-name fallback would honor. The `__Host-`-prefixed name is the
 * only legitimate production cookie; sessions still carrying a plain cookie simply
 * re-authenticate on the deploy that flips the prefix on. In dev there is no prefix,
 * so the (plain) name returned by getAuthCookieName is the real cookie.
 *
 * @param cookies - The request cookies map.
 * @param base - The base cookie name.
 * @returns The cookie value, or `undefined` if absent.
 */
const readAuthCookie = (cookies: Record<string, unknown> | undefined, base: string): unknown => {
  const primary = cookies?.[getAuthCookieName(base)]
  if (isProduction()) return primary
  return primary ?? cookies?.[base]
}

/**
 * Short-TTL positive cache for "device still exists" lookups, to bound the
 * per-request DB cost of server-side session-revocation enforcement.
 *
 * Caching model and its honest revocation guarantee:
 * - Only POSITIVE results (device exists) are cached; a definitive "device not
 *   found" result is NEVER cached, and a found row drops any stale entry. So a
 *   revoked device is rejected as soon as the cache misses or expires.
 * - Revocations performed IN THIS PROCESS (logout, remote device removal,
 *   password change/reset, account deletion — the user-resource handlers that
 *   wipe device rows) are made effective IMMEDIATELY by actively evicting the
 *   cache via {@link invalidateDeviceExistsCache} / {@link invalidateAllDeviceExistsCache}
 *   at the revocation call site. The very next request re-checks the DB and is
 *   rejected — there is no residual window for in-process revocation.
 * - Revocations performed by ANOTHER process (a different API instance in a
 *   multi-instance deployment, or a direct DB delete) cannot evict THIS
 *   process's in-memory cache, so a token whose positive entry was warmed here
 *   within the last `deviceExistsCacheTtlMs` may keep authenticating on THIS
 *   instance for up to that window (≤10s) before the entry expires and the DB
 *   is consulted again. This is the deliberate eventual-consistency tradeoff of
 *   a per-process cache; lower the TTL or back the cache with a shared
 *   pub/sub store to shrink it further.
 */
const deviceExistsCacheTtlMs = 10_000
const deviceExistsCache = new Map<string, number>()

/**
 * Evict a single device's positive entry from the device-exists cache so the
 * next authorization check for that device re-consults the database.
 *
 * Call this from any in-process revocation path that deletes a specific device
 * row (e.g. a logout handler that knows the `deviceId`) so the revocation is
 * effective immediately on this instance rather than after the cache TTL.
 *
 * @param deviceId - The device id whose cached "exists" result should be dropped.
 */
export const invalidateDeviceExistsCache = (deviceId: string): void => {
  deviceExistsCache.delete(deviceId)
}

/**
 * Evict ALL positive entries from the device-exists cache.
 *
 * Call this from in-process bulk revocation paths that delete every device for
 * a user (password change/reset, account deletion, OAuth account-claim) where
 * the affected device ids are not enumerated — the cache is keyed by deviceId,
 * not userId, so a full clear is the correct way to guarantee none of the
 * just-deleted devices keep authenticating on this instance. The normal-path
 * per-request DB-cost reduction is preserved: the cache simply repopulates on
 * subsequent requests; only these rare revocation events pay a brief re-check.
 */
export const invalidateAllDeviceExistsCache = (): void => {
  deviceExistsCache.clear()
}

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
      // which REQUIRES Secure + Path=/ + NO Domain — all satisfied by
      // getAuthCookieOptions() — and makes the cookies unshadowable by a sibling
      // subdomain. In the sandbox live-preview iframe those same options switch to
      // SameSite=None + Secure + Partitioned so the cross-site iframe actually
      // keeps them (otherwise the session vanishes on every reload).
      const cookieOptions = getAuthCookieOptions()
      const maxAge = 1000 * 60 * 60 * 24 * 7 // 7 days (match JWT expiry)
      res.cookie(getAuthCookieName('token'), token, {
        ...cookieOptions,
        httpOnly: true,
        maxAge,
      })
      res.cookie(getAuthCookieName('sessionId'), session.id, {
        ...cookieOptions,
        httpOnly: true,
        maxAge,
      })
      // [M1-1] Non-httpOnly session-PRESENCE hint (carries no token — just "1").
      // The bearer token is in-memory + the httpOnly `token` cookie (both
      // JS-unreadable), so on a fresh load the app can't tell "logged in" from
      // "anonymous" without probing the server. This readable hint lets the auth
      // client's initialize() probe the cookie-restore endpoint ONLY when a
      // session plausibly exists — so anonymous/public page loads make ZERO API
      // calls (no /users/me, no 401). A tossed/forged hint only costs one
      // harmless 401 probe; it grants nothing (the real credential stays
      // httpOnly). Cleared by logout alongside the credential cookies.
      res.cookie('mol_auth', '1', {
        ...cookieOptions,
        httpOnly: false,
        maxAge,
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
