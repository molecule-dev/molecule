/**
 * JWT provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-jwt-jsonwebtoken`) call `setProvider()`
 * during setup. Application code uses `sign()`, `verify()`, and `decode()` directly.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import { JWT_PRIVATE_KEY, JWT_PUBLIC_KEY } from './keys.js'
import type {
  JSONObject,
  JwtAlgorithm,
  JwtDecodeOptions,
  JwtPayload,
  JwtProvider,
  JwtSignOptions,
  JwtVerifyOptions,
} from './types.js'

const BOND_TYPE = 'jwt'

/**
 * The signing algorithm used for JWT operations. Read from the `JWT_ALGORITHM`
 * environment variable, defaulting to `RS256`.
 */
export const JWT_ALGORITHM = (process.env.JWT_ALGORITHM || `RS256`) as JwtAlgorithm

/**
 * Token lifetime in seconds. Read from the `JWT_EXPIRES_TIME` environment
 * variable, defaulting to 604800 (1 week).
 */
export const JWT_EXPIRES_TIME = Number(process.env.JWT_EXPIRES_TIME) || 60 * 60 * 24 * 7 // 1 week

/**
 * Refresh window in seconds — tokens are refreshed if they will expire within
 * this period. Read from the `JWT_REFRESH_TIME` environment variable,
 * defaulting to 3600 (1 hour).
 */
export const JWT_REFRESH_TIME = Number(process.env.JWT_REFRESH_TIME) || 60 * 60 // 1 hour

/**
 * Registers a JWT provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The JWT provider implementation to bond.
 */
export const setProvider = (provider: JwtProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded JWT provider, throwing if none is configured.
 *
 * @returns The bonded JWT provider.
 * @throws {Error} If no JWT provider has been bonded.
 */
export const getProvider = (): JwtProvider => {
  return bondRequire<JwtProvider>(BOND_TYPE)
}

/**
 * Checks whether a JWT provider is currently bonded.
 *
 * @returns `true` if a JWT provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Signs a payload into a JWT string using the bonded provider. Uses the
 * configured algorithm, expiry, and private key as defaults.
 *
 * @param object - The JSON payload to sign.
 * @param options - Signing options; `algorithm` defaults to `JWT_ALGORITHM`, `expiresIn` defaults to `JWT_EXPIRES_TIME`.
 * @param options.algorithm - The signing algorithm (e.g. `RS256`, `HS256`).
 * @param options.expiresIn - Token lifetime in seconds.
 * @param privateKey - The private key for signing; defaults to `JWT_PRIVATE_KEY`.
 * @returns The signed JWT string.
 */
export const sign = (
  object: JSONObject,
  { algorithm = JWT_ALGORITHM, expiresIn = JWT_EXPIRES_TIME, ...rest }: JwtSignOptions = {},
  privateKey: string | Buffer = JWT_PRIVATE_KEY,
): string => getProvider().sign(object, { algorithm, expiresIn, ...rest }, privateKey)

/**
 * Verifies a JWT string and returns the decoded payload. Uses the configured
 * algorithm and public key as defaults.
 *
 * @param token - The JWT string to verify.
 * @param options - Verification options; `algorithms` defaults to `[JWT_ALGORITHM]`.
 * @param options.algorithms - The allowed signing algorithms for verification.
 * @param publicKey - The public key for verification; defaults to `JWT_PUBLIC_KEY`.
 * @returns The decoded payload string or object.
 * @throws {Error} If the token is invalid, expired, or verification fails.
 */
export const verify = (
  token: string,
  { algorithms = [JWT_ALGORITHM], ...rest }: JwtVerifyOptions = {},
  publicKey: string | Buffer = JWT_PUBLIC_KEY,
): string | JwtPayload => getProvider().verify(token, { algorithms, ...rest }, publicKey)

/**
 * Decodes a JWT string without verifying its signature. Useful for inspecting
 * token contents when verification is handled elsewhere.
 *
 * @param token - The JWT string to decode.
 * @param options - Decode options such as `complete` for full header+payload output.
 * @returns The decoded payload, or `null` if the token cannot be decoded.
 */
export const decode = (token: string, options?: JwtDecodeOptions): string | JwtPayload | null =>
  getProvider().decode(token, options)
