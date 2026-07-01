import { get, getLogger } from '@molecule/api-bond'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getAuthCookieName, getAuthCookieOptions } from '../authorization.js'

const logger = getLogger()

/**
 * Logs the current user out. Revokes the session device server-side (so the JWT
 * is rejected on its next use — covering EVERY copy of the token, not just this
 * browser) and clears the credential cookies.
 *
 * [M1-1] Under the in-memory-token model the httpOnly `token` cookie is the
 * persistent credential, so logout MUST clear it (and the `mol_auth` presence
 * hint) — otherwise the app's cookie-based session restore (`GET /users/me` on
 * init) would silently log the user back in on the next page load, and a
 * client-side-only logout would be cosmetic (the cookie would still authenticate
 * direct API calls). Cookie-authed via `auth` (no `:id`; the session identifies
 * the user).
 * @returns A request handler responding `{ statusCode: 200, body: { success: true } }`.
 */
export const logout = () => {
  return async (_req: MoleculeRequest, res: MoleculeResponse) => {
    try {
      const session = res.locals.session as { deviceId?: string } | undefined
      if (session?.deviceId) {
        // Delete the device so verifyMiddleware rejects this JWT server-side.
        await get<{ delete(deviceId: string): Promise<void> }>('device')?.delete(session.deviceId)
      }
    } catch (error) {
      // Best-effort — the device row may already be gone; clear cookies regardless.
      logger.debug('Device delete on logout failed (non-fatal)', { error })
    }

    const expressRes = res as unknown as {
      clearCookie?(name: string, options?: Record<string, unknown>): void
      removeHeader?(name: string): void
    }
    if (typeof expressRes.clearCookie === 'function') {
      // The CLEAR must carry the SAME attributes the cookie was SET with
      // (getAuthCookieOptions: Secure + Path=/ in prod; + SameSite=None +
      // Partitioned in the sandbox live-preview) or the browser won't match &
      // delete it — a mismatched clear leaves a stale (partitioned) credential
      // cookie alive, so logout would be cosmetic. Single source of truth.
      const cookieOptions = getAuthCookieOptions()
      // Clear by BOTH the current name (prod `__Host-`) and the legacy plain name
      // so a pre-rollout copy can't linger.
      const clear = (base: string): void => {
        expressRes.clearCookie!(getAuthCookieName(base), { ...cookieOptions })
        expressRes.clearCookie!(base, { path: '/' })
      }
      clear('token')
      clear('sessionId')
      // The session-presence hint is a plain (non-`__Host-`) cookie set with the
      // same per-environment attributes, so clear it with them too.
      expressRes.clearCookie!('mol_auth', { ...cookieOptions })
    }
    // Drop any Authorization header so a same-response refresh can't hand a
    // fresh credential back to a client that just logged out.
    expressRes.removeHeader?.('Authorization')

    return { statusCode: 200, body: { success: true } }
  }
}
