/**
 * Tests for the Apple OAuth (Sign in with Apple) provider.
 *
 * Uses real keypairs generated at test time:
 * - ES256 (P-256) for the client-secret JWT signed by the bond.
 * - RS256 for the simulated Apple-issued ID token; the public key is
 *   exported as a JWK and served via the mocked JWKS endpoint.
 *
 * @module
 */

import { generateKeyPairSync } from 'node:crypto'

import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerWarn = vi.fn()

vi.mock('@molecule/api-http', () => ({
  get: mockGet,
  post: mockPost,
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: mockLoggerWarn,
    error: mockLoggerError,
  }),
}))

vi.mock('@molecule/api-oauth', () => ({}))

const TEAM_ID = 'TEAM123456'
const CLIENT_ID = 'com.example.app'
const KEY_ID = 'KEY1234567'
const APPLE_KID = 'AIDOPK1'

const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const ES256_PRIVATE_PEM = ec.privateKey.export({ format: 'pem', type: 'pkcs8' }) as string

const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 })
const RSA_PRIVATE_PEM = rsa.privateKey.export({ format: 'pem', type: 'pkcs8' }) as string
const RSA_PUBLIC_JWK = rsa.publicKey.export({ format: 'jwk' }) as Record<string, string>

const setEnv = () => {
  process.env.OAUTH_APPLE_CLIENT_ID = CLIENT_ID
  process.env.OAUTH_APPLE_TEAM_ID = TEAM_ID
  process.env.OAUTH_APPLE_KEY_ID = KEY_ID
  process.env.OAUTH_APPLE_PRIVATE_KEY = ES256_PRIVATE_PEM
  process.env.APP_ORIGIN = 'http://localhost:3000'
}

const signAppleIdToken = (overrides: Record<string, unknown> = {}, sub = '001234.apple.user') =>
  jwt.sign(
    {
      iss: 'https://appleid.apple.com',
      aud: CLIENT_ID,
      sub,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
      email: 'tester@privaterelay.appleid.com',
      email_verified: 'true',
      ...overrides,
    },
    RSA_PRIVATE_PEM,
    { algorithm: 'RS256', keyid: APPLE_KID },
  )

const mockJwksOk = () => {
  mockGet.mockResolvedValue({
    data: {
      keys: [{ ...RSA_PUBLIC_JWK, kid: APPLE_KID, alg: 'RS256', use: 'sig' }],
    },
  })
}

describe('Apple OAuth Provider', () => {
  const originalEnv = process.env

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    setEnv()
    vi.resetModules()
    const { resetJwksCache } = await import('../jwks.js')
    resetJwksCache()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('serverName', () => {
    it('is "apple"', async () => {
      const { serverName } = await import('../verify.js')
      expect(serverName).toBe('apple')
    })
  })

  describe('getAuthorizationUrl', () => {
    it('builds the Apple authorize URL with form_post when name/email scopes are requested', async () => {
      const { getAuthorizationUrl } = await import('../authorize.js')
      const url = getAuthorizationUrl({
        state: 'xyz',
        redirectUri: 'https://app.example.com/auth/apple/callback',
      })
      const parsed = new URL(url)

      expect(parsed.origin + parsed.pathname).toBe('https://appleid.apple.com/auth/authorize')
      expect(parsed.searchParams.get('client_id')).toBe(CLIENT_ID)
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://app.example.com/auth/apple/callback',
      )
      expect(parsed.searchParams.get('response_type')).toBe('code id_token')
      expect(parsed.searchParams.get('response_mode')).toBe('form_post')
      expect(parsed.searchParams.get('scope')).toBe('name email')
      expect(parsed.searchParams.get('state')).toBe('xyz')
    })

    it('defaults to query mode when scope omits name/email', async () => {
      const { getAuthorizationUrl } = await import('../authorize.js')
      const url = getAuthorizationUrl({
        state: 's',
        redirectUri: 'https://app.example.com/cb',
        scope: 'openid',
      })
      expect(new URL(url).searchParams.get('response_mode')).toBe('query')
    })

    it('respects an explicit responseMode and includes nonce', async () => {
      const { getAuthorizationUrl } = await import('../authorize.js')
      const url = getAuthorizationUrl({
        state: 's',
        redirectUri: 'https://app.example.com/cb',
        responseMode: 'fragment',
        nonce: 'n-0S6_WzA2Mj',
      })
      const params = new URL(url).searchParams
      expect(params.get('response_mode')).toBe('fragment')
      expect(params.get('nonce')).toBe('n-0S6_WzA2Mj')
    })

    it('throws when state or redirectUri is missing', async () => {
      const { getAuthorizationUrl } = await import('../authorize.js')
      expect(() => getAuthorizationUrl({ state: '', redirectUri: 'https://x' })).toThrowError(
        /state/,
      )
      expect(() => getAuthorizationUrl({ state: 's', redirectUri: '' })).toThrowError(/redirectUri/)
    })

    it('throws when OAUTH_APPLE_CLIENT_ID is not configured', async () => {
      delete process.env.OAUTH_APPLE_CLIENT_ID
      const { getAuthorizationUrl } = await import('../authorize.js')
      expect(() => getAuthorizationUrl({ state: 's', redirectUri: 'https://x' })).toThrowError(
        /OAUTH_APPLE_CLIENT_ID/,
      )
    })
  })

  describe('getAuthorizeUrl (OAuthAuthorizeUrlBuilder contract)', () => {
    it('builds the Apple authorize URL with client_id, redirect_uri, code + form_post, scope, and state', async () => {
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({
        redirectUri: 'https://app.example.com/auth/apple/callback',
        state: 'state-abc',
        codeChallenge: 'challenge-xyz',
        codeChallengeMethod: 'S256',
      })

      expect(raw).not.toBeNull()
      const url = new URL(raw!)
      expect(url.origin + url.pathname).toBe('https://appleid.apple.com/auth/authorize')
      expect(url.searchParams.get('client_id')).toBe(CLIENT_ID)
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://app.example.com/auth/apple/callback',
      )
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('response_mode')).toBe('form_post')
      expect(url.searchParams.get('scope')).toBe('name email')
      expect(url.searchParams.get('state')).toBe('state-abc')
    })

    it('never emits PKCE params even when provided — Apple does not support code_challenge', async () => {
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({
        redirectUri: 'https://app.example.com/cb',
        state: 's',
        codeChallenge: 'challenge-xyz',
        codeChallengeMethod: 'S256',
      })

      expect(raw).not.toBeNull()
      const params = new URL(raw!).searchParams
      // form_post (code in the POST body, never the URL) is Apple's
      // mitigation in place of PKCE.
      expect(params.has('code_challenge')).toBe(false)
      expect(params.has('code_challenge_method')).toBe(false)
    })

    it('falls back to APP_ORIGIN for redirect_uri when params.redirectUri is absent', async () => {
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'c' })

      expect(raw).not.toBeNull()
      expect(new URL(raw!).searchParams.get('redirect_uri')).toBe('http://localhost:3000')
    })

    it('omits redirect_uri when neither params.redirectUri nor APP_ORIGIN is set', async () => {
      delete process.env.APP_ORIGIN
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({ state: 's' })

      expect(raw).not.toBeNull()
      expect(new URL(raw!).searchParams.has('redirect_uri')).toBe(false)
    })

    it('returns null when OAUTH_APPLE_CLIENT_ID is unset (unconfigured, not a crash)', async () => {
      delete process.env.OAUTH_APPLE_CLIENT_ID
      const { getAuthorizeUrl } = await import('../authorize.js')

      expect(getAuthorizeUrl({ state: 's' })).toBeNull()
    })
  })

  describe('createAppleClientSecret', () => {
    it('produces an ES256 JWT with the required Apple claims and kid header', async () => {
      const { createAppleClientSecret } = await import('../client-secret.js')
      const token = createAppleClientSecret({
        teamId: TEAM_ID,
        clientId: CLIENT_ID,
        keyId: KEY_ID,
        privateKey: ES256_PRIVATE_PEM,
      })

      const decoded = jwt.decode(token, { complete: true })
      expect(decoded).toBeTruthy()
      if (!decoded || typeof decoded === 'string') throw new Error('decode failed')
      expect(decoded.header.alg).toBe('ES256')
      expect(decoded.header.kid).toBe(KEY_ID)
      const payload = decoded.payload as Record<string, unknown>
      expect(payload.iss).toBe(TEAM_ID)
      expect(payload.sub).toBe(CLIENT_ID)
      expect(payload.aud).toBe('https://appleid.apple.com')
      expect(payload.exp).toBeGreaterThan(payload.iat as number)
    })

    it('tolerates `\\n`-encoded newlines in the private key env value', async () => {
      const { createAppleClientSecret } = await import('../client-secret.js')
      const escaped = ES256_PRIVATE_PEM.replace(/\n/g, '\\n')
      const token = createAppleClientSecret({
        teamId: TEAM_ID,
        clientId: CLIENT_ID,
        keyId: KEY_ID,
        privateKey: escaped,
      })
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('rejects missing inputs', async () => {
      const { createAppleClientSecret } = await import('../client-secret.js')
      expect(() =>
        createAppleClientSecret({
          teamId: '',
          clientId: CLIENT_ID,
          keyId: KEY_ID,
          privateKey: ES256_PRIVATE_PEM,
        }),
      ).toThrow()
    })

    it('rejects out-of-range lifetimes', async () => {
      const { createAppleClientSecret } = await import('../client-secret.js')
      expect(() =>
        createAppleClientSecret({
          teamId: TEAM_ID,
          clientId: CLIENT_ID,
          keyId: KEY_ID,
          privateKey: ES256_PRIVATE_PEM,
          lifetimeSeconds: 0,
        }),
      ).toThrow()
      expect(() =>
        createAppleClientSecret({
          teamId: TEAM_ID,
          clientId: CLIENT_ID,
          keyId: KEY_ID,
          privateKey: ES256_PRIVATE_PEM,
          lifetimeSeconds: 99999999,
        }),
      ).toThrow()
    })

    it('does not include the private key in error messages', async () => {
      const { createAppleClientSecret } = await import('../client-secret.js')
      try {
        createAppleClientSecret({
          teamId: TEAM_ID,
          clientId: CLIENT_ID,
          keyId: KEY_ID,
          privateKey: 'not-a-real-pem',
        })
        throw new Error('should have thrown')
      } catch (err) {
        const message = (err as Error).message
        expect(message).not.toContain('not-a-real-pem')
      }
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('POSTs to /auth/token with an ES256 client_secret JWT', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'at',
          expires_in: 3600,
          id_token: 'it',
          refresh_token: 'rt',
          token_type: 'Bearer',
        },
      })

      const { exchangeCodeForTokens } = await import('../tokens.js')
      const result = await exchangeCodeForTokens('the-code', 'https://app.example.com/cb')

      expect(result.access_token).toBe('at')
      expect(result.refresh_token).toBe('rt')
      expect(mockPost).toHaveBeenCalledTimes(1)

      const [url, body, options] = mockPost.mock.calls[0]
      expect(url).toBe('https://appleid.apple.com/auth/token')
      expect((options as { headers: Record<string, string> }).headers['content-type']).toBe(
        'application/x-www-form-urlencoded',
      )

      const params = new URLSearchParams(body as string)
      expect(params.get('grant_type')).toBe('authorization_code')
      expect(params.get('code')).toBe('the-code')
      expect(params.get('client_id')).toBe(CLIENT_ID)
      expect(params.get('redirect_uri')).toBe('https://app.example.com/cb')

      const clientSecret = params.get('client_secret')
      expect(clientSecret).toBeTruthy()
      const decoded = jwt.decode(clientSecret as string, { complete: true })
      if (!decoded || typeof decoded === 'string') throw new Error('decode failed')
      expect(decoded.header.alg).toBe('ES256')
      expect(decoded.header.kid).toBe(KEY_ID)
      expect((decoded.payload as Record<string, unknown>).iss).toBe(TEAM_ID)
      expect((decoded.payload as Record<string, unknown>).sub).toBe(CLIENT_ID)
    })

    it('falls back to APP_ORIGIN when redirectUri is omitted', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'at',
          expires_in: 3600,
          id_token: 'it',
          token_type: 'Bearer',
        },
      })
      const { exchangeCodeForTokens } = await import('../tokens.js')
      await exchangeCodeForTokens('code')
      const params = new URLSearchParams(mockPost.mock.calls[0][1] as string)
      expect(params.get('redirect_uri')).toBe('http://localhost:3000')
    })

    it('throws when required env vars are missing', async () => {
      delete process.env.OAUTH_APPLE_TEAM_ID
      const { exchangeCodeForTokens } = await import('../tokens.js')
      await expect(exchangeCodeForTokens('code', 'https://x')).rejects.toThrow(
        /OAUTH_APPLE_TEAM_ID/,
      )
    })
  })

  describe('refreshAccessToken', () => {
    it('POSTs to /auth/token with grant_type=refresh_token', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'new-at', expires_in: 3600, id_token: 'it', token_type: 'Bearer' },
      })

      const { refreshAccessToken } = await import('../tokens.js')
      const result = await refreshAccessToken('old-rt')

      expect(result.access_token).toBe('new-at')
      const params = new URLSearchParams(mockPost.mock.calls[0][1] as string)
      expect(params.get('grant_type')).toBe('refresh_token')
      expect(params.get('refresh_token')).toBe('old-rt')
      expect(params.get('client_id')).toBe(CLIENT_ID)
      expect(params.get('client_secret')).toBeTruthy()
    })
  })

  describe('verifyIdToken', () => {
    it('verifies a valid Apple ID token using JWKS lookup', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken()
      const { verifyIdToken } = await import('../verify-id-token.js')

      const claims = await verifyIdToken(idToken)
      expect(claims.iss).toBe('https://appleid.apple.com')
      expect(claims.aud).toBe(CLIENT_ID)
      expect(claims.sub).toBe('001234.apple.user')
      expect(claims.email).toBe('tester@privaterelay.appleid.com')
      expect(mockGet).toHaveBeenCalledWith('https://appleid.apple.com/auth/keys', expect.anything())
    })

    it('caches JWKS results across calls within the TTL', async () => {
      mockJwksOk()
      const { verifyIdToken } = await import('../verify-id-token.js')
      await verifyIdToken(signAppleIdToken())
      await verifyIdToken(signAppleIdToken())
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('key rotation: refetches the JWKS once when the cached set lacks the token kid', async () => {
      // A stale cached JWKS (fetched before Apple rotated keys) must not fail
      // logins for the rest of the TTL — a kid miss forces ONE refetch.
      const staleKeys = { data: { keys: [{ ...RSA_PUBLIC_JWK, kid: 'OLD-KID', alg: 'RS256' }] } }
      const freshKeys = {
        data: { keys: [{ ...RSA_PUBLIC_JWK, kid: APPLE_KID, alg: 'RS256', use: 'sig' }] },
      }
      mockGet.mockResolvedValueOnce(staleKeys).mockResolvedValueOnce(freshKeys)

      const { verifyIdToken } = await import('../verify-id-token.js')
      const claims = await verifyIdToken(signAppleIdToken())

      expect(claims.sub).toBe('001234.apple.user')
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('key rotation: a kid missing even after the forced refetch still fails cleanly', async () => {
      const staleKeys = { data: { keys: [{ ...RSA_PUBLIC_JWK, kid: 'OLD-KID', alg: 'RS256' }] } }
      mockGet.mockResolvedValue(staleKeys)

      const { verifyIdToken } = await import('../verify-id-token.js')
      await expect(verifyIdToken(signAppleIdToken())).rejects.toThrow(
        /does not contain a key for kid/,
      )
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('rejects tokens with the wrong issuer', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken({ iss: 'https://evil.example.com' })
      const { verifyIdToken } = await import('../verify-id-token.js')
      await expect(verifyIdToken(idToken)).rejects.toThrow()
    })

    it('rejects tokens with the wrong audience', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken({ aud: 'someone.else' })
      const { verifyIdToken } = await import('../verify-id-token.js')
      await expect(verifyIdToken(idToken)).rejects.toThrow()
    })

    it('rejects expired tokens', async () => {
      mockJwksOk()
      const past = Math.floor(Date.now() / 1000) - 3600
      const idToken = signAppleIdToken({ iat: past - 600, exp: past })
      const { verifyIdToken } = await import('../verify-id-token.js')
      await expect(verifyIdToken(idToken)).rejects.toThrow()
    })

    it('rejects tokens whose kid is not in the JWKS', async () => {
      mockJwksOk()
      const idToken = jwt.sign(
        {
          iss: 'https://appleid.apple.com',
          aud: CLIENT_ID,
          sub: '001234.apple.user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 600,
        },
        RSA_PRIVATE_PEM,
        { algorithm: 'RS256', keyid: 'NotInJwks' },
      )
      const { verifyIdToken } = await import('../verify-id-token.js')
      await expect(verifyIdToken(idToken)).rejects.toThrow(/JWKS/)
    })

    it('rejects empty / unparseable input', async () => {
      const { verifyIdToken } = await import('../verify-id-token.js')
      await expect(verifyIdToken('')).rejects.toThrow()
      await expect(verifyIdToken('not.a.jwt.really')).rejects.toThrow()
    })

    it('rejects tokens signed with a non-RS256 algorithm (alg confusion)', async () => {
      mockJwksOk()
      // Classic JWS alg-confusion attack: the attacker signs with HS256 and
      // hopes the verifier feeds the RSA public key in as an HMAC secret.
      // The bond's explicit alg guard must reject before any key handling.
      const forged = jwt.sign(
        {
          iss: 'https://appleid.apple.com',
          aud: CLIENT_ID,
          sub: '001234.apple.user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 600,
        },
        'attacker-shared-secret',
        { algorithm: 'HS256', keyid: APPLE_KID },
      )
      const { verifyIdToken } = await import('../verify-id-token.js')
      await expect(verifyIdToken(forged)).rejects.toThrow(/alg/)
    })
  })

  describe('verify (OAuthVerifier contract)', () => {
    it('exchanges code for tokens, verifies the id_token, and returns normalized props', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken()
      mockPost.mockResolvedValue({
        data: {
          access_token: 'at',
          expires_in: 3600,
          id_token: idToken,
          refresh_token: 'rt',
          token_type: 'Bearer',
        },
      })

      const { verify } = await import('../verify.js')
      const result = await verify('the-code', undefined, 'https://app.example.com/cb')

      expect(result).not.toBeNull()
      expect(result!.username).toBe('tester@privaterelay.appleid.com@apple')
      expect(result!.email).toBe('tester@privaterelay.appleid.com')
      // Apple's ID token carries email_verified ('true' string here) — it must
      // be surfaced, not dropped (the exact SEC2 gap).
      expect(result!.emailVerified).toBe(true)
      expect(result!.oauthServer).toBe('apple')
      expect(result!.oauthId).toBe('001234.apple.user')
      // The verified identity/profile claims ARE retained in oauthData...
      expect(result!.oauthData.sub).toBe('001234.apple.user')
      expect(result!.oauthData.email).toBe('tester@privaterelay.appleid.com')
      // ...but the access/refresh/id tokens are NEVER persisted there.
      // oauthData is part of the user's READABLE props (GET /api/users/:id),
      // so leaking bearer credentials into it would expose them to the
      // browser. Apple now matches its sibling bonds (profile-only oauthData).
      expect(result!.oauthData.access_token).toBeUndefined()
      expect(result!.oauthData.refresh_token).toBeUndefined()
      expect(result!.oauthData.id_token).toBeUndefined()
      expect(result!.oauthData.token_type).toBeUndefined()
      expect(result!.oauthData.expires_in).toBeUndefined()
    })

    it('never persists access/refresh/id tokens into the readable oauthData prop', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken()
      mockPost.mockResolvedValue({
        data: {
          access_token: 'super-secret-access-token',
          expires_in: 3600,
          id_token: idToken,
          refresh_token: 'super-secret-refresh-token',
          token_type: 'Bearer',
        },
      })

      const { verify } = await import('../verify.js')
      const result = await verify('the-code', undefined, 'https://app.example.com/cb')

      expect(result).not.toBeNull()
      // No token value (access/refresh/id) may appear anywhere in the
      // serialized oauthData bag that is returned to the browser.
      const serialized = JSON.stringify(result!.oauthData)
      expect(serialized).not.toContain('super-secret-access-token')
      expect(serialized).not.toContain('super-secret-refresh-token')
      expect(serialized).not.toContain(idToken)
      // None of the OAuth token-envelope keys should exist on oauthData.
      for (const key of ['access_token', 'refresh_token', 'id_token', 'token_type', 'expires_in']) {
        expect(Object.prototype.hasOwnProperty.call(result!.oauthData, key)).toBe(false)
      }
    })

    it('reports emailVerified=false when Apple marks the email unverified', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken({ email_verified: 'false' })
      mockPost.mockResolvedValue({
        data: { access_token: 'at', expires_in: 3600, id_token: idToken, token_type: 'Bearer' },
      })

      const { verify } = await import('../verify.js')
      const result = await verify('the-code')

      expect(result).not.toBeNull()
      expect(result!.email).toBe('tester@privaterelay.appleid.com')
      expect(result!.emailVerified).toBe(false)
    })

    it('falls back to oauthId in username when email is omitted', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken({ email: undefined })
      mockPost.mockResolvedValue({
        data: { access_token: 'at', expires_in: 3600, id_token: idToken, token_type: 'Bearer' },
      })

      const { verify } = await import('../verify.js')
      const result = await verify('the-code')
      expect(result).not.toBeNull()
      expect(result!.email).toBeUndefined()
      expect(result!.username).toBe('001234.apple.user@apple')
    })

    it('propagates token-exchange failures', async () => {
      mockPost.mockRejectedValue(new Error('invalid_grant'))
      const { verify } = await import('../verify.js')
      await expect(verify('bad-code')).rejects.toThrow('invalid_grant')
    })

    it('returns null when Apple affirmatively rejects the code (HTTP 400 invalid_grant)', async () => {
      // Apple's /auth/token responds HTTP 400 { error: 'invalid_grant' } for
      // an invalid/expired/reused authorization code — the provider
      // rejecting the code, not an infrastructure fault. Per the
      // OAuthVerifier contract this must be `null` (consumer → 403), never
      // a throw (→ 500).
      mockPost.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 400'), {
          response: { status: 400, data: { error: 'invalid_grant' } },
        }),
      )

      const { verify } = await import('../verify.js')
      const result = await verify('expired-or-reused-code')

      expect(result).toBeNull()
      // verifyIdToken must never run — its first step is the JWKS fetch
      // (mockGet), so an untouched mockGet proves it was not called.
      expect(mockGet).not.toHaveBeenCalled()
      // A rejected code is a warn, not an error — logger.error would page
      // operators for what is a client-side (or attacker-side) mistake.
      expect(mockLoggerError).not.toHaveBeenCalled()
      expect(mockLoggerWarn).toHaveBeenCalledWith('Apple OAuth code exchange rejected', {
        error: 'invalid_grant',
      })
    })

    it('still throws on a 400 with a different provider error code', async () => {
      // e.g. invalid_client (bad client-secret JWT) is a deployment
      // misconfiguration — an infrastructure fault, not a code rejection.
      mockPost.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 400'), {
          response: { status: 400, data: { error: 'invalid_client' } },
        }),
      )

      const { verify } = await import('../verify.js')
      await expect(verify('the-code')).rejects.toThrow()
      expect(mockLoggerError).toHaveBeenCalled()
    })

    it('still throws on a non-400 status even when the body says invalid_grant', async () => {
      // The null path requires BOTH the 400 status AND the invalid_grant
      // code — a 5xx is a provider outage regardless of body contents.
      mockPost.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 500'), {
          response: { status: 500, data: { error: 'invalid_grant' } },
        }),
      )

      const { verify } = await import('../verify.js')
      await expect(verify('the-code')).rejects.toThrow()
      expect(mockLoggerError).toHaveBeenCalled()
    })

    it('does not leak the auth code or token body to logs / the rethrown error (CWE-532)', async () => {
      const loggedStrings = (): string[] =>
        mockLoggerError.mock.calls.flat().map((arg) => {
          if (typeof arg === 'string') return arg
          if (arg instanceof Error) return `${arg.message} ${JSON.stringify(arg)}`
          return JSON.stringify(arg)
        })

      // The HttpError that @molecule/api-http throws attaches the token POST
      // body (which contains the generated client-secret JWT) and echoes the
      // auth code in its message. (`invalid_client`, not `invalid_grant`:
      // a 400 invalid_grant now takes the null path without rethrowing —
      // this test exercises the sanitize + throw path.)
      const leak = Object.assign(new Error('token exchange failed for code=attacker-code-1234'), {
        request: {
          url: 'https://appleid.apple.com/auth/token',
          method: 'POST',
          body: 'client_secret=SECRET_CLIENT_JWT_VALUE&code=attacker-code-1234',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        },
        response: { status: 400, data: { error: 'invalid_client' } },
      })
      mockPost.mockRejectedValue(leak)

      const { verify } = await import('../verify.js')

      let thrown: unknown
      await expect(
        verify('attacker-code-1234').catch((error: unknown) => {
          thrown = error
          throw error
        }),
      ).rejects.toBeDefined()

      for (const s of loggedStrings()) {
        expect(s).not.toContain('attacker-code-1234')
        expect(s).not.toContain('SECRET_CLIENT_JWT_VALUE')
      }
      expect(loggedStrings().some((s) => s.includes('Apple OAuth verify error'))).toBe(true)

      // The rethrown error must be the scrubbed copy — no request body retained.
      expect((thrown as { request?: unknown }).request).toBeUndefined()
      const serialized = `${(thrown as Error).message} ${JSON.stringify(thrown)}`
      expect(serialized).not.toContain('attacker-code-1234')
      expect(serialized).not.toContain('SECRET_CLIENT_JWT_VALUE')
    })

    it('propagates id-token verification failures', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken({ aud: 'wrong.audience' })
      mockPost.mockResolvedValue({
        data: { access_token: 'at', expires_in: 3600, id_token: idToken, token_type: 'Bearer' },
      })
      const { verify } = await import('../verify.js')
      await expect(verify('the-code')).rejects.toThrow()
    })
  })

  describe('getUserInfo', () => {
    it('returns the verified ID token claims', async () => {
      mockJwksOk()
      const idToken = signAppleIdToken({ email: 'a@b.c' })
      const { getUserInfo } = await import('../verify.js')
      const claims = await getUserInfo(idToken)
      expect(claims.email).toBe('a@b.c')
      expect(claims.sub).toBe('001234.apple.user')
    })
  })

  describe('index exports', () => {
    it('exports the public surface', async () => {
      const exports = await import('../index.js')
      expect(exports.serverName).toBeDefined()
      expect(exports.verify).toBeDefined()
      expect(exports.getAuthorizationUrl).toBeDefined()
      expect(exports.getAuthorizeUrl).toBeDefined()
      expect(exports.exchangeCodeForTokens).toBeDefined()
      expect(exports.refreshAccessToken).toBeDefined()
      expect(exports.verifyIdToken).toBeDefined()
      expect(exports.getUserInfo).toBeDefined()
      expect(exports.createAppleClientSecret).toBeDefined()
    })
  })
})

describe('secret definitions', () => {
  it('registers secret definitions in @molecule/api-secrets on import', async () => {
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    await import('../index.js')
    expect(getSecretDefinition('OAUTH_APPLE_CLIENT_ID')).toBeDefined()
  })
})
