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
    return jsonwebtoken.sign(payload, privateKey ?? '', options as jsonwebtoken.SignOptions)
  },

  verify(
    token: string,
    options?: JwtVerifyOptions,
    publicKey?: string | Buffer,
  ): string | JwtPayload {
    return jsonwebtoken.verify(token, publicKey ?? '', options as jsonwebtoken.VerifyOptions) as
      | string
      | JwtPayload
  },

  decode(token: string, options?: JwtDecodeOptions): string | JwtPayload | null {
    return jsonwebtoken.decode(token, options as jsonwebtoken.DecodeOptions)
  },
}
