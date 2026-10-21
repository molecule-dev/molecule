/**
 * `status` is a DECISION, not a busy flag: an auth request in flight on an
 * initialized client keeps the status the client had already decided.
 *
 * The observed failure (xr-molecule-flash-m380): `deriveStatus` returned
 * `'loading'` whenever `state.loading` was true, so `login()`/`register()` turned
 * every initialized signed-out client into `'loading'` for the whole request. The
 * generated shell rendered a bare navbar on `status === 'loading'` (no `<Outlet>`),
 * which unmounted the Login page mid-request — its 401 error list was set on a page
 * nobody could see, and the builder lost ≥19 minutes probing it.
 *
 * `'loading'` now means "no decision yet" (`!initialized`) only; progress stays on
 * `AuthState.loading`. The negative controls below pin the behaviour that must NOT
 * change: an uninitialized client is still `'loading'`, `'unavailable'` is still
 * sticky, and `validateSession` settles exactly as before.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthState, UserProfile } from '../types.js'

/**
 * A `StorageAdapter` over an object.
 *
 * @returns The adapter.
 */
const createMockStorage = (): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
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
  }
}

/**
 * A real `Response`, so `ok`/`status`/`json()` take the browser's path.
 *
 * @param body - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/**
 * A JWT whose `exp` is an hour out, so a restore does not treat it as expired.
 *
 * @returns The token.
 */
const createJWT = (): string =>
  [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    btoa('mock-signature'),
  ].join('.')

const user: UserProfile = { id: 'u1', email: 'ann@example.com', name: 'Ann' }

describe('AuthState.status keeps the decided status while a sign-in runs (xr-molecule-flash-m380)', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as { document?: unknown }).document
  })

  /**
   * An initialized, signed-out client plus every state it announces.
   *
   * @returns The client and the recorded notifications.
   */
  const initializedSignedOut = async (): Promise<{
    client: ReturnType<typeof createJWTAuthClient>
    seen: AuthState<UserProfile>[]
  }> => {
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })
    await client.initialize()
    expect(client.getState()).toMatchObject({
      status: 'unauthenticated',
      initialized: true,
      authenticated: false,
    })
    const seen: AuthState<UserProfile>[] = []
    client.subscribe((state) => seen.push({ ...state }))
    return { client, seen }
  }

  it('stays `unauthenticated` at EVERY notify when login is rejected with 401', async () => {
    const { client, seen } = await initializedSignedOut()
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401)),
    )

    await expect(client.login({ email: user.email, password: 'wrong' })).rejects.toThrow()

    // The request went out (loading true) and settled (loading false) — and the
    // status never left the decision the client had already made.
    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen.map((state) => state.status)).toEqual(seen.map(() => 'unauthenticated'))
    expect(seen[0].loading).toBe(true)
    expect(seen[seen.length - 1].loading).toBe(false)

    expect(client.getState()).toMatchObject({
      status: 'unauthenticated',
      initialized: true,
      authenticated: false,
      loading: false,
    })
    expect(client.getState().error).toBeTruthy()
  })

  it('stays `unauthenticated` at EVERY notify when register is rejected with 422', async () => {
    const { client, seen } = await initializedSignedOut()
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse({ errors: { email: ['has already been taken'] } }, 422)),
    )

    await expect(
      client.register({ email: user.email, password: 'secret', name: user.name }),
    ).rejects.toThrow()

    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen.map((state) => state.status)).toEqual(seen.map(() => 'unauthenticated'))
    expect(seen[0].loading).toBe(true)
    expect(seen[seen.length - 1].loading).toBe(false)

    expect(client.getState()).toMatchObject({
      status: 'unauthenticated',
      initialized: true,
      authenticated: false,
      loading: false,
    })
    expect(client.getState().error).toBeTruthy()
  })

  it('a successful login still goes unauthenticated → authenticated', async () => {
    const { client, seen } = await initializedSignedOut()
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse({ user, accessToken: 't' })),
    )

    await client.login({ email: user.email, password: 'secret' })

    expect(seen.map((state) => state.status)).toEqual(['unauthenticated', 'authenticated'])
    expect(client.getState()).toMatchObject({
      status: 'authenticated',
      authenticated: true,
      user,
    })
  })

  it('NEGATIVE CONTROL: a client whose restore has not settled is still `loading`', async () => {
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
    let settleRestore: ((value: Response) => void) | undefined
    mockFetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          settleRestore = resolve
        }),
    )
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })

    expect(client.getState()).toMatchObject({ status: 'loading', initialized: false })

    settleRestore?.(jsonResponse({ user }))
    await client.whenRestored()

    expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true })
  })

  it('NEGATIVE CONTROL: `unavailable` is sticky across a failed login with a stored token', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })
    client.setAccessToken(createJWT())
    client.setUser(user)
    await client.initialize()
    // A network failure during verification: the token is kept, the session is
    // not confirmed.
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('network down')))
    await client.validateSession()
    expect(client.getState().status).toBe('unavailable')

    const seen: AuthState<UserProfile>[] = []
    client.subscribe((state) => seen.push({ ...state }))
    mockFetch.mockImplementationOnce(() => Promise.resolve(jsonResponse({ error: 'denied' }, 401)))

    await expect(client.login({ email: user.email, password: 'wrong' })).rejects.toThrow()

    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen.map((state) => state.status)).toEqual(seen.map(() => 'unavailable'))
    expect(client.getState().status).toBe('unavailable')
    expect(client.getAccessToken()).not.toBeNull()
  })

  it('NEGATIVE CONTROL: a successful login still DECIDES an `unavailable` session', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })
    client.setAccessToken(createJWT())
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('network down')))
    await client.validateSession()
    expect(client.getState().status).toBe('unavailable')

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse({ user, accessToken: 'fresh-token' })),
    )
    await client.login({ email: user.email, password: 'secret' })

    expect(client.getState()).toMatchObject({ status: 'authenticated', authenticated: true })
  })

  it('NEGATIVE CONTROL: validateSession still ends an initialized client on a 401', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })
    client.setAccessToken(createJWT())
    client.setUser(user)
    await client.initialize()
    mockFetch.mockImplementationOnce(() => Promise.resolve(jsonResponse({ error: 'died' }, 401)))

    await client.validateSession()

    expect(client.getState()).toMatchObject({
      status: 'unauthenticated',
      authenticated: false,
      user: null,
    })
  })
})
