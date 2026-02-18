/**
 * Tests for Google OAuth provider.
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
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        },
      })

      const { verify } = await import('../verify.js')

      const result = await verify('test-auth-code')

      expect(mockPost).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v4/token',
        {
          client_id: 'test-google-client-id',
          client_secret: 'test-google-client-secret',
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

      expect(mockGet).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer test-access-token',
        },
      })

      expect(result).toEqual({
        username: 'testuser@gmail.com@google',
        email: 'testuser@gmail.com',
        oauthServer: 'google',
        oauthId: '123456789',
        oauthData: {
          sub: '123456789',
          email: 'testuser@gmail.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        },
      })
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

      expect(mockPost).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v4/token',
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

      expect(mockPost).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v4/token',
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

      expect(result.email).toBeUndefined()
      expect(result.username).toBe('123456789@google')
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
          scope: 'openid email profile',
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
          data: { error: 'invalid_grant', error_description: 'Code expired or already used' },
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

      expect(mockPost).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v4/token',
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
