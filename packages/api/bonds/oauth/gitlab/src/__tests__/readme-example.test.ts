/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the network (`fetch` to GitLab, reached
 * through the real `@molecule/api-http` default client) is stubbed.
 *
 * @module
 */
import { createHash, randomBytes } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import type { OAuthProviderConfig } from '@molecule/api-oauth'

import { getAuthorizeUrl, serverName, verify } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OAUTH_GITLAB_CLIENT_ID: 'test-client-id',
      OAUTH_GITLAB_CLIENT_SECRET: 'test-client-secret',
      APP_ORIGIN: 'https://app.example.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it('bonds the provider, builds the authorize URL and verifies the callback code', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const body =
        String(input) === 'https://gitlab.com/oauth/token'
          ? { access_token: 'glpat-test', token_type: 'bearer', scope: 'read_user' }
          : {
              id: 583231,
              username: 'ada',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              confirmed_at: '2026-01-01T00:00:00Z',
            }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const gitlab: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
    bond('oauth', serverName, gitlab)

    const state = randomBytes(32).toString('hex')
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const redirectUri = process.env.APP_ORIGIN ?? 'https://app.example.com'
    const authorizeUrl = getAuthorizeUrl({
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
      redirectUri,
    })

    const user = await verify('code-from-callback-query', codeVerifier, redirectUri)

    expect(get<OAuthProviderConfig>('oauth', 'gitlab')).toBe(gitlab)
    const url = new URL(authorizeUrl ?? '')
    expect(url.origin + url.pathname).toBe('https://gitlab.com/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
    expect(url.searchParams.get('state')).toBe(state)
    expect(url.searchParams.get('code_challenge')).toBe(codeChallenge)
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com')

    expect(user).toMatchObject({
      username: 'ada@gitlab',
      email: 'ada@example.com',
      emailVerified: true,
      oauthServer: 'gitlab',
      oauthId: '583231',
    })
    const tokenBody = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(tokenBody.get('code')).toBe('code-from-callback-query')
    expect(tokenBody.get('code_verifier')).toBe(codeVerifier)
    expect(tokenBody.get('client_secret')).toBe('test-client-secret')
  })
})
