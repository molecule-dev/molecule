import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { UserProfile } from '../types.js'

/**
 * A `StorageAdapter` over an object, enough for the token/state tests.
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
 * A JWT with an `exp` far enough out that `initialize()` does not treat it as expired.
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

describe('AuthState.status', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts loading, then reports authenticated once the restore settles', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createMockJWT())
    client.setUser(user)

    expect(client.getState().status).toBe('loading')

    await client.initialize()

    expect(client.getState().status).toBe('authenticated')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('validateSession keeps the session and reports unavailable when the server cannot answer', async () => {
    const storage = createMockStorage()
    const token = createMockJWT()
    const client = createJWTAuthClient({ storage })
    client.setAccessToken(token)
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('network down')))

    await client.validateSession()

    expect(client.getState().status).toBe('unavailable')
    expect(client.getState().user).toEqual(user)
    expect(client.isAuthenticated()).toBe(true)
    expect(client.getAccessToken()).toBe(token)
  })

  it('validateSession keeps the session when the request is ABORTED (status 0, not a 401)', async () => {
    // A route change tearing the current-user request down arrives as an
    // AbortError with no HTTP status. It is not the server rejecting the
    // credential, so the session must survive it.
    const storage = createMockStorage()
    const token = createMockJWT()
    const client = createJWTAuthClient({ storage })
    client.setAccessToken(token)
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() =>
      Promise.reject(new DOMException('The operation was aborted', 'AbortError')),
    )

    await client.validateSession()

    expect(client.getState().status).toBe('unavailable')
    expect(client.isAuthenticated()).toBe(true)
    expect(client.getAccessToken()).toBe(token)
    expect(client.getUser()).toEqual(user)
  })

  it('validateSession keeps the session on a 5xx too', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createMockJWT())
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => createMockResponse({ error: 'down' }, 503))

    await client.validateSession()

    expect(client.getState().status).toBe('unavailable')
    expect(client.getAccessToken()).not.toBeNull()
  })

  it('validateSession clears a dead token on 401 and becomes unauthenticated', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, currentUserEndpoint: '/user' })
    client.setAccessToken(createMockJWT())
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => createMockResponse({ error: 'invalid token' }, 401))

    await client.validateSession()

    expect(client.getState().status).toBe('unauthenticated')
    expect(client.isAuthenticated()).toBe(false)
    expect(client.getAccessToken()).toBeNull()
    expect(storage.getItem('molecule:auth:user')).toBeNull()
  })

  it('validateSession clears a dead token on 403 too', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createMockJWT())
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => createMockResponse({ error: 'forbidden' }, 403))

    await client.validateSession()

    expect(client.getState().status).toBe('unauthenticated')
    expect(client.getAccessToken()).toBeNull()
  })

  it('validateSession KEEPS the token and user on a 404 and names currentUserEndpoint', async () => {
    // xr-molecule-flash-m159: an app served its own current-user route and
    // rewrote `authConfig` without `currentUserEndpoint`, so the default
    // `/users/me` answered 404. A route-not-found says nothing about the token —
    // the old all-4xx rule destroyed a valid stored session on every reload.
    const storage = createMockStorage()
    const token = createMockJWT()
    const client = createJWTAuthClient({ storage, currentUserEndpoint: '/user' })
    client.setAccessToken(token)
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() =>
      createMockResponse({ errors: { route: ['not found'] } }, 404),
    )

    await client.validateSession()

    expect(client.getState().status).toBe('unavailable')
    expect(client.isAuthenticated()).toBe(true)
    expect(client.getAccessToken()).toBe(token)
    expect(client.getUser()).toEqual(user)
    expect(client.getState().error).toContain('currentUserEndpoint')
    // The stored user survives too, so a later reload still restores it.
    expect(storage.getItem('molecule:auth:user')).toBe(JSON.stringify(user))
  })

  it('validateSession confirms a live session and caches the server user', async () => {
    const fresh = { ...user, email: 'new@example.com' }
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createMockJWT())
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: fresh }))

    await client.validateSession()

    expect(client.getState().status).toBe('authenticated')
    expect(client.getUser()).toEqual(fresh)
  })

  it('validateSession keeps the SAME user object and stays silent when the profile is unchanged', async () => {
    // xr-molecule-flash-m173: the deployed Settings form re-seeded itself from `user` and wiped
    // what the test had typed, because every background verification handed subscribers a fresh
    // object carrying the same data. A user reference changes only when its data changes.
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createMockJWT())
    client.setUser(user)
    await client.initialize()
    const before = client.getUser()
    const listener = vi.fn()
    client.subscribe(listener)
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: { ...user } }))

    await client.validateSession()

    expect(client.getUser()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it('validateSession hands a changed profile to listeners once, as a new object', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createMockJWT())
    client.setUser(user)
    await client.initialize()
    const before = client.getUser()
    const listener = vi.fn()
    client.subscribe(listener)
    mockFetch.mockImplementationOnce(() =>
      createMockResponse({ user: { ...user, bio: 'Updated bio' } }),
    )

    await client.validateSession()

    expect(client.getUser()).not.toBe(before)
    expect(client.getUser()?.bio).toBe('Updated bio')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].user).toBe(client.getUser())
  })

  it('validateSession with no token settles as unauthenticated without a request', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })

    await client.validateSession()

    expect(client.getState().status).toBe('unauthenticated')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('reports unauthenticated after an explicit logout, from any prior status', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createMockJWT())
    client.setUser(user)
    await client.initialize()
    expect(client.getState().status).toBe('authenticated')
    mockFetch.mockImplementationOnce(() => createMockResponse({}))

    await client.logout()

    expect(client.getState().status).toBe('unauthenticated')
  })
})

describe('AuthClientConfig.tokenKey', () => {
  it('stores the access token under the exact key and everything else under the prefix', () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, tokenKey: 'jwtToken' })

    client.setAccessToken('the-token')
    client.setUser(user)

    expect(storage.getItem('jwtToken')).toBe('the-token')
    expect(storage.getItem('molecule:auth:accessToken')).toBeNull()
    expect(storage.getItem('molecule:auth:user')).toBe(JSON.stringify(user))
    expect(client.getAccessToken()).toBe('the-token')
  })
})
