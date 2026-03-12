/**
 * JWT provider implementation using jsonwebtoken.
 *
 * @see https://www.npmjs.com/package/jsonwebtoken
 *
 * @module
 */

import jsonwebtoken from 'jsonwebtoken'

import type {
  JSONObject,
  JwtDecodeOptions,
  JwtPayload,
  JwtProvider,
  JwtSignOptions,
  JwtVerifyOptions,
} from '@molecule/api-jwt'

/**
 * JWT provider backed by the jsonwebtoken library.
 */
export const provider: JwtProvider = {
  sign(payload: JSONObject, options?: JwtSignOptions, privateKey?: string | Buffer): string {
    if (!privateKey) throw new Error('JWT private key is required for signing')
    return jsonwebtoken.sign(payload, privateKey, options as jsonwebtoken.SignOptions)
  },

  verify(
    token: string,
    options?: JwtVerifyOptions,
    publicKey?: string | Buffer,
  ): string | JwtPayload {
    if (!publicKey) throw new Error('JWT public key is required for verification')
    // Force expiration/notBefore checks — never allow callers to bypass token expiry
    const safeOptions = { ...options, ignoreExpiration: false, ignoreNotBefore: false }
    return jsonwebtoken.verify(token, publicKey, safeOptions as jsonwebtoken.VerifyOptions) as
      | string
      | JwtPayload
  },

  decode(token: string, options?: JwtDecodeOptions): string | JwtPayload | null {
    return jsonwebtoken.decode(token, options as jsonwebtoken.DecodeOptions)
  },
}
