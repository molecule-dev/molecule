/**
 * JWKS fetching, caching, and RS256 ID-token verification for the
 * Microsoft OAuth provider.
 *
 * Uses Node's built-in `crypto` module — no third-party JOSE library.
 * Validates signature, issuer, audience, and expiry as required by
 * OpenID Connect.
 *
 * @module
 */

import { createPublicKey, createVerify } from 'node:crypto'

import { get } from '@molecule/api-http'

import type { MicrosoftIdTokenClaims } from './types.js'

/**
 * RFC 7517 JSON Web Key (RS256 subset).
 */
export interface JsonWebKey {
  kty: string
  use?: string
  kid: string
  n: string
  e: string
  alg?: string
  x5c?: string[]
}

/**
 * Discovery response shape for the `/discovery/v2.0/keys` endpoint.
 */
export interface JwksResponse {
  keys: JsonWebKey[]
}

interface CacheEntry {
  fetchedAt: number
  keys: JsonWebKey[]
}

const ONE_HOUR_MS = 60 * 60 * 1000

const cache = new Map<string, CacheEntry>()

/**
 * Build the JWKS discovery URL for a given Microsoft tenant.
 * @param tenantId - Microsoft tenant identifier (e.g., `"common"`).
 * @returns The fully-qualified JWKS endpoint URL.
 */
export const jwksUrlFor = (tenantId: string): string =>
  `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`

/**
 * Fetch (and cache) the JWKS document for a Microsoft tenant.
 *
 * Cache TTL is one hour. Pass `force: true` (e.g., on a key-id miss)
 * to bypass the cache and refresh.
 *
 * @param tenantId - Microsoft tenant identifier.
 * @param options - Optional overrides.
 * @returns The list of JWKs from the tenant.
 */
export const getJwks = async (
  tenantId: string,
  options: { force?: boolean; now?: () => number } = {},
): Promise<JsonWebKey[]> => {
  const now = options.now ? options.now() : Date.now()
  const url = jwksUrlFor(tenantId)
  const cached = cache.get(url)

  if (!options.force && cached && now - cached.fetchedAt < ONE_HOUR_MS) {
    return cached.keys
  }

  const { data } = await get<JwksResponse>(url, {
    headers: { accept: `application/json` },
    timeout: 15_000,
  })

  const keys = Array.isArray(data?.keys) ? data.keys : []
  cache.set(url, { fetchedAt: now, keys })
  return keys
}

/**
 * Clear the in-memory JWKS cache (test-only / forced refresh).
 */
export const clearJwksCache = (): void => {
  cache.clear()
}

const base64UrlToBuffer = (input: string): Buffer => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLen), 'base64')
}

const decodeJoseSegment = (segment: string): Record<string, unknown> => {
  const json = base64UrlToBuffer(segment).toString('utf8')
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JWT segment')
  }
  return parsed as Record<string, unknown>
}

/**
 * Verify an RS256 signature against the supplied JWK.
 * @param jwk - JSON Web Key with `kty: "RSA"` and `alg: "RS256"`.
 * @param signingInput - Concatenated `${header}.${payload}` string.
 * @param signature - Base64url-encoded signature segment.
 * @returns `true` if the signature verifies.
 */
export const verifyRs256Signature = (
  jwk: JsonWebKey,
  signingInput: string,
  signature: string,
): boolean => {
  if (jwk.kty !== 'RSA') {
    return false
  }
  const publicKey = createPublicKey({
    key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
    format: 'jwk',
  })
  const verifier = createVerify('RSA-SHA256')
  verifier.update(signingInput)
  verifier.end()
  return verifier.verify(publicKey, base64UrlToBuffer(signature))
}

/**
 * Microsoft's reserved *multi-tenant* / consumer authority segments. These
 * are the only configured `tenantId` values for which a token may legitimately
 * carry its own concrete tenant `tid` in the issuer (the multi-tenant contract
 * — any directory's users may sign in). A configured concrete tenant GUID is
 * the opposite: a single-tenant pin that must NOT be widened.
 */
const MULTI_TENANT_AUTHORITIES = new Set(['common', 'organizations', 'consumers'])

/**
 * Acceptable issuer URLs for a given Microsoft tenant.
 *
 * The configured `tenantId` decides whether the token's own `tid` may
 * resolve the accepted issuer:
 *
 * - **Single-tenant pin** (a concrete tenant GUID): the issuer is fixed to
 *   that exact tenant. The token's `tid` is NEVER used to widen the accepted
 *   issuer set — Microsoft's public-cloud signing keys are shared across all
 *   tenants, so a validly-signed token from a *different* tenant would
 *   otherwise pass a single-tenant pin (a cross-tenant authentication
 *   bypass). The caller's separate `tid`-vs-config check (see
 *   `verifyMicrosoftIdToken`) is what enforces the tenant; this function does
 *   not silently trust an attacker-supplied `tid`.
 * - **Multi-tenant authority** (`common` / `organizations` / `consumers`):
 *   Microsoft's v2.0 issuer is the templated form
 *   `https://login.microsoftonline.com/{tid}/v2.0`, where `{tid}` is the
 *   signing tenant. Here accepting the token's `tid`-derived issuer IS the
 *   documented contract (the app intentionally allows any directory), so it
 *   is permitted.
 *
 * @param tenantId - The configured tenant id (`"common"` by default).
 * @param tokenTid - The `tid` claim from the token, when present.
 * @returns A list of acceptable `iss` values.
 */
export const allowedIssuers = (tenantId: string, tokenTid?: string): string[] => {
  const issuers = new Set<string>()
  issuers.add(`https://login.microsoftonline.com/${tenantId}/v2.0`)
  issuers.add(`https://sts.windows.net/${tenantId}/`)
  // Only a multi-tenant authority may resolve its issuer from the token's
  // own `tid`. A concrete configured tenant is a single-tenant pin and must
  // never be widened to "whatever tid the token claims".
  if (tokenTid && MULTI_TENANT_AUTHORITIES.has(tenantId.toLowerCase())) {
    issuers.add(`https://login.microsoftonline.com/${tokenTid}/v2.0`)
    issuers.add(`https://sts.windows.net/${tokenTid}/`)
  }
  return [...issuers]
}

/**
 * Verify a Microsoft-issued ID token end-to-end (signature, issuer,
 * audience, expiry).
 *
 * @param idToken - Compact JWS.
 * @param config - Tenant + audience config.
 * @param options - Optional clock + JWKS refresh hooks (test seams).
 * @returns Validated claims.
 */
export const verifyMicrosoftIdToken = async (
  idToken: string,
  config: { tenantId: string; audience: string },
  options: { now?: () => number; refreshOnMiss?: boolean } = {},
): Promise<MicrosoftIdTokenClaims> => {
  const now = options.now ? options.now() : Math.floor(Date.now() / 1000)
  const segments = idToken.split('.')
  if (segments.length !== 3) {
    throw new Error('Invalid ID token: expected three segments')
  }
  const [headerSeg, payloadSeg, signatureSeg] = segments
  if (!headerSeg || !payloadSeg) {
    throw new Error('Invalid ID token: empty segment')
  }

  const header = decodeJoseSegment(headerSeg)
  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported alg: ${String(header.alg)}`)
  }
  if (!signatureSeg) {
    throw new Error('Invalid ID token: empty signature')
  }
  const kid = typeof header.kid === 'string' ? header.kid : undefined
  if (!kid) {
    throw new Error('Invalid ID token: missing kid')
  }

  const findKey = (keys: JsonWebKey[]): JsonWebKey | undefined => keys.find((k) => k.kid === kid)

  let keys = await getJwks(config.tenantId)
  let key = findKey(keys)
  if (!key && options.refreshOnMiss !== false) {
    keys = await getJwks(config.tenantId, { force: true })
    key = findKey(keys)
  }
  if (!key) {
    throw new Error(`Unknown signing key: ${kid}`)
  }

  const signingInput = `${headerSeg}.${payloadSeg}`
  if (!verifyRs256Signature(key, signingInput, signatureSeg)) {
    throw new Error('ID token signature verification failed')
  }

  const payload = decodeJoseSegment(payloadSeg)
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined
  const iat = typeof payload.iat === 'number' ? payload.iat : undefined
  const sub = typeof payload.sub === 'string' ? payload.sub : undefined
  const iss = typeof payload.iss === 'string' ? payload.iss : undefined
  const aud = typeof payload.aud === 'string' ? payload.aud : undefined
  const tid = typeof payload.tid === 'string' ? payload.tid : undefined

  if (!sub || !iss || !aud || exp === undefined || iat === undefined) {
    throw new Error('ID token missing required claims')
  }
  if (exp <= now) {
    throw new Error('ID token expired')
  }
  if (aud !== config.audience) {
    throw new Error('ID token audience mismatch')
  }
  if (!allowedIssuers(config.tenantId, tid).includes(iss)) {
    throw new Error('ID token issuer mismatch')
  }
  // Single-tenant pin: when a concrete tenant GUID is configured, the
  // token's own `tid` MUST equal it. Microsoft's public-cloud signing keys
  // are shared across every tenant, so a validly-signed token from another
  // directory must not satisfy a single-tenant configuration. Multi-tenant
  // authorities (`common` / `organizations` / `consumers`) intentionally
  // accept any directory's `tid` and are exempt from this gate.
  if (!MULTI_TENANT_AUTHORITIES.has(config.tenantId.toLowerCase()) && tid !== config.tenantId) {
    throw new Error('ID token tenant mismatch')
  }

  return {
    sub,
    iss,
    aud,
    exp,
    iat,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    preferred_username:
      typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    tid,
    oid: typeof payload.oid === 'string' ? payload.oid : undefined,
    claims: payload,
  }
}
