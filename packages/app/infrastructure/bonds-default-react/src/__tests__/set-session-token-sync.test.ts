/**
 * The bonded HTTP client must send the session the app is in NOW.
 *
 * `authClient.setSession()` adopts a session an exchange outside the client already
 * established (an OAuth callback, a registration that answers with a session, a device
 * handoff). It emits NO auth event, and when the adopted profile carries the same data as
 * the current one it notifies no subscriber either, so a token copied at bond time or on
 * `login`/`logout` leaves every later request carrying the PREVIOUS account's bearer: the
 * server answers as Alice while the UI shows Bob.
 *
 * Both default auth bonds register `authClient.getAccessToken()` as the client's token
 * source, and the client resolves that source on EVERY request. These tests pin that at the
 * wire — the fake API records the `Authorization` header it receives — for both factories,
 * including the token-only rotation that no event and no state change would announce, an
 * OAuth callback's hand-off, a cookie session, a client the app bonds later (also one without
 * `setAuthTokenResolver`) and a custom `authScheme`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UserProfile } from '@molecule/app-auth'
import { unbondSingleton } from '@molecule/app-bond'
import type { HttpClient } from '@molecule/app-http'
import {
  createFetchClient,
  getClient as getHttpClient,
  setAuthGate,
  setAuthTokenSource,
  setClient as setHttpClient,
} from '@molecule/app-http'

import {
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
  createDefaultHttpClientWithAuthBearer,
} from '../auth.js'

const ALICE: UserProfile = { id: 'alice', name: 'Alice' }
const BOB: UserProfile = { id: 'bob', name: 'Bob' }

interface Sent {
  path: string
  authorization: string | null
}

/** Every request that reached the fake API, in order. */
let sent: Sent[] = []

/** The `Authorization` header of the last request the test made. */
const lastAuthorization = (): string | null => sent.at(-1)?.authorization ?? null

/**
 * The fake API: a sign-in answers with `signIn` (by default Alice's token session), anything
 * else with an empty body.
 *
 * @param signIn - The sign-in answer; a body with no `accessToken` is a cookie session.
 */
function stubApi(signIn: object = { accessToken: 'tok-alice', user: ALICE }): void {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://api.test')
    const headers = new Headers(
      init.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    sent.push({ path: url.pathname, authorization: headers.get('authorization') })
    const body = url.pathname === '/users/log-in' ? signIn : { ok: true }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
}

/**
 * A client written against the interface before `setAuthTokenResolver` existed (a custom or
 * older transport): it delegates to a fetch client but does not expose the resolver.
 *
 * @param inner - The client to delegate to.
 * @returns The same client without `setAuthTokenResolver`.
 */
function withoutResolver(inner: HttpClient): HttpClient {
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

const authConfig = {
  baseURL: 'http://api.test',
  authScheme: 'Bearer',
  loginEndpoint: '/users/log-in',
  currentUserEndpoint: '/users/me',
  autoRefresh: false,
}

type Factory = 'createDefaultAuthClientWithFetchClient' | 'createDefaultAuthClientWithHttpSync'

/**
 * Wire one default auth bond the way an app does.
 *
 * `createDefaultAuthClientWithFetchClient` bonds the client it creates itself;
 * `createDefaultAuthClientWithHttpSync` is wired auth-first and the app bonds its client
 * afterwards (the scaffold's order), which is also the "token reaches a client bonded later"
 * guarantee.
 */
function wire(factory: Factory) {
  const built =
    factory === 'createDefaultAuthClientWithFetchClient'
      ? createDefaultAuthClientWithFetchClient(authConfig, { baseURL: 'http://api.test' })
      : createDefaultAuthClientWithHttpSync(authConfig)
  built.setupAuthDefault()
  const http =
    factory === 'createDefaultAuthClientWithFetchClient'
      ? getHttpClient()
      : (() => {
          const client = createFetchClient({ baseURL: 'http://api.test' })
          setHttpClient(client)
          return client
        })()
  return { authClient: built.authClient, http }
}

afterEach(() => {
  vi.unstubAllGlobals()
  setAuthGate(null)
  setAuthTokenSource(null)
  unbondSingleton('http-client')
  // Each test starts signed out: a session one test stored is not restored by the next.
  localStorage.clear()
  sent = []
})

describe.each([
  'createDefaultAuthClientWithFetchClient',
  'createDefaultAuthClientWithHttpSync',
] as const)('%s', (factory) => {
  it('sends the adopted session’s token after setSession()', async () => {
    stubApi()
    const { authClient, http } = wire(factory)
    await authClient.login({ email: 'alice@example.com', password: 'pw' })

    await http.get('/users/me')
    expect(lastAuthorization(), 'the signed-in session’s bearer').toBe('Bearer tok-alice')

    // An out-of-band exchange adopts a different account.
    authClient.setSession({ accessToken: 'tok-bob', user: BOB })
    expect(authClient.getAccessToken()).toBe('tok-bob')
    expect(authClient.getState().user?.id).toBe('bob')

    await http.get('/users/me')
    expect(lastAuthorization(), 'the adopted session’s bearer').toBe('Bearer tok-bob')
  })

  it('sends the adopted session’s token when setSession() follows a logout', async () => {
    stubApi()
    const { authClient, http } = wire(factory)
    await authClient.login({ email: 'alice@example.com', password: 'pw' })
    await authClient.logout()

    await http.get('/users/me')
    expect(lastAuthorization(), 'signed out: no bearer at all').toBeNull()

    authClient.setSession({ accessToken: 'tok-bob', user: BOB })
    await http.get('/users/me')
    expect(lastAuthorization(), 'the adopted session’s bearer').toBe('Bearer tok-bob')
  })

  it('follows a token rotated for the SAME profile (no auth event, no state change)', async () => {
    stubApi()
    const { authClient, http } = wire(factory)
    await authClient.login({ email: 'alice@example.com', password: 'pw' })
    await http.get('/users/me')
    expect(lastAuthorization()).toBe('Bearer tok-alice')

    // The same profile, a new token: `sameUserData` collapses the user object, so this
    // notifies no subscriber and emits no event — only a per-request read can follow it.
    authClient.setSession({ accessToken: 'tok-alice-2', user: { ...ALICE } })
    expect(authClient.getAccessToken()).toBe('tok-alice-2')

    await http.get('/users/me')
    expect(lastAuthorization(), 'the rotated bearer').toBe('Bearer tok-alice-2')
  })

  it('control: a plain login and a plain logout are unchanged', async () => {
    stubApi()
    const { authClient, http } = wire(factory)
    await authClient.login({ email: 'alice@example.com', password: 'pw' })

    await http.get('/users/me')
    expect(lastAuthorization(), 'after login').toBe('Bearer tok-alice')
    await http.get('/users/me')
    expect(lastAuthorization(), 'a second request is unchanged').toBe('Bearer tok-alice')

    await authClient.logout()
    await http.get('/users/me')
    expect(lastAuthorization(), 'after logout the bearer is gone').toBeNull()
  })

  it('sends the token an OAuth callback adopts (setAccessToken, setUser, initialize)', async () => {
    stubApi()
    const { authClient, http } = wire(factory)
    await authClient.login({ email: 'alice@example.com', password: 'pw' })
    await http.get('/users/me')
    expect(lastAuthorization()).toBe('Bearer tok-alice')

    // `useOAuth`'s session hand-off, in its order: none of these emits a login event.
    authClient.setAccessToken('tok-bob')
    authClient.setUser(BOB)
    await authClient.initialize()

    await http.get('/users/me')
    expect(lastAuthorization(), 'the OAuth session’s bearer').toBe('Bearer tok-bob')
  })

  it('sends no Authorization once the token is cleared without an event', async () => {
    stubApi()
    const { authClient, http } = wire(factory)
    await authClient.login({ email: 'alice@example.com', password: 'pw' })

    authClient.setAccessToken(null)
    await http.get('/users/me')
    expect(lastAuthorization(), 'no stale bearer beside a cookie session').toBeNull()
  })

  it('control: sends no Authorization after a cookie-session sign-in replaces a token session', async () => {
    stubApi()
    const { authClient, http } = wire(factory)
    await authClient.login({ email: 'alice@example.com', password: 'pw' })

    stubApi({ user: BOB })
    await authClient.login({ email: 'bob@example.com', password: 'pw' })
    expect(authClient.getAccessToken()).toBeNull()

    await http.get('/users/me')
    expect(lastAuthorization(), 'the cookie is the credential').toBeNull()
  })
})

describe.each(['a fetch client', 'a client without setAuthTokenResolver'] as const)(
  '%s bonded after createDefaultAuthClientWithFetchClient',
  (kind) => {
    it('carries login, setSession and logout', async () => {
      stubApi()
      const built = createDefaultAuthClientWithFetchClient(authConfig, {
        baseURL: 'http://api.test',
      })
      built.setupAuthDefault()
      const fetchClient = createFetchClient({ baseURL: 'http://api.test' })
      const later = kind === 'a fetch client' ? fetchClient : withoutResolver(fetchClient)
      setHttpClient(later)

      await built.authClient.login({ email: 'alice@example.com', password: 'pw' })
      await later.get('/users/me')
      expect(lastAuthorization(), 'after login').toBe('Bearer tok-alice')
      expect(later.getAuthToken()).toBe('tok-alice')

      built.authClient.setSession({ accessToken: 'tok-bob', user: BOB })
      await later.get('/users/me')
      expect(lastAuthorization(), 'after setSession').toBe('Bearer tok-bob')

      await built.authClient.logout()
      await later.get('/users/me')
      expect(lastAuthorization(), 'after logout').toBeNull()
    })
  },
)

describe('createDefaultAuthClientWithHttpSync in an app that bonds no client', () => {
  /** The fallback `getClient()` returns — the client every request of such an app uses. */
  const fallback = (): HttpClient => {
    unbondSingleton('http-client')
    const client = getHttpClient()
    // One fallback serves this whole file: start it with no token of an earlier test's.
    client.setAuthToken(null)
    return client
  }

  it('carries login and a session adopted by setSession()', async () => {
    stubApi()
    const http = fallback()
    const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync(authConfig)
    setupAuthDefault()

    await authClient.login({ email: 'alice@example.com', password: 'pw' })
    await http.get('/users/me')
    expect(lastAuthorization(), 'after login').toBe('Bearer tok-alice')

    authClient.setSession({ accessToken: 'tok-bob', user: BOB })
    await http.get('/users/me')
    expect(lastAuthorization(), 'after setSession').toBe('Bearer tok-bob')
  })

  it('carries the session a reload restores', async () => {
    stubApi()
    const earlier = createDefaultAuthClientWithHttpSync(authConfig)
    earlier.setupAuthDefault()
    await earlier.authClient.login({ email: 'alice@example.com', password: 'pw' })
    setAuthTokenSource(null)
    setAuthGate(null)

    // The next page load: a new auth client restores the stored session.
    const http = fallback()
    createDefaultAuthClientWithHttpSync(authConfig).setupAuthDefault()
    await http.get('/users/me')
    expect(lastAuthorization(), 'the restored session’s bearer').toBe('Bearer tok-alice')
  })
})

describe('a custom authScheme (`Authorization: Token <jwt>`)', () => {
  it('createDefaultAuthClientWithFetchClient sends the auth config’s scheme', async () => {
    stubApi()
    const built = createDefaultAuthClientWithFetchClient(
      { ...authConfig, authScheme: 'Token' },
      { baseURL: 'http://api.test' },
    )
    built.setupAuthDefault()

    await built.authClient.login({ email: 'alice@example.com', password: 'pw' })
    await getHttpClient().get('/users/me')
    expect(lastAuthorization()).toBe('Token tok-alice')
  })

  // Before this fix the WithFetchClient row passed only because that bond never reached the
  // client bonded after it: once the bonded client carries the session token itself, it has to
  // send it with the scheme its constructor was given.
  it.each([
    'createDefaultAuthClientWithFetchClient',
    'createDefaultAuthClientWithHttpSync',
  ] as const)(
    '%s + createDefaultHttpClientWithAuthBearer({ authScheme }) keeps the scheme',
    async (factory) => {
      stubApi()
      const config = { ...authConfig, authScheme: 'Token' }
      const built =
        factory === 'createDefaultAuthClientWithFetchClient'
          ? createDefaultAuthClientWithFetchClient(config, { baseURL: 'http://api.test' })
          : createDefaultAuthClientWithHttpSync(config)
      built.setupAuthDefault()
      const bearer = createDefaultHttpClientWithAuthBearer({
        baseURL: 'http://api.test',
        getToken: () => built.authClient.getAccessToken(),
        authScheme: 'Token',
      })
      bearer.setupHttpDefault()

      await built.authClient.login({ email: 'alice@example.com', password: 'pw' })
      await bearer.httpClient.get('/users/me')
      expect(lastAuthorization(), 'after login').toBe('Token tok-alice')

      built.authClient.setSession({ accessToken: 'tok-bob', user: BOB })
      await bearer.httpClient.get('/users/me')
      expect(lastAuthorization(), 'after setSession').toBe('Token tok-bob')
    },
  )
})
