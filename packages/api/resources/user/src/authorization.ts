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
 * @param res - The response object.
 * @param session - The session.
 */
export const set = (req: MoleculeRequest, res: MoleculeResponse, session: Session): void => {
  try {
    // Create a session ID for web browser clients.
    if (!session.id) {
      session.id = uuid()
    }

    const token = sign(session)

    if (token) {
      res.setHeader('Authorization', `Bearer ${token}`)

      // Set as a cookie as well for web browser clients.
      const secure = getConfig('NODE_ENV') === 'production'
      res.cookie('sessionId', session.id, {
        httpOnly: true,
        secure,
        sameSite: secure ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
      })
    }
  } catch (error) {
    logger.error(error)
  }
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
      // Token might be expired - try to decode it anyway for refresh.
      const decoded = decode(token) as Session | null

      if (decoded?.id) {
        // Check if this session ID matches a cookie (web browser refresh).
        const cookieSessionId = req.cookies?.sessionId
        if (cookieSessionId && cookieSessionId === decoded.id) {
          session = decoded
        }
      }
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
