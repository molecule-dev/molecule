import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClient, AuthClientConfigOptions } from '../types.js'

const user = { id: 'account-7', email: 'member@example.test' }
const replacement = { id: 'account-8', email: 'other@example.test' }
const clients: AuthClient[] = []

function client(options: AuthClientConfigOptions = {}): AuthClient {
  const result = createJWTAuthClient({ storage: 'memory', autoRefresh: false, ...options })
  clients.push(result)
  return result
}

function response(status: number, body: unknown = { error: 'Session request failed' }): Response {
  return Response.json(body, { status })
}

function cookie(value = 'mol_auth=1'): void {
  vi.stubGlobal('document', { cookie: value })
}

function failure(answer: number | 'network' | 'empty-abort'): Response {
  if (answer === 'network') throw new TypeError('Network unavailable')
  if (answer === 'empty-abort') throw new DOMException('', 'AbortError')
  return response(answer)
}

afterEach(() => {
  clients.splice(0).forEach((item) => item.destroy())
  vi.unstubAllGlobals()
})

describe('cookie session candidates', () => {
  it('revalidates a confirmed cookie session even when its readable hint disappears', async () => {
    cookie()
    const fetch = vi.fn(async () => response(200, { user }))
    vi.stubGlobal('fetch', fetch)
    const auth = client()
    await auth.initialize()
    document.cookie = ''

    await auth.validateSession!()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1]).toEqual([
      '/users/me',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    ])
    expect(auth.getAccessToken()).toBeNull()
    expect(auth.getState()).toMatchObject({ status: 'authenticated', user })
  })

  it.each([404, 503, 'network'] as const)(
    'retries an unavailable cookie candidate after %s',
    async (answer) => {
      cookie()
      const fetch = vi.fn(async () => failure(answer))
      vi.stubGlobal('fetch', fetch)
      const auth = client()
      await auth.initialize()
      document.cookie = ''

      await auth.validateSession!()

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(auth.getState()).toMatchObject({ status: 'unavailable', authenticated: false })
    },
  )

  it.each(['login', 'register'] as const)(
    'a rejected %s preserves an unconfirmed cookie candidate',
    async (operation) => {
      cookie()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(401)),
      )
      const auth = client()
      await auth.initialize()

      await expect(
        auth[operation]({ email: user.email, password: 'invalid' }),
      ).rejects.toHaveProperty('status', 401)

      expect(auth.getState().status).toBe('unavailable')
      expect(document.cookie).toContain('mol_auth=1')
    },
  )

  it('a later successful check confirms an unavailable cookie candidate', async () => {
    cookie()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200, { user })),
    )
    const auth = client()
    await auth.initialize()
    await auth.validateSession!()
    expect(auth.getState()).toMatchObject({ status: 'authenticated', user })
  })

  it.each([401, 403])('a validation rejection %s ends a cookie session', async (status) => {
    cookie()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response(200, { user }))
        .mockResolvedValueOnce(response(status)),
    )
    const auth = client()
    await auth.initialize()
    await auth.validateSession!()
    expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
    expect(document.cookie).not.toContain('mol_auth=1')
  })

  it('counterexample: an anonymous client validates without a cookie probe', async () => {
    cookie('')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const auth = client()
    await auth.initialize()
    await auth.validateSession!()
    expect(auth.getState().status).toBe('unauthenticated')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('counterexample: a failed anonymous login remains unauthenticated', async () => {
    cookie('')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(401)),
    )
    const auth = client()
    await auth.initialize()
    await expect(auth.login({ email: user.email, password: 'invalid' })).rejects.toHaveProperty(
      'status',
      401,
    )
    expect(auth.getState().status).toBe('unauthenticated')
  })

  it.each(['logout', 'setUser'] as const)(
    '%s clears an unavailable cookie candidate',
    async (operation) => {
      cookie()
      const fetch = vi.fn(async () => response(503))
      vi.stubGlobal('fetch', fetch)
      const auth = client({ logoutEndpoint: '' })
      await auth.initialize()
      if (operation === 'logout') await auth.logout()
      else auth.setUser(null)
      await auth.validateSession!()
      expect(auth.getState().status).toBe('unauthenticated')
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )
})

describe('cookie refresh outcomes', () => {
  it('an application-declined refresh ends the prior cookie session', async () => {
    cookie()
    const guest = { id: 'guest', email: 'guest@example.test' }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response(200, { user }))
        .mockResolvedValueOnce(response(200, { user: guest })),
    )
    const auth = client({ shouldRestoreUser: (profile) => profile.id !== guest.id })
    await auth.initialize()
    await expect(auth.refresh()).rejects.toMatchObject({ i18nKey: 'auth.error.noRefreshToken' })
    expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
  })

  for (const initial of [200, 503]) {
    it.each([401, 403])(
      `a %s refresh ends a cookie session restored with ${initial}`,
      async (status) => {
        cookie()
        const body = { error: 'Session rejected', detail: { reason: 'expired' } }
        vi.stubGlobal(
          'fetch',
          vi
            .fn()
            .mockResolvedValueOnce(response(initial, { user }))
            .mockResolvedValueOnce(response(status, body)),
        )
        const auth = client()
        await auth.initialize()
        expect(auth.getState().status).toBe(initial === 200 ? 'authenticated' : 'unavailable')

        await expect(auth.refresh()).rejects.toMatchObject({ status, body })

        expect(auth.getState()).toMatchObject({ status: 'unauthenticated', user: null })
        expect(document.cookie).not.toContain('mol_auth=1')
      },
    )
  }

  it.each([404, 503, 'network'] as const)(
    'a transient %s refresh keeps the session retryable',
    async (answer) => {
      cookie()
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(response(200, { user }))
          .mockImplementationOnce(async () => failure(answer)),
      )
      const auth = client()
      await auth.initialize()
      await expect(auth.refresh()).rejects.toBeInstanceOf(Error)
      expect(auth.getState()).toMatchObject({ status: 'unavailable', user })
      expect(document.cookie).toContain('mol_auth=1')
    },
  )

  it.each([401, 403])(
    'counterexample: an old cookie rejection %s cannot end a replacement session',
    async (status) => {
      cookie()
      let resolve!: (value: Response) => void
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(response(200, { user }))
          .mockImplementationOnce(
            () =>
              new Promise<Response>((done) => {
                resolve = done
              }),
          ),
      )
      const auth = client()
      await auth.initialize()
      const pending = auth.refresh().catch((error: unknown) => error)
      auth.setSession({ accessToken: 'replacement-token', user: replacement })
      resolve(response(status))
      await pending
      expect(auth.getState()).toMatchObject({ status: 'authenticated', user: replacement })
      expect(auth.getAccessToken()).toBe('replacement-token')
    },
  )

  it('counterexample: no cookie candidate still reports no refresh token', async () => {
    cookie('')
    const auth = client()
    await auth.initialize()
    await expect(auth.refresh()).rejects.toMatchObject({ i18nKey: 'auth.error.noRefreshToken' })
  })
})

describe('cookie failure classification', () => {
  it.each(['initialize', 'validateSession', 'refresh'] as const)(
    '%s classifies an empty abort message as unavailable',
    async (operation) => {
      cookie()
      const fetch = vi.fn(async () => failure('empty-abort'))
      vi.stubGlobal('fetch', fetch)
      const auth = client()
      if (operation !== 'initialize') await auth.initialize()
      if (operation === 'refresh')
        await expect(auth.refresh()).rejects.toMatchObject({ name: 'AbortError', message: '' })
      else await auth[operation]!()
      expect(auth.getState().status).toBe('unavailable')
      expect(document.cookie).toContain('mol_auth=1')
    },
  )

  it('counterexample: an error body with an empty message still carries its 401 decision', async () => {
    cookie()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(401, { error: '' })),
    )
    const auth = client()
    await auth.initialize()
    expect(auth.getState().status).toBe('unauthenticated')
  })
})

describe('explicit cookie probe policy', () => {
  it('restores an external HttpOnly cookie without a readable presence hint', async () => {
    cookie('')
    const fetch = vi.fn(async () => response(200, { user }))
    vi.stubGlobal('fetch', fetch)
    const auth = client({ cookieRestore: 'always', currentUserEndpoint: '/account/current' })
    await auth.initialize()
    expect(fetch).toHaveBeenCalledWith(
      '/account/current',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(auth.getState()).toMatchObject({ status: 'authenticated', user })
    await auth.validateSession!()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it.each([401, 503])('the explicit probe classifies %s without a hint', async (status) => {
    cookie('')
    const fetch = vi.fn(async () => response(status))
    vi.stubGlobal('fetch', fetch)
    const auth = client({ cookieRestore: 'always' })
    await auth.initialize()
    expect(fetch).toHaveBeenCalledOnce()
    expect(auth.getState().status).toBe(status === 401 ? 'unauthenticated' : 'unavailable')
  })

  it.each(['default', 'hint'] as const)(
    'counterexample: %s policy skips anonymous loads',
    async (policy) => {
      cookie('')
      const fetch = vi.fn()
      vi.stubGlobal('fetch', fetch)
      const auth = client(policy === 'hint' ? { cookieRestore: 'hint' } : {})
      await auth.initialize()
      expect(fetch).not.toHaveBeenCalled()
      expect(auth.getState().status).toBe('unauthenticated')
    },
  )

  it('counterexample: explicit sign-out suppresses even the always policy', async () => {
    cookie('')
    const fetch = vi.fn(async () => response(200, { user }))
    vi.stubGlobal('fetch', fetch)
    const auth = client({ cookieRestore: 'always', logoutEndpoint: '' })
    await auth.initialize()
    await auth.logout()
    await auth.validateSession!()
    await expect(auth.refresh()).rejects.toMatchObject({ i18nKey: 'auth.error.noRefreshToken' })
    expect(fetch).toHaveBeenCalledOnce()
    expect(auth.getState().status).toBe('unauthenticated')
  })

  it('counterexample: the restore predicate can still reject a server-side guest session', async () => {
    cookie('')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(200, { user })),
    )
    const auth = client({ cookieRestore: 'always', shouldRestoreUser: () => false })
    await auth.initialize()
    expect(auth.getState().status).toBe('unauthenticated')
  })
})
