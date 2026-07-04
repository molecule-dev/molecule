/**
 * Tests for Twitter OAuth provider.
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

describe('Twitter OAuth Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_TWITTER_CLIENT_ID = 'test-twitter-client-id'
    process.env.OAUTH_TWITTER_CLIENT_SECRET = 'test-twitter-client-secret'
    process.env.APP_ORIGIN = 'http://localhost:3000'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('serverName', () => {
    it('should be "twitter"', async () => {
      const { serverName } = await import('../verify.js')
      expect(serverName).toBe('twitter')
    })
  })

  describe('verify', () => {
    it('should verify OAuth code and return user props', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          data: {
            id: '12345678901234567890',
            username: 'testuser',
            name: 'Test User',
            email: 'testuser@example.com',
          },
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      // Check that Basic auth header is used
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.twitter.com/2/oauth2/token',
        {
          client_id: 'test-twitter-client-id',
          code: 'test-auth-code',
          code_verifier: undefined,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:3000',
        },
        {
          headers: {
            Authorization: expect.stringContaining('Basic '),
            accept: 'application/json',
          },
          timeout: 15000,
        },
      )

      expect(mockGet).toHaveBeenCalledWith('https://api.twitter.com/2/users/me', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
        timeout: 15000,
      })

      expect(result).toEqual({
        username: 'testuser@twitter',
        email: 'testuser@example.com',
        // Twitter exposes no email-verification signal → unverified default.
        emailVerified: false,
        oauthServer: 'twitter',
        oauthId: '12345678901234567890',
        oauthData: {
          id: '12345678901234567890',
          username: 'testuser',
          name: 'Test User',
          email: 'testuser@example.com',
        },
      })
    })

    it('should use Basic auth with base64 encoded credentials', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          data: {
            id: '12345678901234567890',
            username: 'testuser',
          },
        },
      })

      const { verify } = await import('../verify.js')

      await verify('test-auth-code')

      const expectedAuth = Buffer.from(
        'test-twitter-client-id:test-twitter-client-secret',
      ).toString('base64')
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.twitter.com/2/oauth2/token',
        expect.anything(),
        {
          headers: {
            Authorization: `Basic ${expectedAuth}`,
            accept: 'application/json',
          },
          timeout: 15000,
        },
      )
    })

    it('should handle code_verifier for PKCE flow', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          data: {
            id: '12345678901234567890',
            username: 'testuser',
          },
        },
      })

      const { verify } = await import('../verify.js')

      await verify('test-auth-code', 'test-code-verifier')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.twitter.com/2/oauth2/token',
        expect.objectContaining({
          code_verifier: 'test-code-verifier',
        }),
        expect.anything(),
      )
    })

    it('should handle custom redirect_uri', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          data: {
            id: '12345678901234567890',
            username: 'testuser',
          },
        },
      })

      const { verify } = await import('../verify.js')

      await verify('test-auth-code', undefined, 'https://custom.example.com')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.twitter.com/2/oauth2/token',
        expect.objectContaining({
          redirect_uri: 'https://custom.example.com',
        }),
        expect.anything(),
      )
    })

    it('should handle user without email', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          data: {
            id: '12345678901234567890',
            username: 'testuser',
            name: 'Test User',
            email: null,
          },
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.email).toBeUndefined()
      expect(result!.username).toBe('testuser@twitter')
    })

    it('should handle user without id', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          data: {
            id: null,
            username: 'testuser',
          },
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
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockRejectedValue(new Error('User not found'))

      const { verify } = await import('../verify.js')

      await expect(verify('test-auth-code')).rejects.toThrow('User not found')
    })

    it('should handle invalid grant error', async () => {
      // NOTE: this description does NOT match X's real rejected-code message
      // (it lacks the words "authorization code"), so the deliberately-narrow
      // rejected-code guard leaves it on the throw path.
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_request', error_description: 'Code expired or already used' },
        },
      })

      const { verify } = await import('../verify.js')

      await expect(verify('expired-code')).rejects.toBeDefined()
    })

    it('returns null (NOT a throw) when X rejects the code — 400 invalid_request with the authorization-code description', async () => {
      // X's token endpoint responds HTTP 400 `invalid_request` (rather than
      // the RFC 6749 `invalid_grant`) with this exact description when the
      // code is forged/expired/reused — the provider AFFIRMATIVELY rejecting
      // the code. Per the OAuthVerifier contract that is a `null` return
      // (consumer responds 403), never a throw (which would surface as a
      // misleading 500).
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'invalid_request',
            error_description: 'Value passed for the authorization code was invalid, or expired.',
          },
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('forged-code')

      expect(result).toBeNull()
      // The user-info endpoint must never be hit after a rejected exchange.
      expect(mockGet).not.toHaveBeenCalled()
      // A rejected code is a client-side event — warn, never error.
      expect(mockLoggerError).not.toHaveBeenCalled()
      expect(mockLoggerWarn).toHaveBeenCalled()
    })

    it('returns null for an RFC 6749 invalid_grant rejection', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_grant' },
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('expired-code')

      expect(result).toBeNull()
      expect(mockGet).not.toHaveBeenCalled()
      expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it('still throws for a 400 invalid_request with an unrelated error_description (malformed request — a bug)', async () => {
      // A missing parameter is OUR bug, not the provider rejecting the user's
      // code — it must stay on the throw path (surfaces as a 500), never be
      // silently converted into a 403.
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'invalid_request',
            error_description: 'Missing required parameter: redirect_uri',
          },
        },
      })

      const { verify } = await import('../verify.js')

      await expect(verify('test-auth-code')).rejects.toBeDefined()
      expect(mockLoggerError).toHaveBeenCalled()
    })

    it('returns null when a 200 token response lacks an access_token (never Bearer undefined)', async () => {
      mockPost.mockResolvedValue({
        data: {
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(result).toBeNull()
      expect(mockGet).not.toHaveBeenCalled()
      expect(mockLoggerError).not.toHaveBeenCalled()
      expect(mockLoggerWarn).toHaveBeenCalled()
    })

    it('should handle unauthorized access token', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'invalid-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockRejectedValue({
        response: {
          status: 401,
          data: { title: 'Unauthorized', detail: 'Invalid token' },
        },
      })

      const { verify } = await import('../verify.js')

      await expect(verify('test-auth-code')).rejects.toBeDefined()
    })

    it('should handle rate limit error', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockRejectedValue({
        response: {
          status: 429,
          data: { title: 'Too Many Requests', detail: 'Rate limit exceeded' },
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
          scope: 'users.read tweet.read',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          data: {
            id: '12345678901234567890',
            username: 'testuser',
          },
        },
      })

      const { verify } = await import('../verify.js')

      await verify('test-auth-code')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.twitter.com/2/oauth2/token',
        expect.objectContaining({
          redirect_uri: 'https://myapp.example.com',
        }),
        expect.anything(),
      )
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
      // For Twitter the secret rides in the Basic Authorization header; the
      // HttpError attaches that header and, here, echoes the secret in the
      // message too.
      const leak = Object.assign(
        new Error('token exchange failed for client_secret=test-twitter-client-secret'),
        {
          request: {
            url: 'https://api.twitter.com/2/oauth2/token',
            method: 'POST',
            body: { code: 'attacker-code', grant_type: 'authorization_code' },
            headers: {
              Authorization: `Basic ${Buffer.from('id:test-twitter-client-secret').toString('base64')}`,
            },
          },
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
        expect(s).not.toContain('test-twitter-client-secret')
      }
      expect(loggedStrings().some((s) => s.includes('Twitter OAuth verify error'))).toBe(true)

      expect((thrown as { request?: unknown }).request).toBeUndefined()
      expect(`${(thrown as Error).message} ${JSON.stringify(thrown)}`).not.toContain(
        'test-twitter-client-secret',
      )
    })

    it('still resolves a legitimate verify without logging an error', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'tok', token_type: 'bearer', scope: 'users.read' },
      })
      mockGet.mockResolvedValue({
        data: { data: { id: '7', username: 'legit' } },
      })

      const { verify } = await import('../verify.js')
      const result = await verify('good-code')

      expect(result).not.toBeNull()
      expect(result!.username).toBe('legit@twitter')
      expect(mockLoggerError).not.toHaveBeenCalled()
    })
  })

  describe('getAuthorizeUrl', () => {
    it('builds the X authorize URL with response_type, client_id, redirect_uri, scope, state, and PKCE', async () => {
      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({
        redirectUri: 'http://localhost:5173/login',
        state: 'state-abc',
        codeChallenge: 'challenge-xyz',
        codeChallengeMethod: 'S256',
      })

      expect(raw).not.toBeNull()
      const url = new URL(raw!)
      expect(url.origin + url.pathname).toBe('https://x.com/i/oauth2/authorize')
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('client_id')).toBe('test-twitter-client-id')
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/login')
      // Exactly what verify's GET /2/users/me requires — deliberately no
      // offline.access (verify never refreshes tokens).
      expect(url.searchParams.get('scope')).toBe('users.read tweet.read')
      expect(url.searchParams.get('state')).toBe('state-abc')
      expect(url.searchParams.get('code_challenge')).toBe('challenge-xyz')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('omits redirect_uri when absent so X uses the registered callback URL', async () => {
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

    it('returns null when OAUTH_TWITTER_CLIENT_ID is unset (unconfigured, not a crash)', async () => {
      delete process.env.OAUTH_TWITTER_CLIENT_ID

      const { getAuthorizeUrl } = await import('../authorize.js')

      expect(getAuthorizeUrl({ state: 's' })).toBeNull()
    })

    it('honours the OAUTH_TWITTER_AUTHORIZE_URL override (E2E mocks)', async () => {
      process.env.OAUTH_TWITTER_AUTHORIZE_URL = 'http://127.0.0.1:9999/i/oauth2/authorize'

      const { getAuthorizeUrl } = await import('../authorize.js')

      const raw = getAuthorizeUrl({ state: 's' })
      expect(raw).not.toBeNull()
      expect(raw!.startsWith('http://127.0.0.1:9999/i/oauth2/authorize?')).toBe(true)
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
    expect(getSecretDefinition('OAUTH_TWITTER_CLIENT_ID')).toBeDefined()
  })
})
