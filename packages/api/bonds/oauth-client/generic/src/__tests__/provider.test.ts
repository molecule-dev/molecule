import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { OAuthConfig } from '@molecule/api-oauth-client'

import { createProvider, provider } from '../provider.js'

const mockConfig: OAuthConfig = {
  id: 'github',
  clientId: 'client-123',
  clientSecret: 'secret-456',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  revocationUrl: 'https://github.com/settings/tokens/revoke',
  redirectUri: 'https://myapp.com/callback',
  scopes: ['user', 'repo'],
}

const mockFetch = vi.fn()

describe('generic OAuth client provider', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(p.getAuthorizationUrl).toBeInstanceOf(Function)
      expect(p.getToken).toBeInstanceOf(Function)
      expect(p.refreshToken).toBeInstanceOf(Function)
      expect(p.request).toBeInstanceOf(Function)
      expect(p.revokeToken).toBeInstanceOf(Function)
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({
        timeout: 30_000,
        userAgent: 'custom-agent/2.0',
        clientAuthMethod: 'header',
      })
      expect(p).toBeDefined()
    })
  })

  describe('getAuthorizationUrl', () => {
    it('should build a valid authorization URL', () => {
      const p = createProvider()
      const url = p.getAuthorizationUrl(mockConfig)

      expect(url).toContain('https://github.com/login/oauth/authorize')
      expect(url).toContain('client_id=client-123')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('response_type=code')
      expect(url).toContain('scope=user+repo')
    })

    it('should include state parameter', () => {
      const p = createProvider()
      const url = p.getAuthorizationUrl(mockConfig, { state: 'csrf-token-abc' })

      expect(url).toContain('state=csrf-token-abc')
    })

    it('should include PKCE code challenge', () => {
      const p = createProvider()
      const url = p.getAuthorizationUrl(mockConfig, {
        codeChallenge: 'challenge-xyz',
        codeChallengeMethod: 'S256',
      })

      expect(url).toContain('code_challenge=challenge-xyz')
      expect(url).toContain('code_challenge_method=S256')
    })

    it('should use plain code challenge method when specified', () => {
      const p = createProvider()
      const url = p.getAuthorizationUrl(mockConfig, {
        codeChallenge: 'plain-challenge',
        codeChallengeMethod: 'plain',
      })

      expect(url).toContain('code_challenge_method=plain')
    })

    it('should include additional parameters', () => {
      const p = createProvider()
      const url = p.getAuthorizationUrl(mockConfig, {
        additionalParams: { prompt: 'consent', login_hint: 'user@example.com' },
      })

      expect(url).toContain('prompt=consent')
      expect(url).toContain('login_hint=user%40example.com')
    })

    it('should use custom scope delimiter', () => {
      const p = createProvider()
      const configWithDelimiter = { ...mockConfig, scopeDelimiter: ',' }
      const url = p.getAuthorizationUrl(configWithDelimiter)

      expect(url).toContain('scope=user%2Crepo')
    })

    it('should omit scope when none configured', () => {
      const p = createProvider()
      const configNoScopes = { ...mockConfig, scopes: undefined }
      const url = p.getAuthorizationUrl(configNoScopes)

      expect(url).not.toContain('scope=')
    })
  })

  describe('getToken', () => {
    it('should exchange authorization code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          access_token: 'access-token-abc',
          refresh_token: 'refresh-token-xyz',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'user repo',
        }),
      })

      const p = createProvider()
      const tokens = await p.getToken(mockConfig, 'auth-code-123')

      expect(tokens.accessToken).toBe('access-token-abc')
      expect(tokens.refreshToken).toBe('refresh-token-xyz')
      expect(tokens.tokenType).toBe('Bearer')
      expect(tokens.expiresIn).toBe(3600)
      expect(tokens.expiresAt).toBeDefined()
      expect(tokens.scope).toBe('user repo')

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.tokenUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=authorization_code'),
        }),
      )
    })

    it('should include PKCE code verifier', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
      })

      const p = createProvider()
      await p.getToken(mockConfig, 'code', { codeVerifier: 'verifier-abc' })

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.tokenUrl,
        expect.objectContaining({
          body: expect.stringContaining('code_verifier=verifier-abc'),
        }),
      )
    })

    it('should handle form-encoded token response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/x-www-form-urlencoded' }),
        text: async () => 'access_token=token-abc&token_type=bearer&scope=user',
      })

      const p = createProvider()
      const tokens = await p.getToken(mockConfig, 'code')

      expect(tokens.accessToken).toBe('token-abc')
      expect(tokens.tokenType).toBe('bearer')
    })

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      const p = createProvider()
      await expect(p.getToken(mockConfig, 'bad-code')).rejects.toThrow(
        'OAuth token request failed (401)',
      )
    })

    it('should throw on OAuth error in response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The authorization code has expired.',
        }),
      })

      const p = createProvider()
      await expect(p.getToken(mockConfig, 'expired-code')).rejects.toThrow(
        'OAuth token error: The authorization code has expired.',
      )
    })

    it('should use header auth when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
      })

      const p = createProvider({ clientAuthMethod: 'header' })
      await p.getToken(mockConfig, 'code')

      const callArgs = mockFetch.mock.calls[0]!
      const headers = callArgs[1].headers as Record<string, string>
      expect(headers['Authorization']).toMatch(/^Basic /)
    })
  })

  describe('refreshToken', () => {
    it('should refresh an access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      })

      const p = createProvider()
      const tokens = await p.refreshToken(mockConfig, 'refresh-token-xyz')

      expect(tokens.accessToken).toBe('new-access-token')
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.tokenUrl,
        expect.objectContaining({
          body: expect.stringContaining('grant_type=refresh_token'),
        }),
      )
    })

    it('should throw on refresh failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid refresh token',
      })

      const p = createProvider()
      await expect(p.refreshToken(mockConfig, 'bad-token')).rejects.toThrow(
        'OAuth refresh request failed (400)',
      )
    })
  })

  describe('request', () => {
    it('should make authenticated GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ login: 'octocat', id: 1 }),
      })

      const p = createProvider()
      const tokens = { accessToken: 'token-abc', tokenType: 'Bearer' }
      const result = await p.request(tokens, 'https://api.github.com/user')

      expect(result).toEqual({ login: 'octocat', id: 1 })
      const callArgs = mockFetch.mock.calls[0]!
      const headers = callArgs[1].headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer token-abc')
    })

    it('should make authenticated POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 42 }),
      })

      const p = createProvider()
      const tokens = { accessToken: 'token-abc', tokenType: 'Bearer' }
      const result = await p.request(tokens, 'https://api.github.com/repos', {
        method: 'POST',
        body: { name: 'new-repo' },
      })

      expect(result).toEqual({ id: 42 })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'new-repo' }),
        }),
      )
    })

    it('should return text for non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Hello, world!',
      })

      const p = createProvider()
      const tokens = { accessToken: 'token', tokenType: 'Bearer' }
      const result = await p.request(tokens, 'https://example.com/text')

      expect(result).toBe('Hello, world!')
    })

    it('should throw on request failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      })

      const p = createProvider()
      const tokens = { accessToken: 'token', tokenType: 'Bearer' }
      await expect(p.request(tokens, 'https://example.com/protected')).rejects.toThrow(
        'OAuth request failed (403)',
      )
    })
  })

  describe('revokeToken', () => {
    it('should revoke a token', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const p = createProvider()
      await p.revokeToken(mockConfig, 'token-to-revoke')

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.revocationUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('token=token-to-revoke'),
        }),
      )
    })

    it('should throw when revocation URL is not configured', async () => {
      const configNoRevoke = { ...mockConfig, revocationUrl: undefined }
      const p = createProvider()

      await expect(p.revokeToken(configNoRevoke, 'token')).rejects.toThrow(
        'Token revocation URL not configured',
      )
    })

    it('should throw on revocation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      })

      const p = createProvider()
      await expect(p.revokeToken(mockConfig, 'bad-token')).rejects.toThrow(
        'OAuth revocation failed (400)',
      )
    })
  })

  describe('default provider export', () => {
    it('should expose all OAuthClientProvider methods', () => {
      expect(provider.getAuthorizationUrl).toBeInstanceOf(Function)
      expect(provider.getToken).toBeInstanceOf(Function)
      expect(provider.refreshToken).toBeInstanceOf(Function)
      expect(provider.request).toBeInstanceOf(Function)
      expect(provider.revokeToken).toBeInstanceOf(Function)
    })
  })
})
