/**
 * Tests for Google OAuth provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @molecule/api-http before importing the module
const mockPost = vi.fn()
const mockGet = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerWarn = vi.fn()

vi.mock('@molecule/api-http', () => ({
  post: mockPost,
  get: mockGet,
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: mockLoggerWarn,
    error: mockLoggerError,
  }),
}))

vi.mock('@molecule/api-oauth', () => ({
  // Type exports only, no runtime values needed
}))

describe('Google OAuth Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-google-client-id'
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
    process.env.APP_ORIGIN = 'http://localhost:3000'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('serverName', () => {
    it('should be "google"', async () => {
      const { serverName } = await import('../verify.js')
      expect(serverName).toBe('google')
    })
  })

  describe('verify', () => {
    it('should verify OAuth code and return user props', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          sub: '123456789',
          email: 'testuser@gmail.com',
          email_verified: true,
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(mockPost).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v4/token',
        // RFC 6749 §4.1.3 requires the token-exchange body to be
        // form-encoded, not JSON — this pins the wire format, not just the
        // logical params.
        'client_id=test-google-client-id&client_secret=test-google-client-secret&code=test-auth-code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A3000',
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000,
        },
      )

      expect(mockGet).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
        timeout: 15000,
      })

      expect(result).toEqual({
        username: 'testuser@gmail.com@google',
        email: 'testuser@gmail.com',
        emailVerified: true,
        oauthServer: 'google',
        oauthId: '123456789',
        oauthData: {
          sub: '123456789',
          email: 'testuser@gmail.com',
          email_verified: true,
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        },
      })
    })

    it(
      'form-encodes the token request per RFC 6749 §4.1.3 (was: a plain JS object, which ' +
        '@molecule/api-http JSON-encodes and content-types as application/json — works ' +
        "against a lenient JSON-tolerant mock but Google's real token endpoint requires " +
        'form-encoding)',
      async () => {
        mockPost.mockResolvedValue({
          data: { access_token: 'tok', token_type: 'bearer', scope: 'openid email' },
        })
        mockGet.mockResolvedValue({ data: { sub: 'sub-1', email: 'a@b.com' } })

        const { verify } = await import('../verify.js')
        await verify('a-code', 'a-verifier')

        const [, body, options] = mockPost.mock.calls[0] as [
          string,
          unknown,
          { headers: Record<string, string> },
        ]
        expect(typeof body).toBe('string')
        expect(body).not.toMatch(/^\s*\{/) // not a JSON object body
        expect(options.headers['content-type']).toBe('application/x-www-form-urlencoded')
        // A form-encoded body round-trips cleanly through URLSearchParams.
        const parsed = new URLSearchParams(body as string)
        expect(parsed.get('code')).toBe('a-code')
        expect(parsed.get('code_verifier')).toBe('a-verifier')
        expect(parsed.get('grant_type')).toBe('authorization_code')
      },
    )

    it('should report emailVerified=false when Google has not verified the email', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          sub: '123456789',
          email: 'unverified@gmail.com',
          email_verified: false,
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.email).toBe('unverified@gmail.com')
      expect(result!.emailVerified).toBe(false)
    })

    it('should handle code_verifier for PKCE flow', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          sub: '123456789',
          email: 'testuser@gmail.com',
        },
      })

      const { verify } = await import('../verify.js')

      await verify('test-auth-code', 'test-code-verifier')

      const [, body] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(body).get('code_verifier')).toBe('test-code-verifier')
    })

    it('should handle custom redirect_uri', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          sub: '123456789',
          email: 'testuser@gmail.com',
        },
      })

      const { verify } = await import('../verify.js')

      await verify('test-auth-code', undefined, 'https://custom.example.com')

      const [, body] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(body).get('redirect_uri')).toBe('https://custom.example.com')
    })

    it('should handle user without email', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid profile',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          sub: '123456789',
          email: null,
          name: 'Test User',
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.email).toBeUndefined()
      expect(result!.username).toBe('123456789@google')
    })

    it('should handle user without sub', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          sub: null,
          email: 'testuser@gmail.com',
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.oauthId).toBe('')
    })

    it('should handle token exchange failure', async () => {
      mockPost.mockRejectedValue(new Error('Invalid code'))

      const { verify } = await import('../verify.js')

      await expect(verify('invalid-code')).rejects.toThrow('Invalid code')
    })

    it('should handle user info fetch failure', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockRejectedValue(new Error('User not found'))

      const { verify } = await import('../verify.js')

      await expect(verify('test-auth-code')).rejects.toThrow('User not found')
    })

    it('returns null (NOT a throw) when Google rejects the code with 400 invalid_grant', async () => {
      // Google's token endpoint responds HTTP 400 `{"error":"invalid_grant"}`
      // for a bad/expired/already-redeemed code (and PKCE verifier mismatch)
      // — the provider affirmatively rejecting the code. Per the
      // OAuthVerifier contract that is a `null` return (consumer responds
      // 403), never a throw (which would surface as a misleading 500).
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_grant', error_description: 'Code expired or already used' },
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('expired-code')

      expect(result).toBeNull()
      // The userinfo endpoint must never be hit after a rejected exchange.
      expect(mockGet).not.toHaveBeenCalled()
      // A rejected code is a client-side event: warn, never error.
      expect(mockLoggerWarn).toHaveBeenCalled()
      expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it('still throws for a 400 that is NOT invalid_grant (misconfiguration, not a rejected code)', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_request', error_description: 'Missing required parameter' },
        },
      })

      const { verify } = await import('../verify.js')

      await expect(verify('some-code')).rejects.toBeDefined()
      expect(mockLoggerError).toHaveBeenCalled()
    })

    it('returns null when a 200 token response has no access_token (never Bearer undefined)', async () => {
      mockPost.mockResolvedValue({
        data: {
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(result).toBeNull()
      // The userinfo endpoint must never be called with `Bearer undefined`.
      expect(mockGet).not.toHaveBeenCalled()
      expect(mockLoggerWarn).toHaveBeenCalled()
      expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it('should handle unauthorized access token', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'invalid-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'invalid_token' },
        },
      })

      const { verify } = await import('../verify.js')

      await expect(verify('test-auth-code')).rejects.toBeDefined()
    })
  })

  describe('environment variable handling', () => {
    it('should use APP_ORIGIN as default redirect_uri', async () => {
      process.env.APP_ORIGIN = 'https://myapp.example.com'
      vi.resetModules()

      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'openid email profile',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          sub: '123456789',
          email: 'testuser@gmail.com',
        },
      })

      const { verify } = await import('../verify.js')

      await verify('test-auth-code')

      const [, body] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(body).get('redirect_uri')).toBe('https://myapp.example.com')
    })
  })

  describe('verify error logging (CWE-532 — no secret leak)', () => {
    const loggedStrings = (): string[] =>
      mockLoggerError.mock.calls.flat().map((arg) => {
        if (typeof arg === 'string') return arg
        if (arg instanceof Error) return `${arg.message} ${JSON.stringify(arg)}`
        return JSON.stringify(arg)
      })

    it('redacts client_secret from logged output and the rethrown error on token-exchange failure', async () => {
      const leak = Object.assign(
        new Error('token exchange failed for client_secret=test-google-client-secret'),
        {
          request: {
            url: 'https://www.googleapis.com/oauth2/v4/token',
            method: 'POST',
            body: { client_secret: 'test-google-client-secret', code: 'attacker-code' },
            headers: { authorization: 'Basic dGVzdA==' },
          },
          // NOT invalid_grant — that would be the provider rejecting the code
          // (null return, no log). This exercises the sanitize-and-throw path.
          response: { status: 400, data: { error: 'invalid_request' } },
        },
      )
      mockPost.mockRejectedValue(leak)

      const { verify } = await import('../verify.js')

      let thrown: unknown
      await expect(
        verify('attacker-code').catch((error: unknown) => {
          thrown = error
          throw error
        }),
      ).rejects.toBeDefined()

      for (const s of loggedStrings()) {
        expect(s).not.toContain('test-google-client-secret')
      }
      expect(loggedStrings().some((s) => s.includes('Google OAuth verify error'))).toBe(true)

      expect((thrown as { request?: unknown }).request).toBeUndefined()
      expect(`${(thrown as Error).message} ${JSON.stringify(thrown)}`).not.toContain(
        'test-google-client-secret',
      )
    })

    it('still resolves a legitimate verify without logging an error', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'tok', token_type: 'bearer', scope: 'openid email' },
      })
      mockGet.mockResolvedValue({
        data: { sub: 'sub-7', email: 'legit@example.com', email_verified: true },
      })

      const { verify } = await import('../verify.js')
      const result = await verify('good-code')

      expect(result).not.toBeNull()
      expect(result!.username).toBe('legit@example.com@google')
      expect(mockLoggerError).not.toHaveBeenCalled()
    })
  })

  describe('getAuthorizeUrl', () => {
    it('builds the Google authorize URL with client_id, state, redirect_uri, OpenID scopes, and PKCE', async () => {
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({
        redirectUri: 'http://localhost:5173/login',
        state: 'state-abc',
        codeChallenge: 'challenge-xyz',
        codeChallengeMethod: 'S256',
      })

      expect(raw).not.toBeNull()
      const url = new URL(raw!)
      expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
      expect(url.searchParams.get('client_id')).toBe('test-google-client-id')
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/login')
      expect(url.searchParams.get('response_type')).toBe('code')
      // Exactly what verify's OpenID userinfo call expects (email + email_verified).
      expect(url.searchParams.get('scope')).toBe('openid email profile')
      expect(url.searchParams.get('state')).toBe('state-abc')
      expect(url.searchParams.get('code_challenge')).toBe('challenge-xyz')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      // Deliberately absent: verify uses the access token exactly once and
      // never stores a refresh token, so no standing offline access is asked.
      expect(url.searchParams.has('access_type')).toBe(false)
    })

    it('omits redirect_uri when absent so Google uses the registered callback URL', async () => {
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'c' })

      expect(raw).not.toBeNull()
      expect(new URL(raw!).searchParams.has('redirect_uri')).toBe(false)
    })

    it('defaults the PKCE method to S256 when a challenge is given without one', async () => {
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'c' })

      expect(new URL(raw!).searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('returns null when OAUTH_GOOGLE_CLIENT_ID is unset (unconfigured, not a crash)', async () => {
      delete process.env.OAUTH_GOOGLE_CLIENT_ID

      const { getAuthorizeUrl } = await import('../authorize.js')

      expect(getAuthorizeUrl({ state: 's' })).toBeNull()
    })

    it('honours the OAUTH_GOOGLE_AUTHORIZE_URL override (E2E mocks / proxies)', async () => {
      process.env.OAUTH_GOOGLE_AUTHORIZE_URL = 'http://127.0.0.1:9999/authorize'

      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({ state: 's' })
      expect(raw).not.toBeNull()
      expect(raw!.startsWith('http://127.0.0.1:9999/authorize?')).toBe(true)
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.serverName).toBeDefined()
      expect(exports.verify).toBeDefined()
      expect(exports.getAuthorizeUrl).toBeDefined()
    })
  })
})

describe('secret definitions', () => {
  it('registers secret definitions in @molecule/api-secrets on import', async () => {
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    await import('../index.js')
    expect(getSecretDefinition('OAUTH_GOOGLE_CLIENT_ID')).toBeDefined()
  })
})
