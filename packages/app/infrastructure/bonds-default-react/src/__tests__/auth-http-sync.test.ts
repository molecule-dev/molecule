/**
 * The http-token sync must mirror the auth client's token EXACTLY — including
 * null. Cookie-session APIs (the `@molecule/api-resource-user` model) return no
 * body `accessToken` (the credential is the httpOnly cookie), so after login
 * the auth client's token is null. The old `if (token)` guard kept whatever
 * bearer the http client already held — e.g. a guest session's WS ticket — and
 * the server prefers the Authorization header over the fresh cookie, so every
 * request kept authenticating as the PRIOR (possibly deleted) session and
 * 401'd. Regression for the molecule-dev "Unauthorized after logging in as a
 * guest" bug class.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient, setClient as setHttpClient } from '@molecule/app-http'

import { createDefaultAuthClientWithHttpSync } from '../auth.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createDefaultAuthClientWithHttpSync', () => {
  it('clears a stale http bearer when login returns no body token (cookie-session API)', async () => {
    const httpClient = createFetchClient({ baseURL: 'http://api.test' })
    setHttpClient(httpClient)
    // Simulate a pre-login bearer from a previous session (e.g. a guest ticket).
    httpClient.setAuthToken('stale-guest-ticket')

    const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync({
      loginEndpoint: '/users/log-in',
    })
    setupAuthDefault()

    // Cookie-session login response: user in `props`, NO accessToken in the body
    // (the real API carries the token only in the httpOnly cookie / header).
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ props: { id: 'u1', username: 'real-user' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    )

    await authClient.login({ email: 'user@example.com', password: 'pw' })

    expect(authClient.getAccessToken()).toBeNull()
    expect(httpClient.getAuthToken()).toBeNull()
  })

  it('propagates a real body token to the http client on login', async () => {
    const httpClient = createFetchClient({ baseURL: 'http://api.test' })
    setHttpClient(httpClient)
    httpClient.setAuthToken('stale-guest-ticket')

    const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync({
      loginEndpoint: '/users/log-in',
    })
    setupAuthDefault()

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ accessToken: 'fresh-token', user: { id: 'u1', username: 'u' } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    )

    await authClient.login({ email: 'user@example.com', password: 'pw' })

    expect(httpClient.getAuthToken()).toBe('fresh-token')
  })
})
