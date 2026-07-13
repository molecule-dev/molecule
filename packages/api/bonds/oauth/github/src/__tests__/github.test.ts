/**
 * Tests for GitHub OAuth provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @molecule/api-http before importing the module
const mockPost = vi.fn()
const mockGet = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@molecule/api-http', () => ({
  post: mockPost,
  get: mockGet,
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: mockLoggerError,
  }),
}))

vi.mock('@molecule/api-oauth', () => ({
  // Type exports only, no runtime values needed
}))

describe('GitHub OAuth Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_GITHUB_CLIENT_ID = 'test-github-client-id'
    process.env.OAUTH_GITHUB_CLIENT_SECRET = 'test-github-client-secret'
    process.env.APP_ORIGIN = 'http://localhost:3000'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('serverName', () => {
    it('should be "github"', async () => {
      const { serverName } = await import('../provider.js')
      expect(serverName).toBe('github')
    })
  })

  describe('verify', () => {
    it('should verify OAuth code and return user props', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          login: 'testuser',
          email: 'testuser@example.com',
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('test-auth-code')

      expect(mockPost).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        // RFC 6749 §4.1.3 requires the token-exchange body to be
        // form-encoded, not JSON — this pins the wire format, not just the
        // logical params. `redirect_uri` now defaults to APP_ORIGIN, matching
        // every other bond (was previously omitted entirely).
        'client_id=test-github-client-id&client_secret=test-github-client-secret&code=test-auth-code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A3000',
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000,
        },
      )

      expect(mockGet).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
        timeout: 15000,
      })

      expect(result).toEqual({
        username: 'testuser@github',
        email: 'testuser@example.com',
        // GitHub only allows a verified address to be the public profile email,
        // so a present `/user.email` is verified by construction.
        emailVerified: true,
        oauthServer: 'github',
        oauthId: '12345',
        oauthData: {
          id: 12345,
          login: 'testuser',
          email: 'testuser@example.com',
        },
      })
    })

    it(
      'form-encodes the token request per RFC 6749 §4.1.3 (was: a plain JS object, which ' +
        "@molecule/api-http JSON-encodes and content-types as application/json — GitHub's " +
        'docs support JSON, but form-encoding matches every other molecule.dev OAuth bond)',
      async () => {
        mockPost.mockResolvedValue({
          data: { access_token: 'tok', token_type: 'bearer', scope: 'user' },
        })
        mockGet.mockResolvedValue({ data: { id: 1, login: 'a', email: 'a@b.com' } })

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

    it('should handle code_verifier for PKCE flow', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          login: 'testuser',
          email: 'testuser@example.com',
        },
      })

      const { verify } = await import('../provider.js')

      await verify('test-auth-code', 'test-code-verifier')

      const [, body] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(body).get('code_verifier')).toBe('test-code-verifier')
    })

    it(
      'accepts a third redirectUri argument and includes redirect_uri in the token exchange ' +
        '(was: ignored entirely — the verify signature was (code, codeVerifier) only, and ' +
        'no redirect_uri was ever sent, which a redirect_uri-enforcing GitHub Enterprise ' +
        'instance or strict proxy would reject with an error unrelated to the real cause)',
      async () => {
        mockPost.mockResolvedValue({
          data: { access_token: 'tok', token_type: 'bearer', scope: 'user' },
        })
        mockGet.mockResolvedValue({ data: { id: 1, login: 'a', email: 'a@b.com' } })

        const { verify } = await import('../provider.js')
        await verify('a-code', undefined, 'https://custom.example.com/callback')

        const [, body] = mockPost.mock.calls[0] as [string, string]
        expect(new URLSearchParams(body).get('redirect_uri')).toBe(
          'https://custom.example.com/callback',
        )
      },
    )

    it('falls back to APP_ORIGIN for redirect_uri when redirectUri is omitted', async () => {
      process.env.APP_ORIGIN = 'https://myapp.example.com'
      vi.resetModules()

      mockPost.mockResolvedValue({
        data: { access_token: 'tok', token_type: 'bearer', scope: 'user' },
      })
      mockGet.mockResolvedValue({ data: { id: 1, login: 'a', email: 'a@b.com' } })

      const { verify } = await import('../provider.js')
      await verify('a-code')

      const [, body] = mockPost.mock.calls[0] as [string, string]
      expect(new URLSearchParams(body).get('redirect_uri')).toBe('https://myapp.example.com')
    })

    it('should handle user without email', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: 12345,
          login: 'testuser',
          email: null,
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('test-auth-code')

      expect(result).not.toBeNull()
      expect(result!.email).toBeUndefined()
      expect(result!.username).toBe('testuser@github')
      // No public email → cannot affirm verification → unverified default.
      expect(result!.emailVerified).toBe(false)
    })

    it('should handle user without id', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'user',
        },
      })

      mockGet.mockResolvedValue({
        data: {
          id: null,
          login: 'testuser',
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

    it('returns null (NOT a throw) when GitHub rejects the code in a 200 body', async () => {
      // GitHub's token endpoint responds HTTP 200 with the failure in the
      // body for a bad/forged/expired code — the provider affirmatively
      // rejecting the code. Per the OAuthVerifier contract that is a `null`
      // return (consumer responds 403), never a throw (which would surface
      // as a misleading 500).
      mockPost.mockResolvedValue({
        data: {
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired.',
        },
      })

      const { verify } = await import('../provider.js')

      const result = await verify('forged-code')

      expect(result).toBeNull()
      // The user-info endpoint must never be hit with `Bearer undefined`.
      expect(mockGet).not.toHaveBeenCalled()
      expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it('should handle user info fetch failure', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'user',
        },
      })

      mockGet.mockRejectedValue(new Error('User not found'))

      const { verify } = await import('../provider.js')

      await expect(verify('test-auth-code')).rejects.toThrow('User not found')
    })

    it('should handle API rate limiting', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'user',
        },
      })

      mockGet.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
        },
      })

      const { verify } = await import('../provider.js')

      await expect(verify('test-auth-code')).rejects.toBeDefined()
    })

    it('should handle unauthorized access token', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'invalid-token',
          token_type: 'bearer',
          scope: 'user',
        },
      })

      mockGet.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Bad credentials' },
        },
      })

      const { verify } = await import('../provider.js')

      await expect(verify('test-auth-code')).rejects.toBeDefined()
    })

    it('should honour OAUTH_GITHUB_TOKEN_URL / OAUTH_GITHUB_USER_URL overrides', async () => {
      process.env.OAUTH_GITHUB_TOKEN_URL = 'http://127.0.0.1:9999/token'
      process.env.OAUTH_GITHUB_USER_URL = 'http://127.0.0.1:9999/user'

      mockPost.mockResolvedValue({
        data: { access_token: 'mock-token', token_type: 'bearer', scope: 'user' },
      })
      mockGet.mockResolvedValue({
        data: { id: 999, login: 'mockuser', email: 'mock@example.com' },
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

  describe('verify error logging (CWE-532 — no secret leak)', () => {
    /** Collect every string surfaced through logger.error / thrown error. */
    const loggedStrings = (): string[] =>
      mockLoggerError.mock.calls.flat().map((arg) => {
        if (typeof arg === 'string') return arg
        if (arg instanceof Error) return `${arg.message} ${JSON.stringify(arg)}`
        return JSON.stringify(arg)
      })

    it('redacts client_secret from logged output and the rethrown error on token-exchange failure', async () => {
      // Simulate the HttpError @molecule/api-http throws: its message carries
      // the secret, and the token POST body / auth header are attached.
      const leak = Object.assign(
        new Error('token exchange failed for client_secret=test-github-client-secret'),
        {
          request: {
            url: 'https://github.com/login/oauth/access_token',
            method: 'POST',
            body: { client_secret: 'test-github-client-secret', code: 'attacker-code' },
            headers: { authorization: 'Basic dGVzdA==' },
          },
          response: { status: 400, data: { error: 'invalid_grant' } },
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

      // Nothing handed to logger.error may contain the secret.
      for (const s of loggedStrings()) {
        expect(s).not.toContain('test-github-client-secret')
      }
      // The prefix is still logged so failures remain diagnosable.
      expect(loggedStrings().some((s) => s.includes('GitHub OAuth verify error'))).toBe(true)

      // The rethrown error must be the scrubbed copy: no attached request body
      // and no secret anywhere in its serialization.
      expect((thrown as { request?: unknown }).request).toBeUndefined()
      expect(`${(thrown as Error).message} ${JSON.stringify(thrown)}`).not.toContain(
        'test-github-client-secret',
      )
    })

    it('still resolves a legitimate verify without logging an error', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'tok', token_type: 'bearer', scope: 'user' },
      })
      mockGet.mockResolvedValue({
        data: { id: 7, login: 'legit', email: 'legit@example.com' },
      })

      const { verify } = await import('../provider.js')
      const result = await verify('good-code')

      expect(result).not.toBeNull()
      expect(result!.username).toBe('legit@github')
      expect(mockLoggerError).not.toHaveBeenCalled()
    })
  })

  describe('getAuthorizeUrl', () => {
    it('builds the GitHub authorize URL with client_id, state, redirect_uri, scopes, and PKCE', async () => {
      const { getAuthorizeUrl } = await import('../provider.js')

      const raw = getAuthorizeUrl({
        redirectUri: 'http://localhost:5173/login',
        state: 'state-abc',
        codeChallenge: 'challenge-xyz',
        codeChallengeMethod: 'S256',
      })

      expect(raw).not.toBeNull()
      const url = new URL(raw!)
      expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
      expect(url.searchParams.get('client_id')).toBe('test-github-client-id')
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/login')
      expect(url.searchParams.get('state')).toBe('state-abc')
      expect(url.searchParams.get('scope')).toBe('read:user user:email')
      expect(url.searchParams.get('code_challenge')).toBe('challenge-xyz')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('omits redirect_uri when absent so the provider uses its registered callback URL', async () => {
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

    it('returns null when OAUTH_GITHUB_CLIENT_ID is unset (unconfigured, not a crash)', async () => {
      delete process.env.OAUTH_GITHUB_CLIENT_ID

      const { getAuthorizeUrl } = await import('../provider.js')

      expect(getAuthorizeUrl({ state: 's' })).toBeNull()
    })

    it('honours the OAUTH_GITHUB_AUTHORIZE_URL override (GitHub Enterprise)', async () => {
      process.env.OAUTH_GITHUB_AUTHORIZE_URL = 'https://ghe.example.com/login/oauth/authorize'

      const { getAuthorizeUrl } = await import('../provider.js')

      const raw = getAuthorizeUrl({ state: 's' })
      expect(raw).not.toBeNull()
      expect(raw!.startsWith('https://ghe.example.com/login/oauth/authorize?')).toBe(true)
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.serverName).toBeDefined()
      expect(exports.verify).toBeDefined()
    })
  })
})

describe('secret definitions', () => {
  it('registers secret definitions in @molecule/api-secrets on import', async () => {
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    await import('../index.js')
    expect(getSecretDefinition('OAUTH_GITHUB_CLIENT_ID')).toBeDefined()
  })
})
