/**
 * Tests for GitLab OAuth provider.
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
        },
      )

      expect(mockGet).toHaveBeenCalledWith('https://gitlab.com/api/v4/user', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
      })

      expect(result).toEqual({
        username: 'testuser@gitlab',
        email: 'testuser@example.com',
        oauthServer: 'gitlab',
        oauthId: '12345',
        oauthData: {
          id: 12345,
          username: 'testuser',
          email: 'testuser@example.com',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      })
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

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.serverName).toBeDefined()
      expect(exports.verify).toBeDefined()
    })
  })
})
