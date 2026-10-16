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

import {
  createFetchClient,
  getClient as getHttpClient,
  setAuthGate,
  setClient as setHttpClient,
} from '@molecule/app-http'

import {
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../auth.js'

afterEach(() => {
  vi.unstubAllGlobals()
  delete (globalThis as { document?: unknown }).document
  setAuthGate(null)
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

/**
 * The fetch-before-restore race (X1 xr-molecule-flash-m95 +57:23): a page effect runs
 * while `initialize()` is still restoring the session, so its request leaves without the
 * Authorization header and the server answers for an anonymous viewer. These tests hold
 * the restore open and assert the request has not gone out yet.
 */
describe('the default auth bonds hold requests until the session restore settles', () => {
  /** A restore this test releases by hand. */
  const heldRestore = (): {
    started: () => Promise<void>
    release: () => void
  } => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    return {
      started: async () => gate,
      release: () => release(),
    }
  }

  const jsonResponse = (body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  const tick = async (): Promise<void> => {
    await Promise.resolve()
    await Promise.resolve()
  }

  it('createDefaultAuthClientWithHttpSync: a request waits for the restore', async () => {
    const httpClient = createFetchClient({ baseURL: 'http://api.test' })
    setHttpClient(httpClient)
    // The restore probes the current-user endpoint because the presence hint is set.
    ;(globalThis as { document?: unknown }).document = { cookie: 'mol_auth=1' }
    const restore = heldRestore()
    const mockFetch = vi.fn(async (url: string) =>
      String(url).includes('/users/me')
        ? (await restore.started(), jsonResponse({ user: { id: 'u1', username: 'alice' } }))
        : jsonResponse({}),
    )
    vi.stubGlobal('fetch', mockFetch)

    const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync({
      currentUserEndpoint: '/users/me',
    })
    setupAuthDefault()
    const initialized = authClient.initialize()

    const request = httpClient.get('/profiles/alice')
    await tick()
    // Only the restore has gone out; the profile request is waiting for it.
    expect(mockFetch).toHaveBeenCalledTimes(1)

    restore.release()
    await initialized
    await request

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(String(mockFetch.mock.calls[1]?.[0])).toContain('/profiles/alice')
  })

  it('createDefaultAuthClientWithFetchClient: a request waits for the restore', async () => {
    ;(globalThis as { document?: unknown }).document = { cookie: 'mol_auth=1' }
    const restore = heldRestore()
    const mockFetch = vi.fn(async (url: string) =>
      String(url).includes('/users/me')
        ? (await restore.started(), jsonResponse({ user: { id: 'u1', username: 'alice' } }))
        : jsonResponse({}),
    )
    vi.stubGlobal('fetch', mockFetch)

    const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient(
      { currentUserEndpoint: '/users/me' },
      { baseURL: 'http://api.test' },
    )
    setupAuthDefault()
    const initialized = authClient.initialize()

    const request = getHttpClient().get('/feed')
    await tick()
    expect(mockFetch).toHaveBeenCalledTimes(1)

    restore.release()
    await initialized
    await request

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(String(mockFetch.mock.calls[1]?.[0])).toContain('/feed')
  })

  it('a request made after the restore settles is not held at all', async () => {
    const httpClient = createFetchClient({ baseURL: 'http://api.test' })
    setHttpClient(httpClient)
    const mockFetch = vi.fn(async () => jsonResponse({}))
    vi.stubGlobal('fetch', mockFetch)

    const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync({
      currentUserEndpoint: '/users/me',
    })
    setupAuthDefault()
    await authClient.initialize()

    await httpClient.get('/feed')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
