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
  } catch {
    return 1000 * 60 * 30 // 30 minutes default
  }
}

/**
 * Set authorization headers and cookie for a session.
 * @param req - The request object.
 * @param _req
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
      const secure = getConfig('NODE_ENV') === 'production'
      const maxAge = 1000 * 60 * 60 * 24 * 7 // 7 days (match JWT expiry)
      res.cookie('token', token, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge,
        path: '/',
      })
      res.cookie('sessionId', session.id, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
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
    // Get token from Authorization header.
    const rawAuth = req.headers.authorization
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return next()
    }

    // Try to verify the token.
    let session: Session | null = null

    try {
      session = jwtVerify(token) as Session
    } catch {
      // Token is invalid or expired — do NOT accept unverified tokens.
      // Previous code used decode() (no signature check) as a fallback,
      // which allowed expired/tampered tokens to be accepted if a cookie matched.
      // This was an authentication bypass. Require re-authentication instead.
    }

    if (session?.userId && session?.deviceId) {
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
      } catch {
        // Non-critical - continue with existing session.
      }
    }
  } catch (error) {
    logger.error('authorization.verify error:', error)
  }

  return next()
}
