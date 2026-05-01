/**
 * Verifies an Apple-issued ID token's RS256 signature, issuer, audience,
 * and expiration. Surfaces the decoded payload as {@link AppleIdTokenClaims}.
 *
 * @module
 */

import jwt, { type JwtHeader } from 'jsonwebtoken'

import { getAppleJwks, jwkToPem } from './jwks.js'
import type { AppleIdTokenClaims } from './types.js'

/** The expected `iss` claim for Apple-issued ID tokens. */
export const APPLE_ID_TOKEN_ISSUER = `https://appleid.apple.com` as const

const decodeHeader = (idToken: string): JwtHeader => {
  const decoded = jwt.decode(idToken, { complete: true })

  if (!decoded || typeof decoded === `string` || !decoded.header) {
    throw new Error(`Invalid Apple ID token: unable to decode header.`)
  }

  return decoded.header
}

/**
 * Verifies an Apple ID token. Fetches Apple's JWKS, locates the key
 * matching the token's `kid`, verifies the RS256 signature, then asserts
 * `iss === 'https://appleid.apple.com'`, `aud === OAUTH_APPLE_CLIENT_ID`,
 * and that the token has not expired.
 *
 * @param idToken - The compact-serialized JWT to verify.
 * @returns The decoded and validated {@link AppleIdTokenClaims}.
 */
export const verifyIdToken = async (idToken: string): Promise<AppleIdTokenClaims> => {
  if (!idToken) {
    throw new Error(`verifyIdToken requires a non-empty idToken.`)
  }

  const audience = process.env.OAUTH_APPLE_CLIENT_ID

  if (!audience) {
    throw new Error(`OAUTH_APPLE_CLIENT_ID is not configured.`)
  }

  const header = decodeHeader(idToken)

  if (!header.kid) {
    throw new Error(`Invalid Apple ID token: missing 'kid' header.`)
  }

  if (header.alg && header.alg !== `RS256`) {
    throw new Error(`Invalid Apple ID token: unexpected alg '${header.alg}'.`)
  }

  const keys = await getAppleJwks()
  const jwk = keys.get(header.kid)

  if (!jwk) {
    throw new Error(`Apple JWKS does not contain a key for kid '${header.kid}'.`)
  }

  const pem = jwkToPem(jwk)

  const payload = jwt.verify(idToken, pem, {
    algorithms: [`RS256`],
    audience,
    issuer: APPLE_ID_TOKEN_ISSUER,
  })

  if (typeof payload === `string` || !payload || !payload.sub) {
    throw new Error(`Invalid Apple ID token: payload missing 'sub'.`)
  }

  return payload as AppleIdTokenClaims
}
