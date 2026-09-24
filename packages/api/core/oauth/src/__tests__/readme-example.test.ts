/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the GitHub bond, with only
 * the network (`fetch`, used by `@molecule/api-http`) stubbed.
 *
 * @module
 */
import { createHash, randomBytes } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-github'

import type { OAuthProviderConfig, OAuthUserProps } from '../index.js'

const jsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('OAUTH_GITHUB_CLIENT_ID', 'test-client-id')
    vi.stubEnv('OAUTH_GITHUB_CLIENT_SECRET', 'test-client-secret')
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('bonds the named provider, builds a state+PKCE authorize URL, and verifies the code', async () => {
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) =>
      String(url).includes('access_token')
        ? jsonResponse({ access_token: 'gho_test', token_type: 'bearer', scope: 'read:user' })
        : jsonResponse({ id: 42, login: 'ada', name: 'Ada', email: 'ada@example.com' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const github: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
    bond('oauth', serverName, github)

    const state = randomBytes(32).toString('hex')
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const redirectUri = `${process.env.APP_ORIGIN}/`
    const provider = get<OAuthProviderConfig>('oauth', 'github')
    const authorizeUrl = provider?.getAuthorizeUrl?.({
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
      redirectUri,
    })

    const url = new URL(authorizeUrl ?? '')
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
    expect(url.searchParams.get('state')).toBe(state)
    expect(url.searchParams.get('code_challenge')).toBe(codeChallenge)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/')

    const callback = { code: 'code-from-query-string', state }
    if (callback.state !== state) throw new Error('Invalid OAuth state')
    const props: OAuthUserProps | null = await github.verify(
      callback.code,
      codeVerifier,
      redirectUri,
    )
    const trustedEmail = props?.emailVerified === true ? props.email : undefined

    expect(props).toMatchObject({ username: 'ada@github', oauthServer: 'github', oauthId: '42' })
    expect(trustedEmail).toBe('ada@example.com')

    const tokenBody = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(tokenBody.get('code')).toBe('code-from-query-string')
    expect(tokenBody.get('code_verifier')).toBe(codeVerifier)
    expect(tokenBody.get('redirect_uri')).toBe(redirectUri)
  })
})
