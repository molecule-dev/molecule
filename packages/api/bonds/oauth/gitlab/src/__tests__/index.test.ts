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
        {
          client_id: 'test-gitlab-client-id',
          client_secret: 'test-gitlab-client-secret',
          code: 'test-auth-code',
          code_verifier: undefined,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:3000',
        },
        {
          headers: {
            accept: 'application/json',
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

      expect(result.email).toBe('unconfirmed@example.com')
      expect(result.emailVerified).toBe(false)
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

      expect(mockPost).toHaveBeenCalledWith(
        'https://gitlab.com/oauth/token',
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

      expect(mockPost).toHaveBeenCalledWith(
        'https://gitlab.com/oauth/token',
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

      expect(result.email).toBeUndefined()
      expect(result.username).toBe('testuser@gitlab')
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
          scope: 'read_user',
        },
      })

      mockGet.mockRejectedValue(new Error('User not found'))

      const { verify } = await import('../provider.js')

      await expect(verify('test-auth-code')).rejects.toThrow('User not found')
    })

    it('should handle invalid grant error', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_grant', error_description: 'Code expired or already used' },
        },
      })

      const { verify } = await import('../provider.js')

      await expect(verify('expired-code')).rejects.toBeDefined()
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

      expect(mockPost).toHaveBeenCalledWith(
        'https://gitlab.com/oauth/token',
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
      const leak = Object.assign(
        new Error('token exchange failed for client_secret=test-gitlab-client-secret'),
        {
          request: {
            url: 'https://gitlab.com/oauth/token',
            method: 'POST',
            body: { client_secret: 'test-gitlab-client-secret', code: 'attacker-code' },
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

      expect(result.username).toBe('legit@gitlab')
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
