/**
 * A stored session renders immediately; verification settles behind it.
 *
 * xr-molecule-flash-m177: an app held its first paint until its own `GET /user`
 * settled, so every one of ~30 page loads in a pagination spec waited an API round
 * trip — the four tests that create 15 articles through the editor finished at
 * 15.0–15.9 s of a 15 s budget and the grading machine timed two out. The client
 * already has the session in storage; it must paint it without a request, and only
 * an explicit 401/403 may sign the user out.
 */
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
 * A JWT whose `exp` is `seconds` from now (negative for an expired one).
 *
 * @param seconds - Seconds until expiry.
 * @returns The token.
 */
const createJWT = (seconds: number): string =>
  [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })),
    btoa('mock-signature'),
  ].join('.')

const user: UserProfile = { id: 'ann', email: 'ann@example.com', name: 'Ann' }
const freshUser: UserProfile = { id: 'ann', email: 'new@example.com', name: 'Ann' }

/** The wire user a RealWorld-shaped API answers with — no `id`, no `name`. */
const wireUser = { username: 'ann', email: 'ann@example.com' }

/**
 * The adapter xr-molecule-flash-m184's app wrote: it gives the wire user an `id`
 * and a `name` and keeps the raw object nested. A reload that stored the raw
 * current-user answer lost both.
 *
 * @param data - The parsed answer.
 * @returns The adapted auth result.
 */
const mapAuthResponse = (data: unknown): { accessToken: string; user: UserProfile } => {
  const answer = data as { user?: typeof wireUser; accessToken?: string }
  const wire = answer.user ?? ({ username: 'ann', email: 'ann@example.com' } as typeof wireUser)
  return {
    accessToken: answer.accessToken ?? 'token',
    user: {
      id: wire.username,
      name: wire.username,
      email: wire.email,
      // the raw wire user kept nested, as the real adapter does
      user: wire,
    } as UserProfile,
  }
}

describe('a stored session is authenticated on the first render', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as { document?: unknown }).document
  })

  it('sets `authenticated` synchronously when a token and a user are stored', () => {
    const client = createJWTAuthClient({ storage: createMockStorage() })
    client.setAccessToken(createJWT(3600))
    client.setUser(user)

    // Not awaited: the state the FIRST render reads.
    void client.initialize()

    expect(client.getState()).toMatchObject({
      status: 'authenticated',
      initialized: true,
      authenticated: true,
      user,
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('renders an expired stored token optimistically, then signs out ONLY on a 401', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage })
    client.setAccessToken(createJWT(-60))
    client.setUser(user)
    storage.setItem('molecule:auth:refreshToken', 'refresh-token')
    mockFetch.mockImplementationOnce(() => createMockResponse({ error: 'invalid token' }, 401))

    const verification = client.initialize()

    // Before the background check answers: the stored session is rendered.
    expect(client.getState().status).toBe('authenticated')
    expect(client.isAuthenticated()).toBe(true)
    expect(client.getUser()).toEqual(user)

    await verification

    expect(client.getState().status).toBe('unauthenticated')
    expect(client.isAuthenticated()).toBe(false)
    expect(client.getAccessToken()).toBeNull()
    expect(storage.getItem('molecule:auth:user')).toBeNull()
  })

  it('keeps an expired stored session when verification fails with a 500', async () => {
    const storage = createMockStorage()
    const token = createJWT(-60)
    const client = createJWTAuthClient({ storage })
    client.setAccessToken(token)
    client.setUser(user)
    storage.setItem('molecule:auth:refreshToken', 'refresh-token')
    mockFetch.mockImplementationOnce(() => createMockResponse({ error: 'down' }, 503))

    await client.initialize()

    expect(client.getState().status).toBe('authenticated')
    expect(client.isAuthenticated()).toBe(true)
    expect(client.getAccessToken()).toBe(token)
    expect(storage.getItem('molecule:auth:user')).toBe(JSON.stringify(user))
  })

  it('stays `loading` with no stored user until the cookie restore settles', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
    const client = createJWTAuthClient({ storage: createMockStorage() })

    const initialization = client.initialize()

    expect(client.getState().status).toBe('loading')
    expect(client.getState().initialized).toBe(false)

    resolveFetch?.(await createMockResponse({ user }))
    await initialization

    expect(client.getState().status).toBe('authenticated')
    expect(client.getUser()).toEqual(user)
  })
})

describe('mapAuthResponse shapes the user on every path that adopts one', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as { document?: unknown }).document
  })

  /** The profile the adapter produces from the wire user. */
  const mappedUser = mapAuthResponse({ user: wireUser }).user

  it('validateSession stores the MAPPED user, not the raw current-user answer', async () => {
    // xr-molecule-flash-m184: after a reload the client was authenticated but the
    // adapted `id`/`name` were replaced by the raw wire user, so the profile link
    // disappeared although `GET /user` answered 200.
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, mapAuthResponse })
    client.setAccessToken(createJWT(3600))
    client.setUser(mappedUser)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: wireUser }))

    await client.validateSession()

    expect(client.getUser()).toEqual(mappedUser)
    expect(client.getUser()?.id).toBe('ann')
    expect(client.getUser()?.name).toBe('ann')
    expect(storage.getItem('molecule:auth:user')).toBe(JSON.stringify(mappedUser))
  })

  it('the cookie restore stores the MAPPED user too', async () => {
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, mapAuthResponse })
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: wireUser }))

    await client.initialize()

    expect(client.getUser()).toEqual(mappedUser)
    expect(storage.getItem('molecule:auth:user')).toBe(JSON.stringify(mappedUser))
  })

  it('the token refresh stores the MAPPED user too', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, mapAuthResponse })
    client.setAccessToken(createJWT(3600))
    client.setUser(mappedUser)
    storage.setItem('molecule:auth:refreshToken', 'refresh-token')
    await client.initialize()
    mockFetch.mockImplementationOnce(() =>
      createMockResponse({ accessToken: 'next-token', user: wireUser }),
    )

    await client.refresh()

    expect(client.getUser()).toEqual(mappedUser)
    expect(client.getAccessToken()).toBe('next-token')
    expect(storage.getItem('molecule:auth:user')).toBe(JSON.stringify(mappedUser))
  })

  it('a mapper that cannot read the answer leaves the user as it came', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({
      storage,
      mapAuthResponse: () => {
        throw new Error('not a login envelope')
      },
    })
    client.setAccessToken(createJWT(3600))
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: freshUser }))

    await client.validateSession()

    expect(client.getUser()).toEqual(freshUser)
  })
})
