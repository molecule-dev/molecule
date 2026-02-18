/**
 * Type definitions for the JWT core interface.
 *
 * @module
 */

/**
 * Supported JWT signing algorithms.
 */
export type JwtAlgorithm =
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'PS256'
  | 'PS384'
  | 'PS512'

/**
 * Options for signing a JWT.
 */
export interface JwtSignOptions {
  algorithm?: JwtAlgorithm
  expiresIn?: number | string
  notBefore?: number | string
  audience?: string | string[]
  issuer?: string
  subject?: string
  jwtid?: string
  keyid?: string
  header?: Record<string, unknown>
}

/**
 * Options for verifying a JWT.
 */
export interface JwtVerifyOptions {
  algorithms?: JwtAlgorithm[]
  audience?: string | string[]
  issuer?: string | string[]
  subject?: string
  clockTolerance?: number
  maxAge?: string | number
  complete?: boolean
  ignoreExpiration?: boolean
  ignoreNotBefore?: boolean
}

/**
 * Options for decoding a JWT (without verification).
 */
export interface JwtDecodeOptions {
  complete?: boolean
  json?: boolean
}

/**
 * Decoded JWT payload.
 */
export interface JwtPayload {
  [key: string]: unknown
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
}

/**
 * Recursive JSON value type representing any valid JSON primitive, array, or object.
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

/**
 * A plain JSON object whose values are `JSONValue`s. Used as the payload
 * type for JWT signing operations.
 */
export type JSONObject = { [key: string]: JSONValue }

/**
 * JWT provider interface that all JWT bond packages must implement.
 *
 * Provides `sign`, `verify`, and `decode` operations. Key management
 * and algorithm configuration are handled by the core package.
 */
export interface JwtProvider {
  sign(payload: JSONObject, options?: JwtSignOptions, privateKey?: string | Buffer): string

  verify(
    token: string,
    options?: JwtVerifyOptions,
    publicKey?: string | Buffer,
  ): string | JwtPayload

  decode(token: string, options?: JwtDecodeOptions): string | JwtPayload | null
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /** JWT-related environment variables. */
    export interface ProcessEnv {
      JWT_PRIVATE_KEY?: string
      JWT_PUBLIC_KEY?: string
      JWT_ALGORITHM?: string
      JWT_EXPIRES_TIME?: string
      JWT_REFRESH_TIME?: string
    }
  }
}
