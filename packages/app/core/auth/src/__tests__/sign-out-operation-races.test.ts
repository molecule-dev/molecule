// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { StorageAdapter } from '../types.js'

const user = { id: 'reader', name: 'Reader' }
const replacement = { id: 'replacement', name: 'Replacement reader' }

function storage(): StorageAdapter {
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

function pendingResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

beforeEach(() => {
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('session operation sign-out ownership', () => {
  it.each(['setUser', 'logout'] as const)(
    'a pending cookie-restoration refresh cannot escape %s cleanup or reload',
    async (end) => {
      document.cookie = 'mol_auth=1; path=/'
      const retry = pendingResponse()
      const boundary = vi
        .fn()
        .mockResolvedValueOnce(Response.json({ error: 'unavailable' }, { status: 503 }))
        .mockImplementationOnce(() => retry.promise)
        .mockResolvedValue(Response.json({ user }))
      vi.stubGlobal('fetch', boundary)
      const store = storage()
      const client = createJWTAuthClient({
        storage: store,
        autoRefresh: false,
        logoutEndpoint: null,
      })
      await client.initialize()
      const restoring = client.refresh().catch((error) => error)
      if (end === 'setUser') client.setUser(null)
      else await client.logout()
      retry.resolve(Response.json({ user }))
      await restoring

      expect(client.getState()).toMatchObject({
        initialized: true,
        status: 'unauthenticated',
        authenticated: false,
        loading: false,
        user: null,
      })
      expect(document.cookie).not.toContain('mol_auth=')
      document.cookie = 'mol_auth=1; path=/'
      const reloaded = createJWTAuthClient({ storage: store, autoRefresh: false })
      await reloaded.initialize()
      expect(reloaded.getState()).toMatchObject({ authenticated: false, user: null })
      expect(boundary).toHaveBeenCalledTimes(2)
      client.destroy()
      reloaded.destroy()
    },
  )

  it('clears an unconfirmed token session while its refresh is pending', async () => {
    const store = storage()
    store.setItem('molecule:auth:accessToken', 'access')
    store.setItem('molecule:auth:refreshToken', 'refresh')
    const answer = pendingResponse()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ error: 'unavailable' }, { status: 503 }))
        .mockImplementationOnce(() => answer.promise),
    )
    const client = createJWTAuthClient({ storage: store, autoRefresh: false })
    await client.initialize()
    expect(client.getState()).toMatchObject({ authenticated: false, status: 'unavailable' })

    const refreshing = client.refresh()
    client.setUser(null)
    answer.resolve(Response.json({ accessToken: 'late', refreshToken: 'late-refresh', user }))
    await refreshing

    expect(client.getAccessToken()).toBeNull()
    expect(client.getRefreshToken()).toBeNull()
    expect(client.getState()).toMatchObject({ status: 'unauthenticated', authenticated: false })
    client.destroy()
  })

  it.each([
    ['login', 'logout'],
    ['login', 'setUser'],
    ['register', 'logout'],
    ['register', 'setUser'],
  ] as const)('a stale %s cookie after %s cannot survive a reload', async (operation, end) => {
    const response = pendingResponse()
    const boundary = vi
      .fn()
      .mockImplementationOnce(async () => {
        const answer = await response.promise
        document.cookie = 'mol_auth=1; path=/'
        return answer
      })
      .mockResolvedValue(Response.json({ user }))
    vi.stubGlobal('fetch', boundary)
    const store = storage()
    const client = createJWTAuthClient({
      storage: store,
      autoRefresh: false,
      logoutEndpoint: null,
    })
    await client.initialize()
    const exchange = client[operation]({ email: 'reader@example.test', password: 'secret' })
    if (end === 'setUser') client.setUser(null)
    else await client.logout()
    response.resolve(Response.json({ user, accessToken: 'late', refreshToken: 'late-refresh' }))
    await exchange

    expect(client.getState().authenticated).toBe(false)
    expect(document.cookie).not.toContain('mol_auth=')
    document.cookie = 'mol_auth=1; path=/'
    const reloaded = createJWTAuthClient({ storage: store, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState().authenticated).toBe(false)
    expect(boundary).toHaveBeenCalledTimes(1)
    client.destroy()
    reloaded.destroy()
  })

  it('best-effort revokes late credentials without blocking the stale login', async () => {
    const response = pendingResponse()
    const revocation = pendingResponse()
    const boundary = vi
      .fn()
      .mockImplementationOnce(async () => {
        const answer = await response.promise
        document.cookie = 'mol_auth=1; path=/'
        return answer
      })
      .mockImplementationOnce(() => revocation.promise)
    vi.stubGlobal('fetch', boundary)
    const client = createJWTAuthClient({ storage: storage(), autoRefresh: false })
    await client.initialize()
    const exchange = client.login({ email: 'reader@example.test', password: 'secret' })
    client.setUser(null)
    response.resolve(Response.json({ user, accessToken: 'late', refreshToken: 'late-refresh' }))
    await exchange

    expect(boundary).toHaveBeenCalledTimes(2)
    expect(boundary.mock.calls[1][0]).toBe('/users/logout')
    expect(boundary.mock.calls[1][1].headers.Authorization).toBe('Bearer late')
    expect(client.getState().authenticated).toBe(false)
    revocation.resolve(Response.json({}))
    await Promise.resolve()
    client.destroy()
  })

  it('an old automatic refresh rejection cannot destroy a replacement login', async () => {
    vi.useFakeTimers()
    const response = pendingResponse()
    const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 61 }))}.sig`
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => response.promise)
        .mockResolvedValueOnce(
          Response.json({ accessToken: 'new', refreshToken: 'new-refresh', user: replacement }),
        ),
    )
    const client = createJWTAuthClient({
      storage: 'memory',
      logoutEndpoint: null,
      refreshBuffer: 60,
    })
    client.setSession({ accessToken: token, refreshToken: 'old-refresh', user })
    await vi.advanceTimersByTimeAsync(1000)
    client.setUser(null)
    await client.login({ email: 'new@example.test', password: 'secret' })
    response.resolve(Response.json({ error: 'old token expired' }, { status: 401 }))
    await vi.advanceTimersByTimeAsync(0)

    expect(client.getState()).toMatchObject({ authenticated: true, user: replacement })
    expect(client.getAccessToken()).toBe('new')
    client.destroy()
  })

  it('endpoint-free logout publishes one settled transition', async () => {
    const client = createJWTAuthClient({
      storage: 'memory',
      autoRefresh: false,
      logoutEndpoint: null,
    })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    const listener = vi.fn()
    client.subscribe(listener)
    await client.logout()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ loading: false, status: 'unauthenticated' }),
    )
    client.destroy()
  })
})
