/**
 * The Axios transport reads the app's token source on every request.
 *
 * Axios merges the instance defaults into a request's headers BEFORE the molecule request
 * interceptor runs, so a `setAuthToken()` written during a request only reaches the next one:
 * the session token is applied to the request's own headers, after the auth gate and before the
 * app's request interceptors (which may still override it). It replaces only the header this
 * client owns — none, or its own static token — so an `Authorization` passed per request or in
 * `defaultHeaders` keeps the precedence Axios gives it, as it did over a static token.
 *
 * This suite drives a REAL Axios instance with a local adapter: the header merge the behaviour
 * depends on is Axios's own, which the captured-interceptor mock in `index.test.ts` cannot show.
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { setAuthTokenSource, setClient } from '@molecule/app-http'

import { createAxiosClient } from '../provider.js'
import type { AxiosHttpClientConfig, HttpClient } from '../types.js'

/** The `Authorization` header of every request that reached the adapter, in order. */
let sent: Array<string | null> = []

/** Records the header Axios would put on the wire, and answers 200. */
const adapter = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const value = config.headers.get('Authorization')
  sent.push(value == null ? null : String(value))
  return Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config })
}

const client = (config: AxiosHttpClientConfig = {}): HttpClient =>
  createAxiosClient({ baseURL: 'http://api.test', ...config, axiosConfig: { adapter } })

/**
 * Send one request and return the `Authorization` header it carried.
 *
 * @param http - The client to send through.
 * @param headers - The request's own headers, if any.
 * @returns The header value, or null when the request carried none.
 */
async function authorizationOf(
  http: HttpClient,
  headers?: Record<string, string>,
): Promise<string | null> {
  await http.get('/users/me', headers ? { headers } : undefined)
  return sent.at(-1) ?? null
}

afterEach(() => {
  setAuthTokenSource(null)
  sent = []
})

describe('the Axios transport resolves the token source per request', () => {
  it('sends the source’s current token on the very request that follows a change', async () => {
    let sessionToken: string | null = 'tok-alice'
    const http = client()
    http.setAuthTokenResolver?.(() => sessionToken)

    expect(await authorizationOf(http)).toBe('Bearer tok-alice')
    sessionToken = 'tok-bob'
    expect(await authorizationOf(http), 'the first request after the change').toBe('Bearer tok-bob')
  })

  it('applies the client’s own authScheme', async () => {
    const http = client({ authScheme: 'Token' })
    http.setAuthTokenResolver?.(() => 'tok-custom')

    expect(await authorizationOf(http)).toBe('Token tok-custom')
  })

  it('replaces the client’s own static token, and removes it when the source has none', async () => {
    let sessionToken: string | null = 'tok-bob'
    const http = client()
    http.setAuthToken('tok-alice')
    http.setAuthTokenResolver?.(() => sessionToken)

    expect(await authorizationOf(http), 'the source, not the static copy').toBe('Bearer tok-bob')
    sessionToken = null
    expect(await authorizationOf(http), 'no body token: no Authorization header').toBeNull()
  })

  // The next three hold the header precedence this transport had with a static token.
  it('control: keeps an Authorization passed per request, with or without a session token', async () => {
    let sessionToken: string | null = 'tok-alice'
    const http = client()
    http.setAuthTokenResolver?.(() => sessionToken)

    expect(await authorizationOf(http, { Authorization: 'Basic explicit' })).toBe('Basic explicit')
    sessionToken = null
    expect(await authorizationOf(http, { Authorization: 'Basic explicit' })).toBe('Basic explicit')
  })

  it('control: keeps an Authorization from defaultHeaders, with or without a session token', async () => {
    let sessionToken: string | null = 'tok-alice'
    const http = client({ defaultHeaders: { Authorization: 'ApiKey constructor' } })
    http.setAuthTokenResolver?.(() => sessionToken)

    expect(await authorizationOf(http)).toBe('ApiKey constructor')
    sessionToken = null
    expect(await authorizationOf(http)).toBe('ApiKey constructor')
  })

  it('control: lets a request interceptor still override the session token', async () => {
    const http = client()
    http.setAuthTokenResolver?.(() => 'tok-alice')
    http.addRequestInterceptor((config) => {
      config.headers = { ...config.headers, Authorization: 'Interceptor value' }
      return config
    })

    expect(await authorizationOf(http)).toBe('Interceptor value')
  })

  it('reports the resolved token from getAuthToken()', () => {
    let sessionToken: string | null = 'tok-alice'
    const http = client()
    http.setAuthTokenResolver?.(() => sessionToken)

    expect(http.getAuthToken()).toBe('tok-alice')
    sessionToken = 'tok-bob'
    expect(http.getAuthToken()).toBe('tok-bob')
  })

  it('follows a source registered through @molecule/app-http on the client it bonds', async () => {
    let sessionToken: string | null = 'tok-restored'
    setAuthTokenSource(() => sessionToken)
    const http = client()
    setClient(http)

    expect(await authorizationOf(http)).toBe('Bearer tok-restored')
    sessionToken = 'tok-adopted'
    expect(await authorizationOf(http), 'a session adopted with no auth event').toBe(
      'Bearer tok-adopted',
    )
  })
})

describe('control: without a resolver the transport behaves as before', () => {
  it('sends the static token, and setAuthToken(null) removes it', async () => {
    const http = client()
    http.setAuthToken('tok-static')
    expect(await authorizationOf(http)).toBe('Bearer tok-static')
    expect(http.getAuthToken()).toBe('tok-static')

    http.setAuthToken(null)
    expect(await authorizationOf(http)).toBeNull()
    expect(http.getAuthToken()).toBeNull()
  })

  it('sends a per-request and a defaultHeaders Authorization as given', async () => {
    expect(await authorizationOf(client(), { Authorization: 'Basic explicit' })).toBe(
      'Basic explicit',
    )
    const withDefault = client({ defaultHeaders: { Authorization: 'ApiKey constructor' } })
    expect(await authorizationOf(withDefault)).toBe('ApiKey constructor')
  })
})
