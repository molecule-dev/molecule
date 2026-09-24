/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the generic bond, with only
 * the network (`fetch`) stubbed, as the bond's own unit tests do.
 *
 * @module
 */
import { createHash, randomBytes } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-oauth-client-generic'

import type { OAuthConfig } from '../index.js'
import { getAuthorizationUrl, getToken, refreshToken, request, setProvider } from '../index.js'

const jsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('builds a state+PKCE authorize URL, exchanges the code, refreshes when expired, and calls the API', async () => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'test-client-id')
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-client-secret')
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/access_token')) {
        const grant = new URLSearchParams(String(init?.body)).get('grant_type')
        return grant === 'authorization_code'
          ? jsonResponse({
              access_token: 'expired-token',
              refresh_token: 'refresh-1',
              token_type: 'bearer',
              expires_in: -1,
            })
          : jsonResponse({ access_token: 'fresh-token', token_type: 'bearer', expires_in: 3600 })
      }
      return jsonResponse({ login: 'ada' })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ userAgent: 'MyApp/1.0' }))

    const github: OAuthConfig = {
      id: 'github',
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      redirectUri: 'https://myapp.example.com/integrations/github/callback',
      scopes: ['read:user', 'repo'],
    }

    const state = randomBytes(16).toString('hex')
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const authUrl = getAuthorizationUrl(github, {
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
    })
    const params = new URL(authUrl).searchParams
    expect(params.get('client_id')).toBe('test-client-id')
    expect(params.get('state')).toBe(state)
    expect(params.get('scope')).toBe('read:user repo')
    expect(params.get('code_challenge')).toBe(codeChallenge)

    const callback = { code: 'code-from-query-string', state }
    if (callback.state !== state) throw new Error('Invalid OAuth state')
    let tokens = await getToken(github, callback.code, { codeVerifier })
    const exchange = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(exchange.get('code')).toBe('code-from-query-string')
    expect(exchange.get('code_verifier')).toBe(codeVerifier)
    expect(tokens.refreshToken).toBe('refresh-1')

    if (tokens.refreshToken && tokens.expiresAt && Date.parse(tokens.expiresAt) <= Date.now()) {
      tokens = await refreshToken(github, tokens.refreshToken)
    }
    expect(tokens.accessToken).toBe('fresh-token')

    const profile = await request(tokens, 'https://api.github.com/user')
    expect(profile).toEqual({ login: 'ada' })
    const apiHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>
    expect(apiHeaders.Authorization).toBe('bearer fresh-token')
  })
})
