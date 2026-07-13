/**
 * Tests for GitLab OAuth provider.
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

describe('GitLab OAuth Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_GITLAB_CLIENT_ID = 'test-gitlab-client-id'
    process.env.OAUTH_GITLAB_CLIENT_SECRET = 'test-gitlab-client-secret'
    process.env.APP_ORIGIN = 'http://localhost:3000'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('serverName', () => {
    it('should be "gitlab"', async () => {
      const { serverName } = await import('../provider.js')
      expect(serverName).toBe('gitlab')
    })
  })

  describe('verify', () => {
    it('should verify OAuth code and return user props', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'read_user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          username: 'testuser',
          email: 'testuser@example.com',
          confirmed_at: '2020-01-01T00:00:00Z',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('test-auth-code')

      expect(mockPost).toHaveBeenCalledWith(
        'https://gitlab.com/oauth/token',
        // RFC 6749 §4.1.3 requires the token-exchange body to be
        // form-encoded, not JSON — this pins the wire format, not just the
        // logical params.
        'client_id=test-gitlab-client-id&client_secret=test-gitlab-client-secret&code=test-auth-code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A3000',
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000,
        },
      )

      expect(mockGet).toHaveBeenCalledWith('https://gitlab.com/api/v4/user', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
        timeout: 15000,
      })

      expect(result).toEqual({
        username: 'testuser@gitlab',
        email: 'testuser@example.com',
        emailVerified: true,
        oauthServer: 'gitlab',
        oauthId: '12345',
        oauthData: {
          id: 12345,
          username: 'testuser',
          email: 'testuser@example.com',
          confirmed_at: '2020-01-01T00:00:00Z',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      })
    })

    it(
      'form-encodes the token request per RFC 6749 §4.1.3 (was: a plain JS object, which ' +
        '@molecule/api-http JSON-encodes and content-types as application/json — works ' +
        "against a lenient JSON-tolerant mock but GitLab's real Doorkeeper token endpoint " +
        'requires form-encoding)',
      async () => {
        mockPost.mockResolvedValue({
          data: { access_token: 'tok', token_type: 'bearer', scope: 'read_user' },
        })
        mockGet.mockResolvedValue({ data: { id: 1, username: 'a', email: 'a@b.com' } })

        const { verify } = await import('../provider.js')
        await verify('a-code', 'a-verifier')

        const [, body, options] = mockPost.mock.calls[0] as [
          string,
          unknown,
          { headers: Record<string, string> },
        ]
        expect(typeof body).toBe('string')
        expect(body).not.toMatch(/^\s*\{/)
        expect(options.headers['content-type']).toBe('application/x-www-form-urlencoded')
        const parsed = new URLSearchParams(body as string)
        expect(parsed.get('code')).toBe('a-code')
        expect(parsed.get('code_verifier')).toBe('a-verifier')
        expect(parsed.get('grant_type')).toBe('authorization_code')
      },
    )

    it('should report emailVerified=false when GitLab has no confirmed_at', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'test-access-token', token_type: 'bearer', scope: 'read_user' },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          username: 'testuser',
          email: 'unconfirmed@example.com',
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.email).toBe('unconfirmed@example.com')
      expect(result!.emailVerified).toBe(false)
    })

    it('should handle code_verifier for PKCE flow', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'read_user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          username: 'testuser',
          email: 'testuser@example.com',
        },
      })

      const { verify } = await import('../provider.js')

      await verify('test-auth-code', 'test-code-verifier')

      const [, body] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(body).get('code_verifier')).toBe('test-code-verifier')
    })

    it('should handle custom redirect_uri', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'read_user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          username: 'testuser',
          email: 'testuser@example.com',
        },
      })

      const { verify } = await import('../provider.js')

      await verify('test-auth-code', undefined, 'https://custom.example.com')

      const [, body] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(body).get('redirect_uri')).toBe('https://custom.example.com')
    })

    it('should handle user without email', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'read_user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          username: 'testuser',
          email: null,
          name: 'Test User',
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.email).toBeUndefined()
      expect(result!.username).toBe('testuser@gitlab')
    })

    it('should handle user without id', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'read_user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: null,
          username: 'testuser',
          email: 'testuser@example.com',
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.oauthId).toBe('')
    })

    it('should handle token exchange failure', async () => {
      mockPost.mockRejectedValue(new Error('Invalid code'))

      const { verify } = await import('../provider.js')

      await expect(verify('invalid-code')).rejects.toThrow('Invalid code')
    })

    it('should handle user info fetch failure', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'read_user',
        },
      })

      mockGet.mockRejectedValue(new Error('User not found'))

      const { verify } = await import('../provider.js')

      await expect(verify('test-auth-code')).rejects.toThrow('User not found')
    })

    it('returns null (NOT a throw) when the token endpoint rejects with HTTP 400 invalid_grant', async () => {
      // GitLab's token endpoint (Doorkeeper) responds HTTP 400 with
      // `{ "error": "invalid_grant" }` for a bad/expired/reused code — the
      // provider affirmatively rejecting it. Per the OAuthVerifier contract
      // that is a `null` return (consumer responds 403), never a throw
      // (which would surface as a misleading 500).
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_grant', error_description: 'Code expired or already used' },
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('expired-code')

      expect(result).toBeNull()
      // The user-info endpoint must never be hit after a rejected exchange.
      expect(mockGet).not.toHaveBeenCalled()
      // A rejected code is a client-side event — warn, never error.
      expect(mockLoggerError).not.toHaveBeenCalled()
      expect(mockLoggerWarn).toHaveBeenCalledWith('GitLab OAuth code exchange rejected', {
        error: 'invalid_grant',
      })
    })

    it('returns null when a 200 token response carries no access_token', async () => {
      // Defensive: never call the user endpoint with `Bearer undefined`.
      mockPost.mockResolvedValue({
        data: { error: 'invalid_request' },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('weird-code')

      expect(result).toBeNull()
      expect(mockGet).not.toHaveBeenCalled()
      expect(mockLoggerError).not.toHaveBeenCalled()
      expect(mockLoggerWarn).toHaveBeenCalled()
    })

    it('still throws (does not return null) for a 400 that is not invalid_grant', async () => {
      // Only the provider's affirmative code rejection maps to null; any
      // other 4xx/5xx keeps the sanitize + rethrow (infrastructure) path.
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_client' },
        },
      })

      const { verify } = await import('../provider.js')

      await expect(verify('some-code')).rejects.toBeDefined()
      expect(mockLoggerError).toHaveBeenCalled()
    })

    it('should handle unauthorized access token', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'invalid-token',
          token_type: 'bearer',
          scope: 'read_user',
        },
      })

      mockGet.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'invalid_token' },
        },
      })

      const { verify } = await import('../provider.js')

      await expect(verify('test-auth-code')).rejects.toBeDefined()
    })

    it('should honour OAUTH_GITLAB_TOKEN_URL / OAUTH_GITLAB_USER_URL overrides', async () => {
      process.env.OAUTH_GITLAB_TOKEN_URL = 'http://127.0.0.1:9999/token'
      process.env.OAUTH_GITLAB_USER_URL = 'http://127.0.0.1:9999/user'

      mockPost.mockResolvedValue({
        data: { access_token: 'mock-token', token_type: 'bearer', scope: 'read_user' },
      })
      mockGet.mockResolvedValue({
        data: { id: 999, username: 'mockuser', email: 'mock@example.com' },
      })

      const { verify } = await import('../provider.js')
      await verify('mock-auth-code')

      const [, postBody] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(postBody).get('code')).toBe('mock-auth-code')
      expect(mockGet).toHaveBeenCalledWith(
        'http://127.0.0.1:9999/user',
        expect.objectContaining({
          headers: expect.objectContaining({ authorization: 'Bearer mock-token' }),
        }),
      )
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
          scope: 'read_user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          username: 'testuser',
          email: 'testuser@example.com',
        },
      })

      const { verify } = await import('../provider.js')

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
      // NOTE: deliberately NOT `invalid_grant` — a 400 invalid_grant now maps
      // to the null-return (rejected code) path; this test exercises the
      // sanitize + rethrow path for every OTHER failure.
      const leak = Object.assign(
        new Error('token exchange failed for client_secret=test-gitlab-client-secret'),
        {
          request: {
            url: 'https://gitlab.com/oauth/token',
            method: 'POST',
            body: { client_secret: 'test-gitlab-client-secret', code: 'attacker-code' },
            headers: { authorization: 'Basic dGVzdA==' },
          },
          response: { status: 400, data: { error: 'invalid_client' } },
        },
      )
      mockPost.mockRejectedValue(leak)

      const { verify } = await import('../provider.js')

      let thrown: unknown
      await expect(
        verify('attacker-code').catch((error: unknown) => {
          thrown = error
          throw error
        }),
      ).rejects.toBeDefined()

      for (const s of loggedStrings()) {
        expect(s).not.toContain('test-gitlab-client-secret')
      }
      expect(loggedStrings().some((s) => s.includes('GitLab OAuth verify error'))).toBe(true)

      expect((thrown as { request?: unknown }).request).toBeUndefined()
      expect(`${(thrown as Error).message} ${JSON.stringify(thrown)}`).not.toContain(
        'test-gitlab-client-secret',
      )
    })

    it('still resolves a legitimate verify without logging an error', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'tok', token_type: 'bearer', scope: 'read_user' },
      })
      mockGet.mockResolvedValue({
        data: { id: 7, username: 'legit', email: 'legit@example.com', confirmed_at: '2020-01-01' },
      })

      const { verify } = await import('../provider.js')
      const result = await verify('good-code')

      expect(result).not.toBeNull()
      expect(result!.username).toBe('legit@gitlab')
      expect(mockLoggerError).not.toHaveBeenCalled()
    })
  })

  describe('getAuthorizeUrl', () => {
    it('builds the GitLab authorize URL with client_id, state, redirect_uri, response_type, scope, and PKCE', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')

      const raw = getAuthorizeUrl({
        redirectUri: 'http://localhost:5173/login',
        state: 'state-abc',
        codeChallenge: 'challenge-xyz',
        codeChallengeMethod: 'S256',
      })

      expect(raw).not.toBeNull()
      const url = new URL(raw!)
      expect(url.origin + url.pathname).toBe('https://gitlab.com/oauth/authorize')
      expect(url.searchParams.get('client_id')).toBe('test-gitlab-client-id')
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/login')
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('state')).toBe('state-abc')
      expect(url.searchParams.get('scope')).toBe('read_user')
      expect(url.searchParams.get('code_challenge')).toBe('challenge-xyz')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('omits redirect_uri when absent so GitLab uses its registered redirect URI', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')

      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'c' })

      expect(raw).not.toBeNull()
      expect(new URL(raw!).searchParams.has('redirect_uri')).toBe(false)
    })

    it('defaults the PKCE method to S256 when a challenge is given without one', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')

      const raw = getAuthorizeUrl({ state: 's', codeChallenge: 'c' })

      expect(new URL(raw!).searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('returns null when OAUTH_GITLAB_CLIENT_ID is unset (unconfigured, not a crash)', async () => {
      delete process.env.OAUTH_GITLAB_CLIENT_ID

      const { getAuthorizeUrl } = await import('../provider.js')

      expect(getAuthorizeUrl({ state: 's' })).toBeNull()
    })

    it('honours the OAUTH_GITLAB_AUTHORIZE_URL override (self-managed GitLab)', async () => {
      process.env.OAUTH_GITLAB_AUTHORIZE_URL = 'https://gitlab.example.com/oauth/authorize'

      const { getAuthorizeUrl } = await import('../provider.js')

      const raw = getAuthorizeUrl({ state: 's' })
      expect(raw).not.toBeNull()
      expect(raw!.startsWith('https://gitlab.example.com/oauth/authorize?')).toBe(true)
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
    expect(getSecretDefinition('OAUTH_GITLAB_CLIENT_ID')).toBeDefined()
  })
})
