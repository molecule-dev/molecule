import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { OAuthClientProvider, OAuthConfig } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getAuthorizationUrl: typeof ProviderModule.getAuthorizationUrl
let getToken: typeof ProviderModule.getToken
let refreshToken: typeof ProviderModule.refreshToken
let request: typeof ProviderModule.request
let revokeToken: typeof ProviderModule.revokeToken

const mockConfig: OAuthConfig = {
  id: 'github',
  clientId: 'client-123',
  clientSecret: 'secret-456',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'https://myapp.com/callback',
  scopes: ['user', 'repo'],
}

const createMockProvider = (overrides?: Partial<OAuthClientProvider>): OAuthClientProvider => ({
  getAuthorizationUrl: vi
    .fn()
    .mockReturnValue('https://github.com/login/oauth/authorize?client_id=client-123'),
  getToken: vi.fn().mockResolvedValue({
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-xyz',
    tokenType: 'Bearer',
    expiresIn: 3600,
  }),
  refreshToken: vi.fn().mockResolvedValue({
    accessToken: 'new-access-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
  }),
  request: vi.fn().mockResolvedValue({ login: 'octocat', id: 1 }),
  revokeToken: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('oauth-client provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    getAuthorizationUrl = providerModule.getAuthorizationUrl
    getToken = providerModule.getToken
    refreshToken = providerModule.refreshToken
    request = providerModule.request
    revokeToken = providerModule.revokeToken
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'OAuth client provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    let mockProvider: OAuthClientProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate getAuthorizationUrl to provider', () => {
      const options = { state: 'csrf-token' }
      const url = getAuthorizationUrl(mockConfig, options)
      expect(mockProvider.getAuthorizationUrl).toHaveBeenCalledWith(mockConfig, options)
      expect(url).toContain('github.com')
    })

    it('should delegate getToken to provider', async () => {
      const options = { codeVerifier: 'pkce-verifier' }
      const tokens = await getToken(mockConfig, 'auth-code', options)
      expect(mockProvider.getToken).toHaveBeenCalledWith(mockConfig, 'auth-code', options)
      expect(tokens.accessToken).toBe('access-token-abc')
      expect(tokens.tokenType).toBe('Bearer')
    })

    it('should delegate refreshToken to provider', async () => {
      const tokens = await refreshToken(mockConfig, 'refresh-token-xyz')
      expect(mockProvider.refreshToken).toHaveBeenCalledWith(mockConfig, 'refresh-token-xyz')
      expect(tokens.accessToken).toBe('new-access-token')
    })

    it('should delegate request to provider', async () => {
      const tokens = {
        accessToken: 'access-token-abc',
        tokenType: 'Bearer',
      }
      const options = { method: 'GET' as const }
      const result = await request(tokens, 'https://api.github.com/user', options)
      expect(mockProvider.request).toHaveBeenCalledWith(
        tokens,
        'https://api.github.com/user',
        options,
      )
      expect(result).toEqual({ login: 'octocat', id: 1 })
    })

    it('should delegate revokeToken to provider', async () => {
      await revokeToken(mockConfig, 'access-token-abc')
      expect(mockProvider.revokeToken).toHaveBeenCalledWith(mockConfig, 'access-token-abc')
    })
  })

  describe('error handling', () => {
    it('should throw on getAuthorizationUrl when no provider is set', () => {
      expect(() => getAuthorizationUrl(mockConfig)).toThrow(
        'OAuth client provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on getToken when no provider is set', async () => {
      await expect(getToken(mockConfig, 'code')).rejects.toThrow(
        'OAuth client provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on refreshToken when no provider is set', async () => {
      await expect(refreshToken(mockConfig, 'token')).rejects.toThrow(
        'OAuth client provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on request when no provider is set', async () => {
      await expect(
        request({ accessToken: 'a', tokenType: 'Bearer' }, 'https://example.com'),
      ).rejects.toThrow('OAuth client provider not configured. Call setProvider() first.')
    })

    it('should throw on revokeToken when no provider is set', async () => {
      await expect(revokeToken(mockConfig, 'token')).rejects.toThrow(
        'OAuth client provider not configured. Call setProvider() first.',
      )
    })
  })
})
