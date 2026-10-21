/**
 * `updateProfile()` adopts the USER from a profile answer, whatever the API
 * wraps it in.
 *
 * `@molecule/api-resource-user` handlers answer `{ props, … }` (the PATCH
 * route answers `{ props }`) and the client's fetch path aliases `props` onto
 * `user` — the same compatibility shim login/register rely on. `updateProfile`
 * then stored the WHOLE answer: with no `mapAuthResponse` (the documented
 * minimal config) the cached user became `{ props: user, user }`, so every
 * page reading `useAuth().user.name` read `undefined` right after a save even
 * though the request succeeded. A `{ user }` answer was cached the same way.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { StorageAdapter, UserProfile } from '../types.js'

/** A `StorageAdapter` over an object. */
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
 * @returns The response.
 */
const createMockResponse = <T>(data: T) =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })

const signedInUser: UserProfile = { id: 'reader', name: 'Reader', email: 'reader@example.test' }

describe('updateProfile caches the user, not the response envelope', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adopts the user from the resource’s { props } answer (no mapper)', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, profileEndpoint: '/users/me' })
    client.setSession({ accessToken: 'access-token', user: signedInUser })
    mockFetch.mockImplementationOnce(() =>
      createMockResponse({ props: { ...signedInUser, name: 'Updated Name' } }),
    )

    const updated = await client.updateProfile({ name: 'Updated Name' })

    expect(updated).toEqual({ ...signedInUser, name: 'Updated Name' })
    expect(client.getUser()).toEqual({ ...signedInUser, name: 'Updated Name' })
    expect(JSON.parse(storage.store['molecule:auth:user'] ?? 'null')).toEqual({
      ...signedInUser,
      name: 'Updated Name',
    })
  })

  it('adopts the user from a { user } answer (no mapper)', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, profileEndpoint: '/users/me' })
    client.setSession({ accessToken: 'access-token', user: signedInUser })
    mockFetch.mockImplementationOnce(() =>
      createMockResponse({ user: { ...signedInUser, name: 'Enveloped' } }),
    )

    const updated = await client.updateProfile({ name: 'Enveloped' })

    expect(updated).toEqual({ ...signedInUser, name: 'Enveloped' })
    expect(client.getUser()).toEqual({ ...signedInUser, name: 'Enveloped' })
  })

  it('still accepts a bare user answer', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient({ storage, profileEndpoint: '/users/me' })
    client.setSession({ accessToken: 'access-token', user: signedInUser })
    mockFetch.mockImplementationOnce(() =>
      createMockResponse({ ...signedInUser, name: 'Bare Answer' }),
    )

    const updated = await client.updateProfile({ name: 'Bare Answer' })

    expect(updated).toEqual({ ...signedInUser, name: 'Bare Answer' })
    expect(client.getUser()).toEqual({ ...signedInUser, name: 'Bare Answer' })
  })
})
