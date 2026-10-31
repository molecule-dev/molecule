import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClient, AuthClientConfigOptions } from '../types.js'

const user = { id: 'account-7', email: 'member@example.test' }
const clients: AuthClient[] = []

function client(config: AuthClientConfigOptions = {}): AuthClient {
  const auth = createJWTAuthClient({ storage: 'memory', autoRefresh: false, ...config })
  clients.push(auth)
  auth.setSession({ accessToken: 'access-1', refreshToken: 'refresh-1', user })
  return auth
}

afterEach(() => {
  clients.splice(0).forEach((auth) => auth.destroy())
  vi.unstubAllGlobals()
})

describe('the complete mapped refresh result', () => {
  it('a successful retry clears the previous refresh error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ error: 'Temporarily unavailable' }, { status: 503 }))
        .mockResolvedValueOnce(Response.json({ user, accessToken: 'access-2' })),
    )
    const auth = client()
    await expect(auth.refresh()).rejects.toHaveProperty('status', 503)
    await auth.refresh()
    expect(auth.getState()).toMatchObject({ status: 'authenticated', error: null })
  })

  it.each([401, 403])(
    'a rejected bearer refresh %s ends its session and retains the HTTP error',
    async (status) => {
      const body = { error: 'Refresh rejected' }
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json(body, { status })),
      )
      const auth = client()
      await expect(auth.refresh()).rejects.toMatchObject({ status, body })
      expect(auth.getState().status).toBe('unauthenticated')
      expect(auth.getAccessToken()).toBeNull()
      expect(auth.getRefreshToken()).toBeNull()
    },
  )

  it('counterexample: a transient bearer refresh keeps its credentials and profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Unavailable' }, { status: 503 })),
    )
    const auth = client()
    await expect(auth.refresh()).rejects.toHaveProperty('status', 503)
    expect(auth.getState()).toMatchObject({ status: 'unavailable', user })
    expect(auth.getAccessToken()).toBe('access-1')
    expect(auth.getRefreshToken()).toBe('refresh-1')
  })

  it('stores and returns the mapped profile and both mapped credentials', async () => {
    const body = {
      account: { ...user, displayName: 'Member' },
      tokens: { access: 'access-2', refresh: 'refresh-2' },
    }
    const fetch = vi.fn(async () => Response.json(body))
    vi.stubGlobal('fetch', fetch)
    const mapper = vi.fn((data: unknown) => {
      const wire = data as typeof body
      return {
        user: wire.account,
        accessToken: wire.tokens.access,
        refreshToken: wire.tokens.refresh,
      }
    })
    const auth = client({ mapAuthResponse: mapper })

    const result = await auth.refresh()

    expect(mapper).toHaveBeenCalledOnce()
    expect(result).toMatchObject({
      user: body.account,
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    })
    expect(auth.getAccessToken()).toBe('access-2')
    expect(auth.getRefreshToken()).toBe('refresh-2')
    expect(auth.getUser()).toEqual(body.account)
    await auth.refresh()
    expect(fetch.mock.calls[1]).toEqual([
      '/auth/refresh',
      expect.objectContaining({ body: JSON.stringify({ refreshToken: 'refresh-2' }) }),
    ])
  })

  it('adapts a bearer nested in a user without retaining it in the profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ user: { ...user, token: 'access-2' } })),
    )
    const auth = client({
      mapAuthResponse: (data) => {
        const { token, ...profile } = (data as { user: typeof user & { token: string } }).user
        return { user: profile, accessToken: token }
      },
    })
    const result = await auth.refresh()
    expect(result.accessToken).toBe('access-2')
    expect(auth.getAccessToken()).toBe('access-2')
    expect(auth.getUser()).toEqual(user)
    expect(auth.getUser()).not.toHaveProperty('token')
    expect(auth.getRefreshToken()).toBe('refresh-1')
  })

  it('counterexample: an unmapped response keeps the standard credential contract', async () => {
    const answer = { user, accessToken: 'access-2', refreshToken: 'refresh-2' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(answer)),
    )
    const auth = client()
    expect(await auth.refresh()).toEqual(answer)
    expect(auth.getAccessToken()).toBe('access-2')
    expect(auth.getRefreshToken()).toBe('refresh-2')
  })

  it('counterexample: a profile-only mapper preserves raw refresh credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ user, accessToken: 'access-2', refreshToken: 'refresh-2' }),
      ),
    )
    const auth = client({ mapAuthResponse: () => ({ user: { ...user, name: 'Mapped' } }) })
    await auth.refresh()
    expect(auth.getAccessToken()).toBe('access-2')
    expect(auth.getRefreshToken()).toBe('refresh-2')
    expect(auth.getUser()?.name).toBe('Mapped')
  })

  it('counterexample: a mapper for a different answer leaves a standard refresh usable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ user, accessToken: 'access-2' })),
    )
    const auth = client({
      mapAuthResponse: () => {
        throw new Error('Different envelope')
      },
    })
    await auth.refresh()
    expect(auth.getAccessToken()).toBe('access-2')
    expect(auth.getUser()).toEqual(user)
  })

  it('counterexample: mapper-triggered sign-out cannot publish mapped credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ user })),
    )
    const auth = client({
      logoutEndpoint: '',
      mapAuthResponse: () => {
        auth.setUser(null)
        return { user, accessToken: 'access-2', refreshToken: 'refresh-2' }
      },
    })
    await auth.refresh()
    expect(auth.getState().status).toBe('unauthenticated')
    expect(auth.getAccessToken()).toBeNull()
    expect(auth.getRefreshToken()).toBeNull()
  })
})
