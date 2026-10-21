/**
 * The profile update's HTTP method and JSON envelope are CONFIGURATION, not a
 * reason to hand-write an `AuthClient`.
 *
 * The resource-style API (`@molecule/api-resource-user`) updates with `PATCH`
 * and the bare patch object, which is what `updateProfile()` always sent. A
 * standard `PUT /api/user` API reads the payload under a `user` key instead, so
 * an app on that contract had to replace the whole client — the m409 builder
 * hand-wrote an adapter that re-implemented the lifecycle, callbacks, storage
 * and restore for exactly this transport difference (main-auth-2246).
 *
 * The adapter below is deterministic and STRICT: it serves only
 * `PUT /api/user` with `{ user: … }` and answers 405/422 to anything else. That
 * is what makes it evidence — a permissive mock would let the unconfigured
 * client "pass" while sending the wrong contract.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthResult, StorageAdapter, UserProfile } from '../types.js'

/** A `StorageAdapter` over an object, with the backing store exposed. */
function createMockStorage(): StorageAdapter & { store: Record<string, string> } {
  const store: Record<string, string> = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value
    },
    removeItem: (key) => {
      delete store[key]
    },
    store,
  }
}

/**
 * A fetch-shaped response for the client's reads.
 *
 * @param data - The JSON body.
 * @param status - The HTTP status (default 200).
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

/** A JWT that will not be treated as expired (the reload test stores it). */
const createJWT = (seconds: number): string =>
  [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })),
    btoa('mock-signature'),
  ].join('.')

const signedInUser: UserProfile = { id: 'reader', name: 'Reader', email: 'reader@example.test' }

/** One request the strict adapter saw. */
interface AdapterCall {
  /** The URL the client requested. */
  url: string
  /** The HTTP method it sent. */
  method: string
  /** The JSON body it sent, parsed. */
  body: unknown
}

/**
 * A deterministic API serving the standard `PUT /api/user` contract.
 *
 * The profile is updated ONLY by a `PUT` whose JSON body carries the payload
 * under `user`; anything else is refused. `respond` receives the accepted patch
 * so a test can answer with its own profile shape (and route it through
 * `mapAuthResponse` like a real API answer).
 *
 * @param respond - Builds the JSON answer from the accepted `{ user }` patch.
 * @returns The fetch implementation plus every request it saw.
 */
function createPutUserAdapter(respond: (patch: Record<string, unknown>) => unknown): {
  fetch: ReturnType<typeof vi.fn>
  calls: AdapterCall[]
} {
  const calls: AdapterCall[] = []
  const fetch = vi.fn((url: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase()
    const body = init.body === undefined ? undefined : JSON.parse(String(init.body))
    calls.push({ url: String(url), method, body })
    if (method !== 'PUT') {
      return createMockResponse({ error: 'method not allowed', expected: 'PUT' }, 405)
    }
    const envelope = body as { user?: unknown } | null | undefined
    if (!envelope || typeof envelope.user !== 'object' || envelope.user === null) {
      return createMockResponse({ error: 'expected a user envelope' }, 422)
    }
    return createMockResponse(respond(envelope.user as Record<string, unknown>))
  })
  return { fetch, calls }
}

describe('the profile-update transport is configuration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refuses the default PATCH/bare-data request and keeps the session intact', async () => {
    const api = createPutUserAdapter((patch) => ({ user: { ...signedInUser, ...patch } }))
    vi.stubGlobal('fetch', api.fetch)
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, baseURL: '/api', profileEndpoint: '/user' })
    client.setSession({ accessToken: 'access-token', user: signedInUser })
    const said = vi.fn()
    client.subscribe(said)

    // The CONTROL: the same adapter the configured test below passes is
    // genuinely strict — the unconfigured transport cannot complete the update.
    await expect(client.updateProfile({ name: 'Updated Name' })).rejects.toMatchObject({
      status: 405,
    })

    expect(api.calls).toEqual([
      { url: '/api/user', method: 'PATCH', body: { name: 'Updated Name' } },
    ])
    // A rejected update changes NOTHING: the cached user, the stored user and
    // every subscriber still hold the prior profile.
    expect(client.getUser()).toEqual(signedInUser)
    expect(JSON.parse(storage.store['molecule:auth:user'] ?? 'null')).toEqual(signedInUser)
    expect(said).not.toHaveBeenCalled()
  })

  it('sends the configured PUT with a { user } envelope, then maps, persists and notifies', async () => {
    /** The app's own profile: the wire fields plus the base identity fields. */
    interface Reader extends UserProfile {
      username: string
    }
    /** The API's wire user for that profile. */
    interface WireReader {
      login: string
      name: string
    }
    const reader: Reader = { id: 'reader', username: 'reader', name: 'Reader' }

    const api = createPutUserAdapter((patch) => ({
      user: { login: 'reader', name: patch.name } satisfies WireReader,
    }))
    vi.stubGlobal('fetch', api.fetch)
    const storage = createMockStorage()
    const client = createJWTAuthClient<Reader>({
      storage,
      baseURL: '/api',
      profileEndpoint: '/user',
      profileUpdateMethod: 'PUT',
      // Typed by the client's user generic: `data` is `Partial<Reader>`.
      profileRequestBody: (data) => ({ user: { name: data.name } }),
      mapAuthResponse: (data): AuthResult<Reader> => {
        const { user } = data as { user: WireReader }
        return {
          accessToken: 'access-token',
          user: { id: user.login, username: user.login, name: user.name },
        }
      },
    })
    client.setSession({ accessToken: 'access-token', user: reader })
    const said = vi.fn()
    client.subscribe(said)

    const updated = await client.updateProfile({ name: 'Updated Name' })

    expect(api.calls).toEqual([
      { url: '/api/user', method: 'PUT', body: { user: { name: 'Updated Name' } } },
    ])
    expect(updated).toEqual({ id: 'reader', username: 'reader', name: 'Updated Name' })
    expect(client.getUser()).toEqual(updated)
    expect(JSON.parse(storage.store['molecule:auth:user'] ?? 'null')).toEqual(updated)
    expect(said).toHaveBeenCalled()
    expect(said.mock.calls.at(-1)?.[0]).toMatchObject({ user: updated })
  })

  it('keeps PATCH with the bare data when nothing is configured', async () => {
    const mockFetch = vi.fn(() =>
      createMockResponse({ user: { ...signedInUser, name: 'Updated Name' } }),
    )
    vi.stubGlobal('fetch', mockFetch)
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, profileEndpoint: '/users/me' })
    client.setSession({ accessToken: 'access-token', user: signedInUser })

    const updated = await client.updateProfile({ name: 'Updated Name' })

    expect(mockFetch).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }),
    )
    expect(updated).toEqual({ ...signedInUser, name: 'Updated Name' })
    expect(client.getUser()).toEqual(updated)
  })

  it('sign-in, profile update and reload all see the updated user', async () => {
    const api = createPutUserAdapter((patch) => ({ user: { ...signedInUser, ...patch } }))
    const fetchMock = vi.fn((url: string, init: RequestInit = {}) =>
      String(url) === '/api/auth/login'
        ? createMockResponse({ accessToken: createJWT(3600), user: signedInUser })
        : api.fetch(url, init),
    )
    vi.stubGlobal('fetch', fetchMock)
    const storage = createMockStorage()
    const config = {
      storage,
      baseURL: '/api',
      profileEndpoint: '/user',
      profileUpdateMethod: 'PUT' as const,
      profileRequestBody: (data: Partial<UserProfile>) => ({ user: data }),
    }

    const client = createJWTAuthClient(config)
    await client.login({ email: 'reader@example.test', password: 'secret' })
    const updated = await client.updateProfile({ name: 'Updated Name' })

    expect(client.isAuthenticated()).toBe(true)
    expect(updated).toEqual({ ...signedInUser, name: 'Updated Name' })

    // A full reload is a NEW client over the same storage: it restores the
    // session with no request and holds the UPDATED profile, not the login one.
    const callsBeforeReload = fetchMock.mock.calls.length
    const reloaded = createJWTAuthClient(config)
    await reloaded.initialize()

    expect(reloaded.isAuthenticated()).toBe(true)
    expect(reloaded.getUser()).toEqual(updated)
    expect(fetchMock.mock.calls.length).toBe(callsBeforeReload)
  })
})
