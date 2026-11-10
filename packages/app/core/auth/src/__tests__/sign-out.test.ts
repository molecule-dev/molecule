import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { StorageAdapter, UserProfile } from '../types.js'

const user: UserProfile = { id: 'reader', email: 'reader@example.test' }

function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('local sign-out', () => {
  it('setUser(null) ends a signed-in session once and prevents a stored-session reload', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const storage = createStorage()
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    const listener = vi.fn()
    client.subscribe(listener)

    client.setAccessToken(null)
    const revisionBeforeClear = client.getSessionRevision!()
    client.setUser(null)

    expect(client.getState()).toMatchObject({
      initialized: true,
      authenticated: false,
      status: 'unauthenticated',
      user: null,
      loading: false,
    })
    expect(client.getAccessToken()).toBeNull()
    expect(client.getRefreshToken()).toBeNull()
    expect(storage.getItem('molecule:auth:user')).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(client.getSessionRevision!()).toBe(revisionBeforeClear + 1)

    const reloaded = createJWTAuthClient({ storage, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(reloaded.getAccessToken()).toBeNull()
    expect(reloaded.getRefreshToken()).toBeNull()
    expect(fetchBoundary).not.toHaveBeenCalled()
  })

  it('setUser(null) clears both tokens without a separate setAccessToken call', () => {
    const client = createJWTAuthClient({ storage: createStorage(), autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })

    client.setUser(null)

    expect(client.getAccessToken()).toBeNull()
    expect(client.getRefreshToken()).toBeNull()
    expect(client.getState()).toMatchObject({ authenticated: false, status: 'unauthenticated' })
  })

  it('clearing an anonymous cached profile does not sign in or clear its token', async () => {
    const client = createJWTAuthClient({ storage: createStorage(), autoRefresh: false })
    await client.initialize()
    client.setAccessToken('out-of-band-token')
    // Clearing the (absent) profile is a session event: it disarms the token half of the app's
    // own sign-in pair, so the profile below is cached on an anonymous client that holds a token.
    client.setUser(null)
    client.setUser(user)

    client.setUser(null)

    expect(client.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(client.getAccessToken()).toBe('out-of-band-token')
  })
})

describe('logout without a server logout route', () => {
  it.each(['404', 'network'] as const)(
    '%s failure still settles signed out without throwing',
    async (failure) => {
      const fetchBoundary = vi.fn<typeof fetch>()
      if (failure === '404') {
        fetchBoundary.mockResolvedValue(Response.json({ error: 'Not found' }, { status: 404 }))
      } else {
        fetchBoundary.mockRejectedValue(new TypeError('Network unavailable'))
      }
      vi.stubGlobal('fetch', fetchBoundary)
      const client = createJWTAuthClient({ storage: createStorage(), autoRefresh: false })
      client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })

      await expect(client.logout()).resolves.toBeUndefined()

      expect(client.getState()).toMatchObject({
        authenticated: false,
        status: 'unauthenticated',
        user: null,
      })
      expect(client.getAccessToken()).toBeNull()
      expect(client.getRefreshToken()).toBeNull()
    },
  )

  it.each([null, ''] as const)(
    'logoutEndpoint %j disables the request but not local sign-out',
    async (endpoint) => {
      const fetchBoundary = vi.fn<typeof fetch>()
      vi.stubGlobal('fetch', fetchBoundary)
      const client = createJWTAuthClient({
        storage: createStorage(),
        autoRefresh: false,
        logoutEndpoint: endpoint,
      })
      client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })

      await expect(client.logout()).resolves.toBeUndefined()

      expect(fetchBoundary).not.toHaveBeenCalled()
      expect(client.getState()).toMatchObject({
        authenticated: false,
        status: 'unauthenticated',
        user: null,
      })
      expect(client.getAccessToken()).toBeNull()
      expect(client.getRefreshToken()).toBeNull()
    },
  )
})
