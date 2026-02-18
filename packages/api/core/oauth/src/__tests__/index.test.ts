import { describe, expect, it, vi } from 'vitest'

import type { OAuthProviderConfig, OAuthUserProps, OAuthVerifier } from '../index.js'

describe('OAuth types', () => {
  describe('OAuthUserProps', () => {
    it('should accept all required properties', () => {
      const userProps: OAuthUserProps = {
        username: 'johndoe@github',
        oauthServer: 'github',
        oauthId: '12345',
        oauthData: { login: 'johndoe', id: 12345 },
      }

      expect(userProps.username).toBe('johndoe@github')
      expect(userProps.oauthServer).toBe('github')
      expect(userProps.oauthId).toBe('12345')
      expect(userProps.oauthData).toEqual({ login: 'johndoe', id: 12345 })
    })

    it('should accept optional email property', () => {
      const userPropsWithEmail: OAuthUserProps = {
        username: 'johndoe@github',
        email: 'john@example.com',
        oauthServer: 'github',
        oauthId: '12345',
        oauthData: {},
      }

      expect(userPropsWithEmail.email).toBe('john@example.com')
    })

    it('should allow undefined email', () => {
      const userPropsWithoutEmail: OAuthUserProps = {
        username: 'johndoe@google',
        oauthServer: 'google',
        oauthId: 'abc123',
        oauthData: { sub: 'abc123' },
      }

      expect(userPropsWithoutEmail.email).toBeUndefined()
    })

    it('should accept various OAuth provider formats', () => {
      // GitHub format
      const githubUser: OAuthUserProps = {
        username: 'octocat@github',
        email: 'octocat@github.com',
        oauthServer: 'github',
        oauthId: '583231',
        oauthData: {
          login: 'octocat',
          id: 583231,
          avatar_url: 'https://avatars.githubusercontent.com/u/583231',
          name: 'The Octocat',
        },
      }
      expect(githubUser.oauthServer).toBe('github')

      // Google format
      const googleUser: OAuthUserProps = {
        username: 'user@google',
        email: 'user@gmail.com',
        oauthServer: 'google',
        oauthId: '117293847365829103746',
        oauthData: {
          sub: '117293847365829103746',
          email: 'user@gmail.com',
          email_verified: true,
          name: 'Test User',
        },
      }
      expect(googleUser.oauthServer).toBe('google')

      // Twitter/X format
      const twitterUser: OAuthUserProps = {
        username: 'twitteruser@twitter',
        oauthServer: 'twitter',
        oauthId: '2244994945',
        oauthData: {
          id: '2244994945',
          username: 'twitteruser',
          name: 'Twitter User',
        },
      }
      expect(twitterUser.oauthServer).toBe('twitter')
    })

    it('should accept complex oauthData structures', () => {
      const userProps: OAuthUserProps = {
        username: 'user@provider',
        oauthServer: 'custom',
        oauthId: 'custom-id',
        oauthData: {
          nested: {
            deeply: {
              value: 'test',
            },
          },
          array: [1, 2, 3],
          boolean: true,
          number: 42,
          null: null,
        },
      }

      expect(userProps.oauthData).toEqual({
        nested: { deeply: { value: 'test' } },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
        null: null,
      })
    })

    it('should accept empty oauthData', () => {
      const userProps: OAuthUserProps = {
        username: 'minimal@provider',
        oauthServer: 'minimal',
        oauthId: 'id',
        oauthData: {},
      }

      expect(userProps.oauthData).toEqual({})
    })
  })

  describe('OAuthVerifier', () => {
    it('should define correct function signature with all parameters', async () => {
      const mockVerifier: OAuthVerifier = vi.fn().mockResolvedValue({
        username: 'user@github',
        oauthServer: 'github',
        oauthId: '123',
        oauthData: {},
      })

      const result = await mockVerifier(
        'auth-code',
        'code-verifier',
        'https://app.example.com/callback',
      )

      expect(mockVerifier).toHaveBeenCalledWith(
        'auth-code',
        'code-verifier',
        'https://app.example.com/callback',
      )
      expect(result.username).toBe('user@github')
    })

    it('should work with only the required code parameter', async () => {
      const mockVerifier: OAuthVerifier = vi.fn().mockResolvedValue({
        username: 'user@google',
        email: 'user@gmail.com',
        oauthServer: 'google',
        oauthId: '456',
        oauthData: { email: 'user@gmail.com' },
      })

      const result = await mockVerifier('auth-code')

      expect(mockVerifier).toHaveBeenCalledWith('auth-code')
      expect(result.email).toBe('user@gmail.com')
    })

    it('should work with code and codeVerifier (PKCE flow)', async () => {
      const mockVerifier: OAuthVerifier = vi.fn().mockResolvedValue({
        username: 'pkce-user@provider',
        oauthServer: 'provider',
        oauthId: '789',
        oauthData: {},
      })

      const result = await mockVerifier('auth-code', 'pkce-code-verifier')

      expect(mockVerifier).toHaveBeenCalledWith('auth-code', 'pkce-code-verifier')
      expect(result.username).toBe('pkce-user@provider')
    })

    it('should return a Promise of OAuthUserProps', async () => {
      const verifier: OAuthVerifier = async (code: string) => {
        return {
          username: `verified-${code}@oauth`,
          oauthServer: 'oauth',
          oauthId: code,
          oauthData: { code },
        }
      }

      const result = await verifier('test-code')

      expect(result).toEqual({
        username: 'verified-test-code@oauth',
        oauthServer: 'oauth',
        oauthId: 'test-code',
        oauthData: { code: 'test-code' },
      })
    })

    it('should support async implementations', async () => {
      const verifier: OAuthVerifier = async (code, codeVerifier, redirectUri) => {
        // Simulate async OAuth token exchange
        await new Promise((resolve) => setTimeout(resolve, 0))

        return {
          username: 'async-user@provider',
          email: 'async@example.com',
          oauthServer: 'provider',
          oauthId: `${code}-${codeVerifier || 'no-verifier'}`,
          oauthData: {
            code,
            codeVerifier,
            redirectUri,
          },
        }
      }

      const result = await verifier('code', 'verifier', 'https://redirect.uri')

      expect(result.oauthId).toBe('code-verifier')
      expect(result.oauthData).toEqual({
        code: 'code',
        codeVerifier: 'verifier',
        redirectUri: 'https://redirect.uri',
      })
    })

    it('should handle undefined optional parameters', async () => {
      const verifier: OAuthVerifier = async (code, codeVerifier, redirectUri) => {
        return {
          username: 'user@provider',
          oauthServer: 'provider',
          oauthId: code,
          oauthData: {
            hasCodeVerifier: codeVerifier !== undefined,
            hasRedirectUri: redirectUri !== undefined,
          },
        }
      }

      const result = await verifier('code', undefined, undefined)

      expect(result.oauthData).toEqual({
        hasCodeVerifier: false,
        hasRedirectUri: false,
      })
    })
  })

  describe('OAuthProviderConfig', () => {
    it('should accept serverName and verify function', () => {
      const mockVerify: OAuthVerifier = vi.fn().mockResolvedValue({
        username: 'user@test',
        oauthServer: 'test',
        oauthId: '123',
        oauthData: {},
      })

      const config: OAuthProviderConfig = {
        serverName: 'github',
        verify: mockVerify,
      }

      expect(config.serverName).toBe('github')
      expect(typeof config.verify).toBe('function')
    })

    it('should work with various OAuth providers', () => {
      const providers: OAuthProviderConfig[] = [
        {
          serverName: 'github',
          verify: async (code) => ({
            username: `user@github`,
            oauthServer: 'github',
            oauthId: code,
            oauthData: {},
          }),
        },
        {
          serverName: 'google',
          verify: async (code, codeVerifier) => ({
            username: `user@google`,
            email: 'user@gmail.com',
            oauthServer: 'google',
            oauthId: `${code}-${codeVerifier}`,
            oauthData: {},
          }),
        },
        {
          serverName: 'twitter',
          verify: async (code, codeVerifier, redirectUri) => ({
            username: `user@twitter`,
            oauthServer: 'twitter',
            oauthId: code,
            oauthData: { redirectUri },
          }),
        },
      ]

      expect(providers).toHaveLength(3)
      expect(providers.map((p) => p.serverName)).toEqual(['github', 'google', 'twitter'])
    })

    it('should allow the verify function to be called', async () => {
      const config: OAuthProviderConfig = {
        serverName: 'custom-provider',
        verify: vi.fn().mockResolvedValue({
          username: 'custom-user@custom-provider',
          oauthServer: 'custom-provider',
          oauthId: 'custom-id',
          oauthData: { custom: true },
        }),
      }

      const result = await config.verify('code', 'verifier', 'redirect')

      expect(config.verify).toHaveBeenCalledWith('code', 'verifier', 'redirect')
      expect(result.oauthServer).toBe('custom-provider')
    })
  })

  describe('type integration', () => {
    it('should work together as a complete OAuth flow', async () => {
      // Create a mock OAuth provider configuration
      const githubConfig: OAuthProviderConfig = {
        serverName: 'github',
        verify: async (
          code: string,
          _codeVerifier?: string,
          _redirectUri?: string,
        ): Promise<OAuthUserProps> => {
          // Simulate GitHub OAuth token exchange and user info fetch
          return {
            username: `octocat@github`,
            email: 'octocat@github.com',
            oauthServer: 'github',
            oauthId: '583231',
            oauthData: {
              login: 'octocat',
              id: 583231,
              type: 'User',
              code,
            },
          }
        },
      }

      // Verify the OAuth code
      const userProps = await githubConfig.verify('github-auth-code')

      // Validate the returned user props
      expect(userProps.username).toBe('octocat@github')
      expect(userProps.oauthServer).toBe(githubConfig.serverName)
      expect(userProps.oauthId).toBe('583231')
      expect(userProps.oauthData).toHaveProperty('login', 'octocat')
    })

    it('should support PKCE flow with codeVerifier', async () => {
      const googleConfig: OAuthProviderConfig = {
        serverName: 'google',
        verify: async (code, codeVerifier, redirectUri) => {
          if (!codeVerifier) {
            throw new Error('Code verifier required for PKCE flow')
          }
          return {
            username: 'user@google',
            email: 'user@gmail.com',
            oauthServer: 'google',
            oauthId: '117293847365829103746',
            oauthData: {
              sub: '117293847365829103746',
              email: 'user@gmail.com',
              email_verified: true,
              code,
              codeVerifier,
              redirectUri,
            },
          }
        },
      }

      const result = await googleConfig.verify(
        'google-auth-code',
        'pkce-verifier-abc123',
        'https://myapp.com/oauth/callback',
      )

      expect(result.email).toBe('user@gmail.com')
      expect(result.oauthData).toHaveProperty('codeVerifier', 'pkce-verifier-abc123')
      expect(result.oauthData).toHaveProperty('redirectUri', 'https://myapp.com/oauth/callback')
    })

    it('should handle provider that returns minimal data', async () => {
      const minimalConfig: OAuthProviderConfig = {
        serverName: 'minimal',
        verify: async (code) => ({
          username: `${code}@minimal`,
          oauthServer: 'minimal',
          oauthId: code,
          oauthData: {},
        }),
      }

      const result = await minimalConfig.verify('min-code')

      expect(result.username).toBe('min-code@minimal')
      expect(result.email).toBeUndefined()
      expect(result.oauthData).toEqual({})
    })
  })

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      // While not ideal, empty strings are valid string values
      const userProps: OAuthUserProps = {
        username: '',
        email: '',
        oauthServer: '',
        oauthId: '',
        oauthData: {},
      }

      expect(userProps.username).toBe('')
      expect(userProps.email).toBe('')
    })

    it('should handle special characters in username', () => {
      const userProps: OAuthUserProps = {
        username: 'user+tag@provider',
        oauthServer: 'provider',
        oauthId: 'id',
        oauthData: {},
      }

      expect(userProps.username).toBe('user+tag@provider')
    })

    it('should handle unicode in oauthData', () => {
      const userProps: OAuthUserProps = {
        username: 'user@provider',
        oauthServer: 'provider',
        oauthId: 'id',
        oauthData: {
          name: 'Jose Garcia',
          bio: 'Hello world',
          emoji: 'test',
        },
      }

      expect(userProps.oauthData).toHaveProperty('name', 'Jose Garcia')
    })

    it('should handle very long oauth IDs', () => {
      const longId = 'a'.repeat(1000)
      const userProps: OAuthUserProps = {
        username: 'user@provider',
        oauthServer: 'provider',
        oauthId: longId,
        oauthData: {},
      }

      expect(userProps.oauthId).toHaveLength(1000)
    })

    it('should handle verifier that rejects', async () => {
      const failingVerifier: OAuthVerifier = async () => {
        throw new Error('OAuth verification failed')
      }

      const config: OAuthProviderConfig = {
        serverName: 'failing',
        verify: failingVerifier,
      }

      await expect(config.verify('code')).rejects.toThrow('OAuth verification failed')
    })

    it('should handle verifier returning rejected promise', async () => {
      const verifier: OAuthVerifier = () => {
        return Promise.reject(new Error('Token expired'))
      }

      await expect(verifier('code')).rejects.toThrow('Token expired')
    })
  })

  describe('type exports', () => {
    it('should export OAuthUserProps interface', () => {
      // TypeScript compilation verifies the type exists
      const createUserProps = (): OAuthUserProps => ({
        username: 'test@provider',
        oauthServer: 'provider',
        oauthId: 'id',
        oauthData: {},
      })

      expect(createUserProps()).toBeDefined()
    })

    it('should export OAuthVerifier type', () => {
      // TypeScript compilation verifies the type exists
      const createVerifier = (): OAuthVerifier => {
        return async () => ({
          username: 'test@provider',
          oauthServer: 'provider',
          oauthId: 'id',
          oauthData: {},
        })
      }

      expect(typeof createVerifier()).toBe('function')
    })

    it('should export OAuthProviderConfig interface', () => {
      // TypeScript compilation verifies the type exists
      const createConfig = (): OAuthProviderConfig => ({
        serverName: 'test',
        verify: async () => ({
          username: 'test@test',
          oauthServer: 'test',
          oauthId: 'id',
          oauthData: {},
        }),
      })

      expect(createConfig()).toHaveProperty('serverName')
      expect(createConfig()).toHaveProperty('verify')
    })
  })
})
