/**
 * Adopting a session an exchange outside the client already established
 * (xr-molecule-flash-m178).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { UserProfile } from '../types.js'

/**
 * A `StorageAdapter` over an object, enough for these tests.
 *
 * @returns The adapter plus a direct read of the backing store.
 */
const createMockStorage = (): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  store: Record<string, string>
} => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    store,
  }
}

/**
 * A fetch-shaped response for the client's `response.ok`/`status`/`json()` reads.
 *
 * @param data - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
const createMockResponse = <T>(data: T, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })

/**
 * A JWT with an `exp` far enough out that it is not treated as expired.
 *
 * @returns The token.
 */
const createMockJWT = (): string =>
  [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    btoa('mock-signature'),
  ].join('.')

const user: UserProfile = { id: 'u1', email: 'ann@example.com', name: 'Ann' }

describe('AuthClient.setSession', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => createMockResponse({}))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('makes the client authenticated in ONE notification and stores the token and user', () => {
    // The app's own sign-in exchange (an OAuth redirect, a custom endpoint) wrote
    // `setAccessToken` + `setUser`: both setters change their own field only, so a UI reading
    // `state.authenticated` stayed signed out and nine browser assertions timed out.
    const storage = createMockStorage()
    const token = createMockJWT()
    const client = createJWTAuthClient({ storage })
    const listener = vi.fn()
    client.subscribe(listener)

    client.setSession({ accessToken: token, user })

    expect(client.isAuthenticated()).toBe(true)
    expect(client.getState().status).toBe('authenticated')
    expect(client.getState().initialized).toBe(true)
    expect(client.getState().user).toBe(user)
    expect(client.getUser()).toBe(user)
    expect(client.getAccessToken()).toBe(token)
    expect(storage.getItem('molecule:auth:user')).toBe(JSON.stringify(user))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toMatchObject({ authenticated: true, user })
  })

  it('stores a refresh token when the exchange issued one', () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })

    client.setSession({ accessToken: 'token', user, refreshToken: 'refresh' })

    expect(client.getRefreshToken()).toBe('refresh')
  })

  it('the setAccessToken + setUser pair does NOT sign the client in', () => {
    // The documented contract: the field setters change their own field only. An app that adapts
    // its own exchange must call setSession (or login/register) to adopt the session.
    const client = createJWTAuthClient({ storage: createMockStorage() })
    const listener = vi.fn()
    client.subscribe(listener)

    client.setAccessToken('token')
    client.setUser(user)

    expect(client.isAuthenticated()).toBe(false)
    expect(client.getState().status).not.toBe('authenticated')
    expect(client.getAccessToken()).toBe('token')
    expect(client.getUser()).toBe(user)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('logout clears an adopted session', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setSession({ accessToken: 'token', user })

    await client.logout()

    expect(client.isAuthenticated()).toBe(false)
    expect(client.getUser()).toBeNull()
    expect(client.getAccessToken()).toBeNull()
    expect(client.getState().status).toBe('unauthenticated')
  })
})
