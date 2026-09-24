/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the network (`fetch` to Apple's token and
 * JWKS endpoints, reached through the real `@molecule/api-http` default
 * client) is stubbed; the client-secret JWT and ID-token verification run for
 * real against locally generated keys.
 *
 * @module
 */
import { generateKeyPairSync, randomBytes } from 'node:crypto'

import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import type { OAuthProviderConfig } from '@molecule/api-oauth'

import { getAuthorizeUrl, resetJwksCache, serverName, verify } from '../index.js'

const appleSigningKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
const teamKey = generateKeyPairSync('ec', { namedCurve: 'P-256' })

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    resetJwksCache()
    process.env = {
      ...originalEnv,
      OAUTH_APPLE_CLIENT_ID: 'com.example.app.web',
      OAUTH_APPLE_TEAM_ID: 'TEAM123456',
      OAUTH_APPLE_KEY_ID: 'KEY1234567',
      OAUTH_APPLE_PRIVATE_KEY: teamKey.privateKey
        .export({ format: 'pem', type: 'pkcs8' })
        .toString(),
      APP_ORIGIN: 'https://app.example.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it('bonds the provider, builds the form_post authorize URL and verifies the code', async () => {
    const idToken = jwt.sign(
      { sub: '001234.abcd', email: 'ada@privaterelay.appleid.com', email_verified: 'true' },
      appleSigningKey.privateKey,
      {
        algorithm: 'RS256',
        keyid: 'apple-kid-1',
        issuer: 'https://appleid.apple.com',
        audience: 'com.example.app.web',
        expiresIn: 600,
      },
    )
    const jwk = { ...appleSigningKey.publicKey.export({ format: 'jwk' }), kid: 'apple-kid-1' }
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const body =
        String(input) === 'https://appleid.apple.com/auth/token'
          ? { access_token: 'a.test', expires_in: 3600, id_token: idToken, token_type: 'Bearer' }
          : { keys: [jwk] }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const apple: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
    bond('oauth', serverName, apple)

    const state = randomBytes(32).toString('hex')
    const redirectUri = `${process.env.APP_ORIGIN ?? 'https://app.example.com'}/auth/apple/callback`
    const authorizeUrl = getAuthorizeUrl({ state, redirectUri })

    const user = await verify('code-from-form-post-body', undefined, redirectUri)

    expect(get<OAuthProviderConfig>('oauth', 'apple')).toBe(apple)
    const url = new URL(authorizeUrl ?? '')
    expect(url.origin + url.pathname).toBe('https://appleid.apple.com/auth/authorize')
    expect(url.searchParams.get('response_mode')).toBe('form_post')
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/auth/apple/callback')
    expect(url.searchParams.get('state')).toBe(state)
    expect(url.searchParams.has('code_challenge')).toBe(false)

    expect(user).toMatchObject({
      username: 'ada@privaterelay.appleid.com@apple',
      email: 'ada@privaterelay.appleid.com',
      emailVerified: true,
      oauthServer: 'apple',
      oauthId: '001234.abcd',
    })

    const tokenBody = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(tokenBody.get('code')).toBe('code-from-form-post-body')
    expect(tokenBody.get('redirect_uri')).toBe('https://app.example.com/auth/apple/callback')
    const clientSecret = jwt.verify(
      tokenBody.get('client_secret') ?? '',
      teamKey.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      { algorithms: ['ES256'] },
    )
    expect(clientSecret).toMatchObject({ iss: 'TEAM123456', sub: 'com.example.app.web' })
  })
})
