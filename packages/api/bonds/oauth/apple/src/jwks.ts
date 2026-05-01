/**
 * JWKS fetcher and cache for Apple's public verification keys.
 *
 * Apple publishes its ID-token signing keys at
 * `https://appleid.apple.com/auth/keys`. We fetch them lazily, cache the
 * result for one hour, and convert each JWK to a PEM-encoded SPKI public
 * key for use with `jsonwebtoken.verify`.
 *
 * @module
 */

import { createPublicKey, type JsonWebKeyInput } from 'node:crypto'

import { get } from '@molecule/api-http'

/** A single public-key entry as returned by Apple's JWKS endpoint. */
export interface AppleJwk {
  kty: string
  kid: string
  use?: string
  alg?: string
  n: string
  e: string
}

/** Apple JWKS endpoint URL. */
export const APPLE_JWKS_URL = `https://appleid.apple.com/auth/keys` as const

/** TTL for the cached JWKS, in milliseconds (1 hour). */
export const JWKS_CACHE_TTL_MS = 60 * 60 * 1000

interface CachedJwks {
  expiresAt: number
  keysByKid: Map<string, AppleJwk>
}

let cache: CachedJwks | null = null

/**
 * Reset the JWKS cache. Exposed for tests; production code should not call this.
 */
export const resetJwksCache = (): void => {
  cache = null
}

/**
 * Fetch Apple's JWKS, returning a `kid` → JWK map. Cached for {@link JWKS_CACHE_TTL_MS}.
 *
 * @returns A map of `kid` to JWK suitable for verifying Apple ID tokens.
 */
export const getAppleJwks = async (): Promise<Map<string, AppleJwk>> => {
  const now = Date.now()

  if (cache && cache.expiresAt > now) {
    return cache.keysByKid
  }

  const { data } = await get<{ keys: AppleJwk[] }>(APPLE_JWKS_URL, {
    headers: { accept: `application/json` },
    timeout: 15_000,
  })

  const keysByKid = new Map<string, AppleJwk>()

  for (const key of data?.keys ?? []) {
    if (key.kid) {
      keysByKid.set(key.kid, key)
    }
  }

  cache = {
    expiresAt: now + JWKS_CACHE_TTL_MS,
    keysByKid,
  }

  return keysByKid
}

/**
 * Convert a JWK to a PEM-encoded SPKI public key string suitable for
 * passing to `jsonwebtoken.verify` with algorithm `RS256`.
 *
 * @param jwk - The JWK to convert.
 * @returns A PEM-encoded SPKI public key.
 */
export const jwkToPem = (jwk: AppleJwk): string => {
  const keyObject = createPublicKey({
    key: jwk as unknown as JsonWebKeyInput[`key`],
    format: `jwk`,
  })

  return keyObject.export({ format: `pem`, type: `spki` }) as string
}
