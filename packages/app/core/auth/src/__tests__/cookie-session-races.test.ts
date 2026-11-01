import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClient, AuthClientConfigOptions } from '../types.js'
const user = { id: 'member-a', email: 'member@example.test', name: 'Before' }
const other = { id: 'member-b', email: 'other@example.test', name: 'Other' }
const clients: AuthClient[] = []
function make(options: AuthClientConfigOptions = {}) {
  const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false, ...options })
  clients.push(client)
  return client
}
const response = (status: number, body: unknown = { error: 'Session rejected' }) =>
  Response.json(body, { status })
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
beforeEach(() => {
  vi.stubGlobal('document', { cookie: 'mol_auth=1' })
})
afterEach(() => {
  clients.splice(0).forEach((client) => client.destroy())
  vi.unstubAllGlobals()
})
describe('cookie candidate ownership', () => {
  for (const operation of ['validateSession', 'refresh'] as const) {
    for (const outcome of ['profile', 401, 503] as const) {
      it(`${operation}: a stale ${outcome} cannot overwrite an accepted profile save`, async () => {
        const pending = deferred<Response>()
        const fetch = vi
          .fn()
          .mockResolvedValueOnce(response(200, { user }))
          .mockReturnValueOnce(pending.promise)
          .mockResolvedValueOnce(response(200, { user: { ...user, name: 'Saved' } }))
        vi.stubGlobal('fetch', fetch)
        const auth = make()
        await auth.initialize()
        const checking = auth[operation]!().catch((error) => error)
        await auth.updateProfile({ name: 'Saved' })
        pending.resolve(outcome === 'profile' ? response(200, { user }) : response(outcome))
        await checking
        expect(auth.getState()).toMatchObject({
          status: 'authenticated',
          user: { ...user, name: 'Saved' },
        })
        expect(auth.getAccessToken()).toBeNull()
      })
    }
    for (const outcome of [200, 401, 503]) {
      it(`${operation}: same-token replacement owns old ${outcome}`, async () => {
        const pending = deferred<Response>()
        vi.stubGlobal(
          'fetch',
          vi
            .fn()
            .mockResolvedValueOnce(response(200, { user }))
            .mockReturnValueOnce(pending.promise),
        )
        const auth = make()
        await auth.initialize()
        const checking = auth[operation]!().catch((error) => error)
        auth.setSession({ accessToken: 'same-access', user: other })
        auth.setSession({ accessToken: 'same-access', user: { ...other, name: 'Replacement' } })
        pending.resolve(response(outcome, { user }))
        await checking
        expect(auth.getState()).toMatchObject({
          status: 'authenticated',
          user: { ...other, name: 'Replacement' },
        })
        expect(auth.getAccessToken()).toBe('same-access')
      })
    }
  }
  it('a cookie transient refresh exposes a fresh rejection with the same native name', async () => {
    const failure = new DOMException('', 'AbortError')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(response(200, { user })).mockRejectedValueOnce(failure),
    )
    const auth = make()
    await auth.initialize()
    const caught = await auth.refresh().catch((error: unknown) => error)
    expect(caught).not.toBe(failure)
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).name).toBe('AbortError')
    expect(auth.getState()).toMatchObject({ status: 'unavailable', user })
    document.cookie = ''
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(200, { user })))
    await auth.validateSession!()
    expect(auth.getState()).toMatchObject({ status: 'authenticated', user, error: null })
  })
  for (const operation of ['validateSession', 'refresh'] as const) {
    it(`${operation}: a predicate excludes a later guest answer`, async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(response(200, { user }))
          .mockResolvedValueOnce(response(200, { user: other })),
      )
      const auth = make({ shouldRestoreUser: (profile) => profile.id === user.id })
      await auth.initialize()
      await auth[operation]!().catch((error) => error)
      expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
    })
  }
  for (const operation of ['initialize', 'validateSession', 'refresh'] as const) {
    it(`${operation}: mapper-side signout cannot republish cookie state`, async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { user })))
      const auth = make({
        mapAuthResponse: () => {
          auth.setUser(null)
          return { user }
        },
      })
      if (operation !== 'initialize') await auth.initialize()
      await auth[operation]!().catch((error) => error)
      expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
      expect(auth.getAccessToken()).toBeNull()
    })
  }
})

describe('bearer refresh ownership', () => {
  for (const status of [401, 403])
    it(`direct bearer refresh ${status} clears only its own session`, async () => {
      const body = { error: 'Expired', details: { status } }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(status, body)))
      const auth = make()
      auth.setSession({ accessToken: 'old-access', refreshToken: 'old-refresh', user })
      await expect(auth.refresh()).rejects.toMatchObject({ status, body })
      expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
      expect(auth.getAccessToken()).toBeNull()
      expect(auth.getRefreshToken()).toBeNull()
    })
  for (const status of [401, 403, 503])
    it(`an old bearer ${status} cannot change a same-token replacement`, async () => {
      const pending = deferred<Response>()
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending.promise))
      const auth = make()
      auth.setSession({ accessToken: 'same-access', refreshToken: 'refresh', user })
      const refreshing = auth.refresh().catch((error) => error)
      auth.setSession({
        accessToken: 'same-access',
        refreshToken: 'replacement-refresh',
        user: other,
      })
      pending.resolve(response(status))
      await refreshing
      expect(auth.getState()).toMatchObject({ status: 'authenticated', user: other })
      expect(auth.getRefreshToken()).toBe('replacement-refresh')
    })
  it('a successful bearer retry clears the transient refresh error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response(503))
        .mockResolvedValueOnce(
          response(200, { user, accessToken: 'new-access', refreshToken: 'new-refresh' }),
        ),
    )
    const auth = make()
    auth.setSession({ accessToken: 'old-access', refreshToken: 'old-refresh', user })
    await auth.refresh().catch((error) => error)
    expect(auth.getState()).toMatchObject({ status: 'unavailable' })
    await auth.refresh()
    expect(auth.getState()).toMatchObject({ status: 'authenticated', user, error: null })
    expect(auth.getAccessToken()).toBe('new-access')
  })
  it('a scheduled refresh retries a transient failure without another sign-in', async () => {
    vi.useFakeTimers()
    try {
      document.cookie = ''
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(response(503))
        .mockResolvedValueOnce(
          response(200, { user, accessToken: 'new-access', refreshToken: 'new-refresh' }),
        )
      vi.stubGlobal('fetch', fetch)
      const auth = make({ autoRefresh: true, refreshBuffer: 60 })
      const jwt = [
        btoa('{}'),
        btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 61 })),
        'sig',
      ].join('.')
      auth.setSession({ accessToken: jwt, refreshToken: 'old-refresh', user })

      await vi.advanceTimersByTimeAsync(1000)
      expect(auth.getState()).toMatchObject({ status: 'unavailable', user })
      expect(fetch).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(60_000)
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(auth.getState()).toMatchObject({ status: 'authenticated', user, error: null })
      expect(auth.getAccessToken()).toBe('new-access')
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
  for (const status of [401, 403, 503])
    it(`timer ${status} respects a later explicit signout`, async () => {
      vi.useFakeTimers()
      try {
        document.cookie = ''
        const pending = deferred<Response>()
        const fetch = vi.fn().mockReturnValue(pending.promise)
        vi.stubGlobal('fetch', fetch)
        const auth = make({ autoRefresh: true, logoutEndpoint: '', refreshBuffer: 60 })
        const jwt = [
          btoa('{}'),
          btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 61 })),
          'sig',
        ].join('.')
        auth.setSession({ accessToken: jwt, refreshToken: 'refresh', user })
        await vi.advanceTimersByTimeAsync(1000)
        auth.setUser(null)
        pending.resolve(response(status))
        await vi.advanceTimersByTimeAsync(0)
        expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
        expect(auth.getAccessToken()).toBeNull()
        expect(vi.getTimerCount()).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })
})
