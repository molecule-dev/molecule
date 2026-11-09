import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClientConfig, AuthSessionSeed } from '../types.js'

interface Account {
  memberKey: string
  displayName: string
  timezone: string
}

const original: Account = { memberKey: 'member-7', displayName: 'Before', timezone: 'UTC' }
const saved: Account = { ...original, displayName: 'Saved name' }
const cleanups: (() => void)[] = []

function setup(config: AuthClientConfig<Account> = {}, session?: AuthSessionSeed<Account>) {
  const items = new Map<string, string>()
  const auth = createJWTAuthClient<Account>({
    autoRefresh: false,
    currentUserEndpoint: '/account/current',
    logoutEndpoint: null,
    storage: {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        items.set(key, value)
      },
      removeItem: (key) => {
        items.delete(key)
      },
    },
    ...config,
  })
  auth.setSession(session ?? { accessToken: 'access-only', user: original })
  cleanups.push(() => auth.destroy())
  return { auth, items }
}

function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

describe('profile saves and access-only sessions', () => {
  it('publishes an externally saved account through refresh without a refresh token or cookie', async () => {
    vi.stubGlobal('document', { cookie: '' })
    const fetch = vi.fn(async () => Response.json({ account: saved }))
    vi.stubGlobal('fetch', fetch)
    const { auth, items } = setup({
      authScheme: 'Token',
      mapAuthResponse: (data) => ({ user: (data as { account: Account }).account }),
    })
    const listener = vi.fn()
    auth.subscribe(listener)

    // A page which saved through its own HTTP adapter used to swallow this
    // rejection, navigate away, and seed its next form from the old user.
    const result = await auth.refresh().catch(() => undefined)

    expect(auth.getUser()).toEqual(saved)
    expect(result?.user).toEqual(saved)
    expect(JSON.parse(items.get('molecule:auth:user')!)).toEqual(saved)
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ user: saved }))
    expect(auth.getAccessToken()).toBe('access-only')
    expect(auth.getRefreshToken()).toBeNull()
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      '/account/current',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Token access-only' }),
      }),
    )
  })

  it.each([401, 403, 404, 503, 'network'] as const)(
    'reports a current-user %s failure instead of silently succeeding',
    async (failure) => {
      const fetch = vi.fn(async () => {
        if (failure === 'network') throw new TypeError('Account API unavailable')
        return Response.json({ error: 'Account request failed' }, { status: failure })
      })
      vi.stubGlobal('fetch', fetch)
      const { auth } = setup()
      const error = await auth.refresh().catch((caught: unknown) => caught)

      expect(fetch).toHaveBeenCalledOnce()
      if (failure === 'network') expect(error).toBeInstanceOf(TypeError)
      else expect(error).toHaveProperty('status', failure)
      if (failure === 401 || failure === 403) {
        expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
        expect(auth.getAccessToken()).toBeNull()
      } else {
        expect(auth.getState()).toMatchObject({ status: 'unavailable', user: original })
        expect(auth.getAccessToken()).toBe('access-only')
      }
    },
  )

  it.each(['validateSession', 'refresh'] as const)(
    'a pending %s cannot undo the canonical row passed to setUser after a custom save',
    async (operation) => {
      const read = deferred()
      const fetch = vi.fn(() => read.promise)
      vi.stubGlobal('fetch', fetch)
      const { auth, items } = setup()
      const pending = auth[operation]().catch(() => undefined)
      expect(fetch).toHaveBeenCalledOnce()
      auth.setUser(saved)
      read.resolve(Response.json({ user: original }))
      await pending

      expect(auth.getUser()).toEqual(saved)
      expect(JSON.parse(items.get('molecule:auth:user')!)).toEqual(saved)
    },
  )

  it('does not publish an access-only refresh into a replacement session', async () => {
    const read = deferred()
    const fetch = vi.fn(() => read.promise)
    vi.stubGlobal('fetch', fetch)
    const { auth } = setup()
    const pending = auth.refresh().catch(() => undefined)
    expect(fetch).toHaveBeenCalledOnce()
    const replacement = { ...original, memberKey: 'member-8' }
    auth.setSession({ accessToken: 'replacement', user: replacement })
    read.resolve(Response.json({ user: saved }))
    await pending
    expect(auth.getUser()).toEqual(replacement)
    expect(auth.getAccessToken()).toBe('replacement')
  })

  it('a pending credential refresh renews the token without undoing setUser after a save', async () => {
    const read = deferred()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => read.promise),
    )
    const { auth, items } = setup(
      {},
      {
        accessToken: 'access-only',
        refreshToken: 'refresh-credential',
        user: original,
      },
    )
    const pending = auth.refresh()
    auth.setUser(saved)
    read.resolve(Response.json({ user: original, accessToken: 'renewed' }))
    const result = await pending
    expect(auth.getUser()).toEqual(saved)
    expect(result.user).toEqual(saved)
    expect(JSON.parse(items.get('molecule:auth:user')!)).toEqual(saved)
    expect(auth.getAccessToken()).toBe('renewed')
  })

  it('counterexample: a refresh-token session still exchanges its refresh credential', async () => {
    const fetch = vi.fn(async () => Response.json({ user: saved, accessToken: 'renewed' }))
    vi.stubGlobal('fetch', fetch)
    const { auth } = setup(
      {},
      {
        accessToken: 'access-only',
        refreshToken: 'refresh-credential',
        user: original,
      },
    )
    await auth.refresh()
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      '/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-credential' }),
      }),
    )
    expect(auth.getAccessToken()).toBe('renewed')
    expect(auth.getUser()).toEqual(saved)
  })

  it('counterexample: an anonymous client still cannot refresh without credentials', async () => {
    vi.stubGlobal('document', { cookie: '' })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { auth } = setup()
    auth.setUser(null)
    await expect(auth.refresh()).rejects.toMatchObject({ i18nKey: 'auth.error.noRefreshToken' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
