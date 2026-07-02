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
        {
          client_id: 'test-github-client-id',
          client_secret: 'test-github-client-secret',
          code: 'test-auth-code',
          code_verifier: undefined,
          grant_type: 'authorization_code',
        },
        {
          headers: {
            accept: 'application/json',
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

      expect(mockPost).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          code_verifier: 'test-code-verifier',
        }),
        expect.anything(),
      )
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

      expect(result.email).toBeUndefined()
      expect(result.username).toBe('testuser@github')
      // No public email → cannot affirm verification → unverified default.
      expect(result.emailVerified).toBe(false)
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

      expect(result.oauthId).toBe('')
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

      expect(mockPost).toHaveBeenCalledWith(
        'http://127.0.0.1:9999/token',
        expect.objectContaining({ code: 'mock-auth-code' }),
        expect.anything(),
      )
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

      expect(result.username).toBe('legit@github')
      expect(mockLoggerError).not.toHaveBeenCalled()
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
