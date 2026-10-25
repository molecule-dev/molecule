/**
 * A registered token source is LIVE, not a bond-time copy.
 *
 * `setAuthTokenSource()` is how an auth bond hands the app's session to `@molecule/app-http`.
 * Reading it once (at bond time) or on auth events is not enough: `authClient.setSession()`
 * emits no event, and a session re-adopted for the same profile notifies no subscriber, so a
 * copied token keeps sending the PREVIOUS account's bearer. The client therefore resolves the
 * source on every request, and `getAuthToken()` reports what the next request will carry. A
 * client that predates `setAuthTokenResolver` is followed through a request interceptor.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbondSingleton } from '@molecule/app-bond'

import type { HttpClient } from '../client.js'
import { createFetchClient } from '../provider.js'
import { getClient, setAuthTokenSource, setClient } from '../utilities.js'

/** The `Authorization` header of every request that reached the fake network. */
let seen: Array<string | null> = []

const mockFetch = vi.fn(async (_input: RequestInfo | URL, init: RequestInit = {}) => {
  seen.push(new Headers(init.headers).get('authorization'))
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockClear()
  seen = []
})

afterEach(() => {
  vi.unstubAllGlobals()
  setAuthTokenSource(null)
  unbondSingleton('http-client')
})

describe('a registered token source is resolved per request', () => {
  it('follows the source on every request of an already bonded client', async () => {
    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)
    let sessionToken: string | null = 'tok-alice'
    setAuthTokenSource(() => sessionToken)

    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-alice')

    sessionToken = 'tok-bob'
    await client.get('/users/me')
    expect(seen.at(-1), 'the adopted session’s token').toBe('Bearer tok-bob')

    sessionToken = null
    await client.get('/users/me')
    expect(seen.at(-1), 'no body token: no Authorization header').toBeNull()
  })

  it('reaches a client bonded AFTER the source was registered', async () => {
    let sessionToken: string | null = 'tok-restored'
    setAuthTokenSource(() => sessionToken)

    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)

    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-restored')

    sessionToken = 'tok-rotated'
    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-rotated')
  })

  it('reports the resolved token from getAuthToken(), with no request in between', async () => {
    let sessionToken: string | null = 'tok-alice'
    setAuthTokenSource(() => sessionToken)
    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)

    expect(client.getAuthToken()).toBe('tok-alice')
    sessionToken = 'tok-bob'
    expect(client.getAuthToken()).toBe('tok-bob')
    sessionToken = null
    expect(client.getAuthToken()).toBeNull()
  })

  it('control: once the source is cleared, setAuthToken() decides the token again', async () => {
    let sessionToken: string | null = 'tok-session'
    setAuthTokenSource(() => sessionToken)
    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)
    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-session')

    setAuthTokenSource(null)
    client.setAuthToken('tok-static')
    sessionToken = 'tok-ignored'

    await client.get('/users/me')
    expect(seen.at(-1), 'the static token, not the cleared source').toBe('Bearer tok-static')
  })

  it('control: a client with no source still sends its static token', async () => {
    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)
    client.setAuthToken('tok-static')

    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-static')
  })

  it('removing the source keeps the token it last returned, not the bond-time copy', async () => {
    let sessionToken: string | null = 'tok-alice'
    setAuthTokenSource(() => sessionToken)
    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)

    sessionToken = 'tok-bob'
    setAuthTokenSource(null)
    sessionToken = 'tok-ignored'

    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-bob')
    expect(client.getAuthToken()).toBe('tok-bob')
  })

  it('a replaced source is the one that is followed', async () => {
    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)
    setAuthTokenSource(() => 'tok-alice')
    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-alice')

    let second: string | null = 'tok-bob'
    setAuthTokenSource(() => second)
    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-bob')
    second = 'tok-carol'
    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-carol')
  })

  it('reaches the fallback getClient() returns while no client is bonded', async () => {
    // An app that bonds no client sends every request through this fallback.
    let sessionToken: string | null = 'tok-restored'
    setAuthTokenSource(() => sessionToken)
    const fallback = getClient()

    await fallback.get('http://api.test/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-restored')
    sessionToken = 'tok-adopted'
    await fallback.get('http://api.test/users/me')
    expect(seen.at(-1), 'a session adopted with no auth event').toBe('Bearer tok-adopted')

    // A source registered after the fallback exists reaches it as well.
    setAuthTokenSource(() => 'tok-second')
    await fallback.get('http://api.test/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-second')
  })

  it('control: sends the resolved token with the client’s own authScheme', async () => {
    const client = createFetchClient({ baseURL: 'http://api.test', authScheme: 'Token' })
    setClient(client)
    setAuthTokenSource(() => 'tok-alice')

    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Token tok-alice')
  })

  it('keeps the precedence a static token had over a per-request Authorization', async () => {
    let sessionToken: string | null = 'tok-alice'
    const client = createFetchClient({ baseURL: 'http://api.test' })
    setClient(client)
    setAuthTokenSource(() => sessionToken)

    // This transport's own token wins over a request header, as a static token always did …
    await client.get('/users/me', { headers: { Authorization: 'Basic explicit' } })
    expect(seen.at(-1)).toBe('Bearer tok-alice')
    // … and with no session token the request's own header is sent as given.
    sessionToken = null
    await client.get('/users/me', { headers: { Authorization: 'Basic explicit' } })
    expect(seen.at(-1)).toBe('Basic explicit')
  })
})

/**
 * A client written against the interface before `setAuthTokenResolver` existed: interceptors,
 * then its own static token — the shape `createFetchClient` itself has always had.
 */
function createResolverlessClient(): HttpClient {
  const inner = createFetchClient({ baseURL: 'http://api.test' })
  return {
    baseURL: inner.baseURL,
    defaultHeaders: inner.defaultHeaders,
    request: (config) => inner.request(config),
    get: (url, config) => inner.get(url, config),
    post: (url, data, config) => inner.post(url, data, config),
    put: (url, data, config) => inner.put(url, data, config),
    patch: (url, data, config) => inner.patch(url, data, config),
    delete: (url, config) => inner.delete(url, config),
    addRequestInterceptor: (interceptor) => inner.addRequestInterceptor(interceptor),
    addResponseInterceptor: (interceptor) => inner.addResponseInterceptor(interceptor),
    addErrorInterceptor: (interceptor) => inner.addErrorInterceptor(interceptor),
    setAuthToken: (token) => inner.setAuthToken(token),
    getAuthToken: () => inner.getAuthToken(),
    onAuthError: (handler) => inner.onAuthError(handler),
  }
}

describe('a client without setAuthTokenResolver', () => {
  it('follows the source through a request interceptor, on the very next request', async () => {
    let sessionToken: string | null = 'tok-alice'
    setAuthTokenSource(() => sessionToken)
    const client = createResolverlessClient()
    setClient(client)

    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-alice')

    sessionToken = 'tok-bob'
    await client.get('/users/me')
    expect(seen.at(-1), 'a session adopted with no auth event').toBe('Bearer tok-bob')

    sessionToken = null
    await client.get('/users/me')
    expect(seen.at(-1), 'no body token: no Authorization header').toBeNull()
  })

  it('stops following a removed source, and adds one interceptor however often it is bonded', async () => {
    const client = createResolverlessClient()
    const added = vi.spyOn(client, 'addRequestInterceptor')
    setClient(client)
    let sessionToken: string | null = 'tok-alice'
    setAuthTokenSource(() => sessionToken)
    setAuthTokenSource(() => sessionToken)
    setClient(client)
    expect(added).toHaveBeenCalledTimes(1)

    setAuthTokenSource(null)
    client.setAuthToken('tok-static')
    sessionToken = 'tok-ignored'
    await client.get('/users/me')
    expect(seen.at(-1)).toBe('Bearer tok-static')
  })
})
