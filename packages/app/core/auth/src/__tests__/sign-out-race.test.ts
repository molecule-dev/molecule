// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthResult, StorageAdapter } from '../types.js'

const user = { id: 'reader', name: 'Reader' }

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

describe('sign-out session ownership', () => {
  it('clears a signed-in session, custom credential key, refresh timer, and cookie hint in one transition', async () => {
    vi.useFakeTimers()
    const fetchBoundary = vi.fn()
    vi.stubGlobal('fetch', fetchBoundary)
    const store = storage()
    const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 }))}.signature`
    const client = createJWTAuthClient({ storage: store, tokenKey: 'jwtToken' })
    client.setSession({ accessToken: token, refreshToken: 'refresh', user })
    document.cookie = 'mol_auth=1; path=/'
    expect(vi.getTimerCount()).toBe(1)
    const listener = vi.fn()
    const unsubscribe = client.subscribe(listener)
    const before = client.getSessionRevision!()
    client.setUser(null)
    expect(client.getState()).toMatchObject({
      authenticated: false,
      user: null,
      status: 'unauthenticated',
      loading: false,
      initialized: true,
    })
    expect(client.getSessionRevision!()).toBe(before + 1)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    expect(store.getItem('jwtToken')).toBeNull()
    expect(store.getItem('molecule:auth:refreshToken')).toBeNull()
    expect(store.getItem('molecule:auth:user')).toBeNull()
    expect(document.cookie).not.toContain('mol_auth=')
    const reloaded = createJWTAuthClient({ storage: store, tokenKey: 'jwtToken' })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      user: null,
      status: 'unauthenticated',
    })
    expect(fetchBoundary).not.toHaveBeenCalled()
    unsubscribe()
    client.destroy()
    reloaded.destroy()
  })

  it('does not notify or establish a session for an anonymous null user', async () => {
    const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false })
    await client.initialize()
    const listener = vi.fn()
    client.subscribe(listener)
    client.setUser(null)
    expect(client.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(listener).not.toHaveBeenCalled()
    client.destroy()
  })

  it('keeps profile updates authenticated without changing credentials or revision', () => {
    const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    const revision = client.getSessionRevision!()
    client.setUser({ ...user, name: 'Updated' })
    expect(client.getState()).toMatchObject({
      authenticated: true,
      status: 'authenticated',
      user: { ...user, name: 'Updated' },
    })
    expect(client.getAccessToken()).toBe('access')
    expect(client.getRefreshToken()).toBe('refresh')
    expect(client.getSessionRevision!()).toBe(revision)
    client.destroy()
  })

  it.each(['setUser', 'logout'] as const)(
    'a pending refresh cannot restore a session ended by %s',
    async (end) => {
      const response = pendingResponse()
      vi.stubGlobal(
        'fetch',
        vi.fn(() => response.promise),
      )
      const store = storage()
      const client = createJWTAuthClient({
        storage: store,
        autoRefresh: false,
        logoutEndpoint: null,
      })
      client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
      const refreshing = client.refresh()
      if (end === 'setUser') client.setUser(null)
      else await client.logout()
      expect(client.getState()).toMatchObject({
        authenticated: false,
        status: 'unauthenticated',
        user: null,
      })
      response.resolve(
        Response.json({ accessToken: 'late-access', refreshToken: 'late-refresh', user }),
      )
      await refreshing
      expect(client.getState()).toMatchObject({
        authenticated: false,
        status: 'unauthenticated',
        user: null,
      })
      expect(client.getAccessToken()).toBeNull()
      expect(client.getRefreshToken()).toBeNull()
      client.destroy()
    },
  )

  it.each(['setUser', 'logout'] as const)(
    'a pending login cannot restore a session ended by %s',
    async (end) => {
      const response = pendingResponse()
      vi.stubGlobal(
        'fetch',
        vi.fn(() => response.promise),
      )
      const client = createJWTAuthClient({
        storage: storage(),
        autoRefresh: false,
        logoutEndpoint: null,
      })
      await client.initialize()
      const loggingIn = client.login({ email: 'reader@example.test', password: 'secret' })
      if (end === 'setUser') client.setUser(null)
      else await client.logout()
      response.resolve(
        Response.json({ accessToken: 'late-access', refreshToken: 'late-refresh', user }),
      )
      await loggingIn
      expect(client.getState()).toMatchObject({
        authenticated: false,
        status: 'unauthenticated',
        user: null,
        loading: false,
      })
      expect(client.getAccessToken()).toBeNull()
      expect(client.getRefreshToken()).toBeNull()
      client.destroy()
    },
  )

  it('clearing the user during token-only restoration clears stored credentials and settles the client', async () => {
    const response = pendingResponse()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => response.promise),
    )
    const store = storage()
    store.setItem('molecule:auth:accessToken', 'restorable-access')
    document.cookie = 'mol_auth=1; path=/'
    const client = createJWTAuthClient({ storage: store, autoRefresh: false })
    const restoring = client.initialize()
    client.setUser(null)
    response.resolve(Response.json({ user }))
    await restoring
    expect(client.getState()).toMatchObject({
      initialized: true,
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(client.getAccessToken()).toBeNull()
    expect(document.cookie).not.toContain('mol_auth=')
    const fetchBoundary = vi.fn(async () => Response.json({ user }))
    vi.stubGlobal('fetch', fetchBoundary)
    const reloaded = createJWTAuthClient({ storage: store, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(fetchBoundary).not.toHaveBeenCalled()
    client.destroy()
    reloaded.destroy()
  })

  it('clearing the user during cookie restoration clears the hint and settles the client', async () => {
    const response = pendingResponse()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => response.promise),
    )
    const store = storage()
    document.cookie = 'mol_auth=1; path=/'
    const client = createJWTAuthClient({ storage: store, autoRefresh: false })
    const restoring = client.initialize()
    client.setUser(null)
    response.resolve(Response.json({ user }))
    await restoring
    expect(client.getState()).toMatchObject({
      initialized: true,
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(document.cookie).not.toContain('mol_auth=')
    const fetchBoundary = vi.fn(async () => Response.json({ user }))
    vi.stubGlobal('fetch', fetchBoundary)
    const reloaded = createJWTAuthClient({ storage: store, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(fetchBoundary).not.toHaveBeenCalled()
    client.destroy()
    reloaded.destroy()
  })

  it.each(['setUser', 'logout'] as const)(
    'a pending registration cannot restore a session ended by %s',
    async (end) => {
      const response = pendingResponse()
      vi.stubGlobal(
        'fetch',
        vi.fn(() => response.promise),
      )
      const client = createJWTAuthClient({
        storage: storage(),
        autoRefresh: false,
        logoutEndpoint: null,
      })
      await client.initialize()
      const registering = client.register({ email: 'reader@example.test', password: 'secret' })
      if (end === 'setUser') client.setUser(null)
      else await client.logout()
      response.resolve(
        Response.json({ accessToken: 'late-access', refreshToken: 'late-refresh', user }),
      )
      await registering
      expect(client.getState()).toMatchObject({
        initialized: true,
        authenticated: false,
        status: 'unauthenticated',
        user: null,
        loading: false,
      })
      expect(client.getAccessToken()).toBeNull()
      expect(client.getRefreshToken()).toBeNull()
      client.destroy()
    },
  )

  it('a login started after sign-out succeeds and an older answer cannot replace it', async () => {
    const first = pendingResponse()
    const second = pendingResponse()
    const fetchBoundary = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createJWTAuthClient({ storage: storage(), autoRefresh: false })
    await client.initialize()
    const oldLogin = client.login({ email: 'old@example.test', password: 'secret' })
    client.setUser(null)
    const newLogin = client.login({ email: 'new@example.test', password: 'secret' })
    second.resolve(Response.json({ accessToken: 'new-access', refreshToken: 'new-refresh', user }))
    await newLogin
    expect(client.getState()).toMatchObject({ authenticated: true, status: 'authenticated' })
    expect(client.getAccessToken()).toBe('new-access')
    first.resolve(Response.json({ accessToken: 'old-access', refreshToken: 'old-refresh', user }))
    await oldLogin
    expect(client.getState()).toMatchObject({ authenticated: true, status: 'authenticated' })
    expect(client.getAccessToken()).toBe('new-access')
    expect(client.getRefreshToken()).toBe('new-refresh')
    client.destroy()
  })

  it.each(['login', 'register', 'refresh', 'validate', 'tokenRestore', 'cookieRestore'] as const)(
    '%s checks session ownership after response mapping',
    async (operation) => {
      const store = storage()
      if (operation === 'tokenRestore') {
        store.setItem('molecule:auth:accessToken', 'restorable-access')
      }
      if (operation === 'cookieRestore') document.cookie = 'mol_auth=1; path=/'
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json({ accessToken: 'late-access', refreshToken: 'late-refresh', user }),
        ),
      )
      const client = createJWTAuthClient<typeof user>({
        storage: store,
        autoRefresh: false,
        mapAuthResponse: (answer) => {
          client.setUser(null)
          return answer as AuthResult<typeof user>
        },
      })
      if (operation === 'login' || operation === 'register') await client.initialize()
      if (operation === 'refresh' || operation === 'validate') {
        client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
      }
      if (operation === 'login') {
        await client.login({ email: 'reader@example.test', password: 'secret' })
      } else if (operation === 'register') {
        await client.register({ email: 'reader@example.test', password: 'secret' })
      } else if (operation === 'refresh') {
        await client.refresh()
      } else if (operation === 'validate') {
        await client.validateSession()
      } else {
        await client.initialize()
      }
      expect(client.getState()).toMatchObject({
        initialized: true,
        authenticated: false,
        status: 'unauthenticated',
        user: null,
        loading: false,
      })
      expect(client.getAccessToken()).toBeNull()
      expect(client.getRefreshToken()).toBeNull()
      expect(document.cookie).not.toContain('mol_auth=')
      client.destroy()
    },
  )
})
