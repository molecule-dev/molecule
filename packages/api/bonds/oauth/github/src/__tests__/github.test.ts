/**
 * Tests for GitHub OAuth provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @molecule/api-http before importing the module
const mockPost = vi.fn()
const mockGet = vi.fn()

vi.mock('@molecule/api-http', () => ({
  post: mockPost,
  get: mockGet,
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
        },
      )

      expect(mockGet).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
      })

      expect(result).toEqual({
        username: 'testuser@github',
        email: 'testuser@example.com',
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
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.serverName).toBeDefined()
      expect(exports.verify).toBeDefined()
    })
  })
})
