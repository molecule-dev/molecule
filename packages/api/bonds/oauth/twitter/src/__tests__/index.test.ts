/**
 * Tests for Twitter OAuth provider.
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
        },
      )

      expect(mockGet).toHaveBeenCalledWith('https://api.twitter.com/2/users/me', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
      })

      expect(result).toEqual({
        username: 'testuser@twitter',
        email: 'testuser@example.com',
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

      expect(result.email).toBeUndefined()
      expect(result.username).toBe('testuser@twitter')
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

      expect(result.oauthId).toBe('')
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
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_request', error_description: 'Code expired or already used' },
        },
      })

      const { verify } = await import('../verify.js')

      await expect(verify('expired-code')).rejects.toBeDefined()
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

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.serverName).toBeDefined()
      expect(exports.verify).toBeDefined()
    })
  })
})
