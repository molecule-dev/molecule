/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the network (`fetch` to GitHub) is
 * stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { OAuthConfig } from '@molecule/api-oauth-client'
import { getAuthorizationUrl, getToken, request, setProvider } from '@molecule/api-oauth-client'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the authorize URL, exchanges the code and calls the API', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      if (String(input) === 'https://github.com/login/oauth/access_token') {
        return new Response('access_token=gho_test&token_type=bearer&scope=read%3Auser', {
          status: 200,
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        })
      }
      return new Response(JSON.stringify({ login: 'ada' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ clientAuthMethod: 'body', timeout: 10_000 }))

    const github: OAuthConfig = {
      id: 'github',
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      redirectUri: 'https://app.example.com/oauth/github/callback',
      scopes: ['read:user'],
    }

    const state = crypto.randomUUID()
    const authUrl = getAuthorizationUrl(github, { state })

    async function handleCallback(code: string): Promise<unknown> {
      const tokens = await getToken(github, code)
      return request(tokens, 'https://api.github.com/user')
    }

    const parsed = new URL(authUrl)
    expect(parsed.origin + parsed.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(parsed.searchParams.get('state')).toBe(state)
    expect(parsed.searchParams.get('scope')).toBe('read:user')
    expect(parsed.searchParams.get('response_type')).toBe('code')

    await expect(handleCallback('code-123')).resolves.toEqual({ login: 'ada' })

    const tokenBody = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(tokenBody.get('grant_type')).toBe('authorization_code')
    expect(tokenBody.get('code')).toBe('code-123')
    const apiInit = fetchMock.mock.calls[1]?.[1]
    expect((apiInit?.headers as Record<string, string>).Authorization).toBe('bearer gho_test')
  })
})
