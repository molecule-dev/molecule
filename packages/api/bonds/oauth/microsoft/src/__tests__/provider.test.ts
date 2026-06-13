/**
 * Tests for the Microsoft OAuth provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.fn()
const mockGet = vi.fn()

vi.mock('@molecule/api-http', () => ({
  post: mockPost,
  get: mockGet,
}))

vi.mock('@molecule/api-oauth', () => ({
  // Type exports only, no runtime values needed.
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Microsoft OAuth provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.OAUTH_MICROSOFT_CLIENT_ID = 'test-ms-client-id'
    process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'super-secret-shhh'
    process.env.APP_ORIGIN = 'http://localhost:3000'
    delete process.env.OAUTH_MICROSOFT_TENANT_ID
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('exports serverName "microsoft"', async () => {
    const { serverName } = await import('../provider.js')
    expect(serverName).toBe('microsoft')
  })

  describe('getAuthorizationUrl', () => {
    it('builds the /common/oauth2/v2.0/authorize URL with default scope', async () => {
      const { provider } = await import('../provider.js')
      const url = provider.getAuthorizationUrl({
        state: 'abc123',
        redirectUri: 'http://localhost:3000/oauth/callback',
      })
      const parsed = new URL(url)
      expect(parsed.origin + parsed.pathname).toBe(
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      )
      expect(parsed.searchParams.get('client_id')).toBe('test-ms-client-id')
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/oauth/callback')
      expect(parsed.searchParams.get('response_mode')).toBe('query')
      expect(parsed.searchParams.get('scope')).toBe('openid email profile User.Read')
      expect(parsed.searchParams.get('state')).toBe('abc123')
    })

    it('honours an explicit scope override', async () => {
      const { provider } = await import('../provider.js')
      const url = provider.getAuthorizationUrl({
        state: 's',
        redirectUri: 'http://localhost:3000/cb',
        scope: 'openid offline_access Mail.Read',
      })
      expect(new URL(url).searchParams.get('scope')).toBe('openid offline_access Mail.Read')
    })

    it('uses the configured tenantId when provided via env', async () => {
      process.env.OAUTH_MICROSOFT_TENANT_ID = '00000000-0000-0000-0000-000000000001'
      const { provider } = await import('../provider.js')
      const url = provider.getAuthorizationUrl({
        state: 's',
        redirectUri: 'http://localhost:3000/cb',
      })
      expect(url).toContain(
        'https://login.microsoftonline.com/00000000-0000-0000-0000-000000000001/oauth2/v2.0/authorize',
      )
    })

    it('uses the configured tenantId when overridden in createMicrosoftProvider', async () => {
      const { createMicrosoftProvider } = await import('../provider.js')
      const custom = createMicrosoftProvider({ tenantId: 'organizations' })
      const url = custom.getAuthorizationUrl({
        state: 's',
        redirectUri: 'http://localhost:3000/cb',
      })
      expect(url).toContain('https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('POSTs form-encoded body to /common/oauth2/v2.0/token and normalizes', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'a-token',
          id_token: 'id-token',
          refresh_token: 'r-token',
          token_type: 'Bearer',
          expires_in: 3599,
          scope: 'openid email profile User.Read',
        },
      })
      const { provider } = await import('../provider.js')
      const result = await provider.exchangeCodeForTokens('the-code', 'http://localhost:3000/cb')

      expect(mockPost).toHaveBeenCalledTimes(1)
      const [url, body, options] = mockPost.mock.calls[0] as [
        string,
        string,
        Record<string, unknown>,
      ]
      expect(url).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/token')
      const params = new URLSearchParams(body)
      expect(params.get('client_id')).toBe('test-ms-client-id')
      expect(params.get('client_secret')).toBe('super-secret-shhh')
      expect(params.get('code')).toBe('the-code')
      expect(params.get('grant_type')).toBe('authorization_code')
      expect(params.get('redirect_uri')).toBe('http://localhost:3000/cb')
      const headers = (options as { headers: Record<string, string> }).headers
      expect(headers['content-type']).toBe('application/x-www-form-urlencoded')

      expect(result).toEqual({
        accessToken: 'a-token',
        idToken: 'id-token',
        refreshToken: 'r-token',
        tokenType: 'Bearer',
        expiresIn: 3599,
        scope: 'openid email profile User.Read',
      })
    })

    it('throws if the token response lacks access_token', async () => {
      mockPost.mockResolvedValue({ data: { token_type: 'Bearer' } })
      const { provider } = await import('../provider.js')
      await expect(provider.exchangeCodeForTokens('c', 'http://localhost:3000/cb')).rejects.toThrow(
        /access_token/,
      )
    })

    it('redacts client secret and code from token-exchange errors', async () => {
      const upstream = new Error(
        'Bad request: client_secret=super-secret-shhh and code=the-code rejected',
      )
      mockPost.mockRejectedValue(upstream)
      const { provider } = await import('../provider.js')
      let captured: Error | undefined
      try {
        await provider.exchangeCodeForTokens('the-code', 'http://localhost:3000/cb')
      } catch (err) {
        captured = err as Error
      }
      expect(captured).toBeDefined()
      expect(captured!.message).not.toContain('super-secret-shhh')
      expect(captured!.message).not.toContain('the-code')
      expect(captured!.message).toContain('[REDACTED]')
    })
  })

  describe('refreshAccessToken', () => {
    it('POSTs grant_type=refresh_token and returns rotated token set', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'new-access',
          refresh_token: 'rotated-refresh',
          token_type: 'Bearer',
          expires_in: 3599,
        },
      })
      const { provider } = await import('../provider.js')
      const out = await provider.refreshAccessToken('old-refresh-token')

      const body = mockPost.mock.calls[0]?.[1] as string
      const params = new URLSearchParams(body)
      expect(params.get('grant_type')).toBe('refresh_token')
      expect(params.get('refresh_token')).toBe('old-refresh-token')
      expect(params.get('client_id')).toBe('test-ms-client-id')
      expect(params.get('client_secret')).toBe('super-secret-shhh')

      expect(out.accessToken).toBe('new-access')
      expect(out.refreshToken).toBe('rotated-refresh')
    })

    it('redacts the refresh token and client secret from refresh errors', async () => {
      mockPost.mockRejectedValue(
        new Error('boom client_secret=super-secret-shhh refresh_token=old-refresh-token'),
      )
      const { provider } = await import('../provider.js')
      try {
        await provider.refreshAccessToken('old-refresh-token')
        throw new Error('should have thrown')
      } catch (err) {
        const e = err as Error
        expect(e.message).not.toContain('super-secret-shhh')
        expect(e.message).not.toContain('old-refresh-token')
        expect(e.message).toContain('[REDACTED]')
      }
    })
  })

  describe('getUserInfo', () => {
    it('GETs Microsoft Graph /me and normalizes the response', async () => {
      mockGet.mockResolvedValue({
        data: {
          id: 'AAD-123',
          mail: 'alice@contoso.com',
          userPrincipalName: 'alice@contoso.onmicrosoft.com',
          displayName: 'Alice Example',
        },
      })
      const { provider } = await import('../provider.js')
      const info = await provider.getUserInfo('access-token-xyz')

      expect(mockGet).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/me', {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer access-token-xyz',
        },
        timeout: 15_000,
      })
      expect(info).toEqual({
        id: 'AAD-123',
        email: 'alice@contoso.com',
        name: 'Alice Example',
        picture: undefined,
      })
    })

    it('falls back to userPrincipalName when mail is null and composes name from given+surname', async () => {
      mockGet.mockResolvedValue({
        data: {
          id: 'AAD-456',
          mail: null,
          userPrincipalName: 'bob@contoso.onmicrosoft.com',
          givenName: 'Bob',
          surname: 'Builder',
        },
      })
      const { provider } = await import('../provider.js')
      const info = await provider.getUserInfo('t')
      expect(info.email).toBe('bob@contoso.onmicrosoft.com')
      expect(info.name).toBe('Bob Builder')
    })

    it('redacts the access token from upstream errors', async () => {
      mockGet.mockRejectedValue(new Error('401 token=access-token-xyz expired'))
      const { provider } = await import('../provider.js')
      try {
        await provider.getUserInfo('access-token-xyz')
        throw new Error('should have thrown')
      } catch (err) {
        const e = err as Error
        expect(e.message).not.toContain('access-token-xyz')
        expect(e.message).toContain('[REDACTED]')
      }
    })
  })

  describe('verify (OAuthVerifier compat)', () => {
    it('exchanges the code, fetches /me, and returns OAuthUserProps', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'a', token_type: 'Bearer' },
      })
      mockGet.mockResolvedValue({
        data: {
          id: 'AAD-789',
          mail: 'carol@contoso.com',
          displayName: 'Carol',
        },
      })
      const { verify } = await import('../provider.js')
      const result = await verify('code-1', undefined, 'http://localhost:3000/cb')
      expect(result).toEqual({
        username: 'carol@contoso.com@microsoft',
        name: 'Carol',
        email: 'carol@contoso.com',
        // Microsoft Graph /me exposes no verification signal → unverified default.
        emailVerified: false,
        oauthServer: 'microsoft',
        oauthId: 'AAD-789',
        oauthData: {
          id: 'AAD-789',
          email: 'carol@contoso.com',
          name: 'Carol',
          picture: undefined,
        },
      })
    })

    it('falls back to APP_ORIGIN when redirectUri is omitted', async () => {
      mockPost.mockResolvedValue({ data: { access_token: 'a', token_type: 'Bearer' } })
      mockGet.mockResolvedValue({ data: { id: 'X', mail: 'x@y.z' } })
      const { verify } = await import('../provider.js')
      await verify('code-1')
      const body = mockPost.mock.calls[0]?.[1] as string
      expect(new URLSearchParams(body).get('redirect_uri')).toBe('http://localhost:3000')
    })
  })
})
