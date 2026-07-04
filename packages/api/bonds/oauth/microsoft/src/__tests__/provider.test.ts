/**
 * Tests for the Microsoft OAuth provider.
 *
 * @module
 */

import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.fn()
const mockGet = vi.fn()
const mockLoggerWarn = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@molecule/api-http', () => ({
  post: mockPost,
  get: mockGet,
}))

vi.mock('@molecule/api-oauth', () => ({
  // Type exports only, no runtime values needed.
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: vi.fn(),
  }),
}))

const base64Url = (input: string | Buffer): string => {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return b.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

interface JwkRsa {
  kty: string
  n?: string
  e?: string
}

// One RSA keypair for the whole file — key generation is the slow part.
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 })

const jwkForKid = (key: KeyObject, kid: string): Record<string, string> => {
  const jwk = key.export({ format: 'jwk' }) as JwkRsa
  return { kty: jwk.kty, kid, n: jwk.n!, e: jwk.e!, alg: 'RS256', use: 'sig' }
}

const signRs256 = (kid: string, payload: Record<string, unknown>): string => {
  const header = base64Url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))
  const body = base64Url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  return `${signingInput}.${base64Url(signer.sign(rsa.privateKey))}`
}

describe('Microsoft OAuth provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.OAUTH_MICROSOFT_CLIENT_ID = 'test-ms-client-id'
    process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'super-secret-shhh'
    process.env.APP_ORIGIN = 'http://localhost:3000'
    delete process.env.OAUTH_MICROSOFT_TENANT_ID
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('exports serverName "microsoft"', async () => {
    const { serverName } = await import('../provider.js')
    expect(serverName).toBe('microsoft')
  })

  describe('getAuthorizationUrl', () => {
    it('builds the /common/oauth2/v2.0/authorize URL with default scope', async () => {
      const { provider } = await import('../provider.js')
      const url = provider.getAuthorizationUrl({
        state: 'abc123',
        redirectUri: 'http://localhost:3000/oauth/callback',
      })
      const parsed = new URL(url)
      expect(parsed.origin + parsed.pathname).toBe(
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      )
      expect(parsed.searchParams.get('client_id')).toBe('test-ms-client-id')
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/oauth/callback')
      expect(parsed.searchParams.get('response_mode')).toBe('query')
      expect(parsed.searchParams.get('scope')).toBe('openid email profile User.Read')
      expect(parsed.searchParams.get('state')).toBe('abc123')
    })

    it('honours an explicit scope override', async () => {
      const { provider } = await import('../provider.js')
      const url = provider.getAuthorizationUrl({
        state: 's',
        redirectUri: 'http://localhost:3000/cb',
        scope: 'openid offline_access Mail.Read',
      })
      expect(new URL(url).searchParams.get('scope')).toBe('openid offline_access Mail.Read')
    })

    it('uses the configured tenantId when provided via env', async () => {
      process.env.OAUTH_MICROSOFT_TENANT_ID = '00000000-0000-0000-0000-000000000001'
      const { provider } = await import('../provider.js')
      const url = provider.getAuthorizationUrl({
        state: 's',
        redirectUri: 'http://localhost:3000/cb',
      })
      expect(url).toContain(
        'https://login.microsoftonline.com/00000000-0000-0000-0000-000000000001/oauth2/v2.0/authorize',
      )
    })

    it('uses the configured tenantId when overridden in createMicrosoftProvider', async () => {
      const { createMicrosoftProvider } = await import('../provider.js')
      const custom = createMicrosoftProvider({ tenantId: 'organizations' })
      const url = custom.getAuthorizationUrl({
        state: 's',
        redirectUri: 'http://localhost:3000/cb',
      })
      expect(url).toContain('https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize')
    })
  })

  describe('getAuthorizeUrl (core initiation builder)', () => {
    it('builds the full authorize URL with PKCE, state, scope, and response_mode=query', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')
      const raw = getAuthorizeUrl({
        redirectUri: 'http://localhost:3000/oauth/callback',
        state: 'csrf-state-1',
        codeChallenge: 'the-challenge',
        codeChallengeMethod: 'S256',
      })
      expect(raw).not.toBeNull()
      const parsed = new URL(raw!)
      expect(parsed.origin + parsed.pathname).toBe(
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      )
      expect(parsed.searchParams.get('client_id')).toBe('test-ms-client-id')
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/oauth/callback')
      expect(parsed.searchParams.get('response_mode')).toBe('query')
      expect(parsed.searchParams.get('scope')).toBe('openid email profile User.Read')
      expect(parsed.searchParams.get('state')).toBe('csrf-state-1')
      expect(parsed.searchParams.get('code_challenge')).toBe('the-challenge')
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('honours OAUTH_MICROSOFT_TENANT_ID in the authorize endpoint path', async () => {
      process.env.OAUTH_MICROSOFT_TENANT_ID = '00000000-0000-0000-0000-000000000001'
      const { getAuthorizeUrl } = await import('../provider.js')
      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'c' })
      expect(raw).toContain(
        'https://login.microsoftonline.com/00000000-0000-0000-0000-000000000001/oauth2/v2.0/authorize',
      )
    })

    it('omits redirect_uri when absent so Microsoft falls back to the registered callback', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')
      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'c' })
      const parsed = new URL(raw!)
      expect(parsed.searchParams.has('redirect_uri')).toBe(false)
    })

    it('defaults code_challenge_method to S256 when a challenge is given without a method', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')
      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'challenge-xyz' })
      const parsed = new URL(raw!)
      expect(parsed.searchParams.get('code_challenge')).toBe('challenge-xyz')
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('omits the PKCE params entirely when no codeChallenge is supplied', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')
      const raw = getAuthorizeUrl({ state: 's' })
      const parsed = new URL(raw!)
      expect(parsed.searchParams.has('code_challenge')).toBe(false)
      expect(parsed.searchParams.has('code_challenge_method')).toBe(false)
    })

    it('returns null when OAUTH_MICROSOFT_CLIENT_ID is unset (unconfigured, not a crash)', async () => {
      delete process.env.OAUTH_MICROSOFT_CLIENT_ID
      const { getAuthorizeUrl } = await import('../provider.js')
      expect(getAuthorizeUrl({ state: 's' })).toBeNull()
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('POSTs form-encoded body to /common/oauth2/v2.0/token and normalizes', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'a-token',
          id_token: 'id-token',
          refresh_token: 'r-token',
          token_type: 'Bearer',
          expires_in: 3599,
          scope: 'openid email profile User.Read',
        },
      })
      const { provider } = await import('../provider.js')
      const result = await provider.exchangeCodeForTokens('the-code', 'http://localhost:3000/cb')

      expect(mockPost).toHaveBeenCalledTimes(1)
      const [url, body, options] = mockPost.mock.calls[0] as [
        string,
        string,
        Record<string, unknown>,
      ]
      expect(url).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/token')
      const params = new URLSearchParams(body)
      expect(params.get('client_id')).toBe('test-ms-client-id')
      expect(params.get('client_secret')).toBe('super-secret-shhh')
      expect(params.get('code')).toBe('the-code')
      expect(params.get('grant_type')).toBe('authorization_code')
      expect(params.get('redirect_uri')).toBe('http://localhost:3000/cb')
      // No PKCE verifier was supplied — the form body must omit it.
      expect(params.has('code_verifier')).toBe(false)
      const headers = (options as { headers: Record<string, string> }).headers
      expect(headers['content-type']).toBe('application/x-www-form-urlencoded')

      expect(result).toEqual({
        accessToken: 'a-token',
        idToken: 'id-token',
        refreshToken: 'r-token',
        tokenType: 'Bearer',
        expiresIn: 3599,
        scope: 'openid email profile User.Read',
      })
    })

    it('throws if the token response lacks access_token', async () => {
      mockPost.mockResolvedValue({ data: { token_type: 'Bearer' } })
      const { provider } = await import('../provider.js')
      await expect(provider.exchangeCodeForTokens('c', 'http://localhost:3000/cb')).rejects.toThrow(
        /access_token/,
      )
    })

    it('redacts client secret and code from token-exchange errors', async () => {
      const upstream = new Error(
        'Bad request: client_secret=super-secret-shhh and code=the-code rejected',
      )
      mockPost.mockRejectedValue(upstream)
      const { provider } = await import('../provider.js')
      let captured: Error | undefined
      try {
        await provider.exchangeCodeForTokens('the-code', 'http://localhost:3000/cb')
      } catch (err) {
        captured = err as Error
      }
      expect(captured).toBeDefined()
      expect(captured!.message).not.toContain('super-secret-shhh')
      expect(captured!.message).not.toContain('the-code')
      expect(captured!.message).toContain('[REDACTED]')
    })

    it('includes code_verifier in the form body when given (PKCE redemption)', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'a-token', token_type: 'Bearer' },
      })
      const { provider } = await import('../provider.js')
      await provider.exchangeCodeForTokens('the-code', 'http://localhost:3000/cb', 'verifier-123')

      const body = mockPost.mock.calls[0]?.[1] as string
      const params = new URLSearchParams(body)
      expect(params.get('code_verifier')).toBe('verifier-123')
      // PKCE is complementary to the confidential-client secret — both go.
      expect(params.get('client_secret')).toBe('super-secret-shhh')
    })

    it('throws MicrosoftOAuthCodeRejectedError (warn, not error) on a 400 invalid_grant', async () => {
      mockPost.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 400'), {
          response: {
            status: 400,
            data: {
              error: 'invalid_grant',
              error_description: 'AADSTS70008: The provided authorization code has expired.',
            },
          },
        }),
      )
      const { provider, MicrosoftOAuthCodeRejectedError } = await import('../provider.js')
      await expect(
        provider.exchangeCodeForTokens('expired-code', 'http://localhost:3000/cb'),
      ).rejects.toBeInstanceOf(MicrosoftOAuthCodeRejectedError)
      // An affirmative rejection is a client-side failure, not an outage.
      expect(mockLoggerWarn).toHaveBeenCalledTimes(1)
      expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it('keeps a 400 with a different error code (e.g. invalid_client) as an infra throw', async () => {
      mockPost.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 400'), {
          response: { status: 400, data: { error: 'invalid_client' } },
        }),
      )
      const { provider, MicrosoftOAuthCodeRejectedError } = await import('../provider.js')
      let captured: unknown
      try {
        await provider.exchangeCodeForTokens('c', 'http://localhost:3000/cb')
      } catch (err) {
        captured = err
      }
      expect(captured).toBeInstanceOf(Error)
      expect(captured).not.toBeInstanceOf(MicrosoftOAuthCodeRejectedError)
      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })

  describe('refreshAccessToken', () => {
    it('POSTs grant_type=refresh_token and returns rotated token set', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'new-access',
          refresh_token: 'rotated-refresh',
          token_type: 'Bearer',
          expires_in: 3599,
        },
      })
      const { provider } = await import('../provider.js')
      const out = await provider.refreshAccessToken('old-refresh-token')

      const body = mockPost.mock.calls[0]?.[1] as string
      const params = new URLSearchParams(body)
      expect(params.get('grant_type')).toBe('refresh_token')
      expect(params.get('refresh_token')).toBe('old-refresh-token')
      expect(params.get('client_id')).toBe('test-ms-client-id')
      expect(params.get('client_secret')).toBe('super-secret-shhh')

      expect(out.accessToken).toBe('new-access')
      expect(out.refreshToken).toBe('rotated-refresh')
    })

    it('redacts the refresh token and client secret from refresh errors', async () => {
      mockPost.mockRejectedValue(
        new Error('boom client_secret=super-secret-shhh refresh_token=old-refresh-token'),
      )
      const { provider } = await import('../provider.js')
      try {
        await provider.refreshAccessToken('old-refresh-token')
        throw new Error('should have thrown')
      } catch (err) {
        const e = err as Error
        expect(e.message).not.toContain('super-secret-shhh')
        expect(e.message).not.toContain('old-refresh-token')
        expect(e.message).toContain('[REDACTED]')
      }
    })
  })

  describe('getUserInfo', () => {
    it('GETs Microsoft Graph /me and normalizes the response', async () => {
      mockGet.mockResolvedValue({
        data: {
          id: 'AAD-123',
          mail: 'alice@contoso.com',
          userPrincipalName: 'alice@contoso.onmicrosoft.com',
          displayName: 'Alice Example',
        },
      })
      const { provider } = await import('../provider.js')
      const info = await provider.getUserInfo('access-token-xyz')

      expect(mockGet).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/me', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer access-token-xyz',
        },
        timeout: 15_000,
      })
      expect(info).toEqual({
        id: 'AAD-123',
        email: 'alice@contoso.com',
        name: 'Alice Example',
        picture: undefined,
      })
    })

    it('falls back to userPrincipalName when mail is null and composes name from given+surname', async () => {
      mockGet.mockResolvedValue({
        data: {
          id: 'AAD-456',
          mail: null,
          userPrincipalName: 'bob@contoso.onmicrosoft.com',
          givenName: 'Bob',
          surname: 'Builder',
        },
      })
      const { provider } = await import('../provider.js')
      const info = await provider.getUserInfo('t')
      expect(info.email).toBe('bob@contoso.onmicrosoft.com')
      expect(info.name).toBe('Bob Builder')
    })

    it('redacts the access token from upstream errors', async () => {
      mockGet.mockRejectedValue(new Error('401 token=access-token-xyz expired'))
      const { provider } = await import('../provider.js')
      try {
        await provider.getUserInfo('access-token-xyz')
        throw new Error('should have thrown')
      } catch (err) {
        const e = err as Error
        expect(e.message).not.toContain('access-token-xyz')
        expect(e.message).toContain('[REDACTED]')
      }
    })

    it('normalizes a malformed Graph /me response to an empty id', async () => {
      mockGet.mockResolvedValue({ data: {} })
      const { provider } = await import('../provider.js')
      const info = await provider.getUserInfo('t')
      expect(info).toEqual({ id: '', email: undefined, name: undefined, picture: undefined })
    })
  })

  describe('verifyIdToken (provider method)', () => {
    const nowSec = (): number => Math.floor(Date.now() / 1000)
    const commonIss = 'https://login.microsoftonline.com/common/v2.0'

    const jwksOk = (): void => {
      mockGet.mockResolvedValue({
        data: { keys: [jwkForKid(rsa.publicKey, 'kid-provider')] },
      })
    }

    it('verifies a valid RS256 id token, fetching JWKS from the configured tenant', async () => {
      jwksOk()
      const { provider } = await import('../provider.js')
      const token = signRs256('kid-provider', {
        iss: commonIss,
        aud: 'test-ms-client-id',
        sub: 'oid-provider-1',
        exp: nowSec() + 600,
        iat: nowSec() - 60,
        email: 'dana@contoso.com',
        tid: 'common',
      })
      const claims = await provider.verifyIdToken(token)
      expect(claims.sub).toBe('oid-provider-1')
      expect(claims.email).toBe('dana@contoso.com')
      expect(claims.aud).toBe('test-ms-client-id')
      expect(mockGet).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/common/discovery/v2.0/keys',
        expect.anything(),
      )
    })

    it('plumbs a tenantId override into the JWKS discovery endpoint', async () => {
      jwksOk()
      const { createMicrosoftProvider } = await import('../provider.js')
      const custom = createMicrosoftProvider({ tenantId: 'organizations' })
      const tokenTid = '11111111-2222-3333-4444-555555555555'
      const token = signRs256('kid-provider', {
        iss: `https://login.microsoftonline.com/${tokenTid}/v2.0`,
        aud: 'test-ms-client-id',
        sub: 'oid-provider-2',
        exp: nowSec() + 600,
        iat: nowSec() - 60,
        tid: tokenTid,
      })
      const claims = await custom.verifyIdToken(token)
      expect(claims.tid).toBe(tokenTid)
      expect(mockGet).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/organizations/discovery/v2.0/keys',
        expect.anything(),
      )
    })

    it('rejects a token whose audience is not the configured client id', async () => {
      jwksOk()
      const { provider } = await import('../provider.js')
      const token = signRs256('kid-provider', {
        iss: commonIss,
        aud: 'someone-else',
        sub: 'oid-provider-3',
        exp: nowSec() + 600,
        iat: nowSec() - 60,
      })
      await expect(provider.verifyIdToken(token)).rejects.toThrow(/audience/i)
    })

    it('rejects an expired token', async () => {
      jwksOk()
      const { provider } = await import('../provider.js')
      const token = signRs256('kid-provider', {
        iss: commonIss,
        aud: 'test-ms-client-id',
        sub: 'oid-provider-4',
        exp: nowSec() - 10,
        iat: nowSec() - 600,
      })
      await expect(provider.verifyIdToken(token)).rejects.toThrow(/expired/i)
    })

    it('redacts the client secret from verification errors', async () => {
      mockGet.mockRejectedValue(
        new Error('JWKS fetch failed; sent client_secret=super-secret-shhh'),
      )
      const { provider } = await import('../provider.js')
      const token = signRs256('kid-provider', {
        iss: commonIss,
        aud: 'test-ms-client-id',
        sub: 'oid-provider-5',
        exp: nowSec() + 600,
        iat: nowSec() - 60,
      })
      try {
        await provider.verifyIdToken(token)
        throw new Error('should have thrown')
      } catch (err) {
        const e = err as Error
        expect(e.message).not.toContain('super-secret-shhh')
        expect(e.message).toContain('[REDACTED]')
      }
    })
  })

  describe('verify (OAuthVerifier compat)', () => {
    it('exchanges the code, fetches /me, and returns OAuthUserProps', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'a', token_type: 'Bearer' },
      })
      mockGet.mockResolvedValue({
        data: {
          id: 'AAD-789',
          mail: 'carol@contoso.com',
          displayName: 'Carol',
        },
      })
      const { verify } = await import('../provider.js')
      const result = await verify('code-1', undefined, 'http://localhost:3000/cb')
      expect(result).toEqual({
        username: 'carol@contoso.com@microsoft',
        name: 'Carol',
        email: 'carol@contoso.com',
        // Microsoft Graph /me exposes no verification signal → unverified default.
        emailVerified: false,
        oauthServer: 'microsoft',
        oauthId: 'AAD-789',
        oauthData: {
          id: 'AAD-789',
          email: 'carol@contoso.com',
          name: 'Carol',
          picture: undefined,
        },
      })
    })

    it('falls back to APP_ORIGIN when redirectUri is omitted', async () => {
      mockPost.mockResolvedValue({ data: { access_token: 'a', token_type: 'Bearer' } })
      mockGet.mockResolvedValue({ data: { id: 'X', mail: 'x@y.z' } })
      const { verify } = await import('../provider.js')
      await verify('code-1')
      const body = mockPost.mock.calls[0]?.[1] as string
      expect(new URLSearchParams(body).get('redirect_uri')).toBe('http://localhost:3000')
    })

    it('passes its codeVerifier through to the token request body (PKCE redemption)', async () => {
      mockPost.mockResolvedValue({ data: { access_token: 'a', token_type: 'Bearer' } })
      mockGet.mockResolvedValue({ data: { id: 'X', mail: 'x@y.z' } })
      const { verify } = await import('../provider.js')
      const result = await verify('code-1', 'pkce-verifier-abc', 'http://localhost:3000/cb')
      expect(result).not.toBeNull()
      const body = mockPost.mock.calls[0]?.[1] as string
      expect(new URLSearchParams(body).get('code_verifier')).toBe('pkce-verifier-abc')
    })

    it('returns null (NOT a throw) when Microsoft rejects the code with 400 invalid_grant', async () => {
      // The v2.0 token endpoint responds HTTP 400 `{"error":"invalid_grant"}`
      // when it affirmatively rejects the code (AADSTS70008 expired/redeemed,
      // AADSTS501481 verifier mismatch). Per the OAuthVerifier contract that
      // is a `null` return (consumer responds 403), never a throw (which
      // would surface as a misleading 500).
      mockPost.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 400'), {
          response: { status: 400, data: { error: 'invalid_grant' } },
        }),
      )
      const { verify } = await import('../provider.js')
      const result = await verify('forged-code', 'wrong-verifier', 'http://localhost:3000/cb')
      expect(result).toBeNull()
      // Graph /me must never be hit with `Bearer undefined`.
      expect(mockGet).not.toHaveBeenCalled()
      expect(mockLoggerError).not.toHaveBeenCalled()
      expect(mockLoggerWarn).toHaveBeenCalledTimes(1)
    })

    it('rethrows infrastructure failures from the token exchange (never null)', async () => {
      mockPost.mockRejectedValue(new Error('socket hang up'))
      const { verify } = await import('../provider.js')
      await expect(verify('code-1', undefined, 'http://localhost:3000/cb')).rejects.toThrow(
        'socket hang up',
      )
    })

    it('still throws (not null) when a 2xx token response lacks access_token', async () => {
      // Microsoft does not 200-encode failures, so a malformed 2xx is an
      // infrastructure fault — it must NOT be converted to the null path.
      mockPost.mockResolvedValue({ data: { token_type: 'Bearer' } })
      const { verify } = await import('../provider.js')
      await expect(verify('code-1', undefined, 'http://localhost:3000/cb')).rejects.toThrow(
        /access_token/,
      )
      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })

  describe('resolveConfig', () => {
    it('defaults tenantId to "common" and scope to DEFAULT_SCOPE from env-only config', async () => {
      const { resolveConfig, DEFAULT_SCOPE } = await import('../provider.js')
      expect(resolveConfig()).toEqual({
        tenantId: 'common',
        clientId: 'test-ms-client-id',
        clientSecret: 'super-secret-shhh',
        defaultScope: DEFAULT_SCOPE,
      })
    })

    it('falls back to empty credentials when neither overrides nor env are set', async () => {
      delete process.env.OAUTH_MICROSOFT_CLIENT_ID
      delete process.env.OAUTH_MICROSOFT_CLIENT_SECRET
      const { resolveConfig } = await import('../provider.js')
      const cfg = resolveConfig()
      expect(cfg.clientId).toBe('')
      expect(cfg.clientSecret).toBe('')
      expect(cfg.tenantId).toBe('common')
    })

    it('prefers explicit overrides over environment values', async () => {
      const { resolveConfig } = await import('../provider.js')
      expect(
        resolveConfig({
          tenantId: 'org-guid',
          clientId: 'override-client',
          clientSecret: 'override-secret',
          defaultScope: 'openid offline_access',
        }),
      ).toEqual({
        tenantId: 'org-guid',
        clientId: 'override-client',
        clientSecret: 'override-secret',
        defaultScope: 'openid offline_access',
      })
    })
  })

  describe('sanitizeError', () => {
    it('redacts every occurrence of long secrets but leaves short strings alone', async () => {
      const { sanitizeError } = await import('../provider.js')
      const err = new Error('secret=super-secret-shhh again super-secret-shhh code=ab')
      const safe = sanitizeError(err, ['super-secret-shhh', 'ab'])
      expect(safe.message).toBe('secret=[REDACTED] again [REDACTED] code=ab')
    })

    it('carries over the response status without the body', async () => {
      const { sanitizeError } = await import('../provider.js')
      const upstream = Object.assign(new Error('boom'), {
        response: { status: 401, data: { echo: 'super-secret-shhh' } },
      })
      const safe = sanitizeError(upstream, ['super-secret-shhh']) as Error & {
        status?: number
        response?: unknown
      }
      expect(safe.status).toBe(401)
      expect(safe.response).toBeUndefined()
      expect(JSON.stringify(safe)).not.toContain('super-secret-shhh')
    })

    it('stringifies non-Error inputs', async () => {
      const { sanitizeError } = await import('../provider.js')
      const safe = sanitizeError('plain failure super-secret-shhh', ['super-secret-shhh'])
      expect(safe).toBeInstanceOf(Error)
      expect(safe.message).toBe('plain failure [REDACTED]')
    })
  })
})

describe('secret definitions', () => {
  it('registers secret definitions in @molecule/api-secrets on import', async () => {
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    await import('../index.js')
    expect(getSecretDefinition('OAUTH_MICROSOFT_CLIENT_ID')).toBeDefined()
  })
})
