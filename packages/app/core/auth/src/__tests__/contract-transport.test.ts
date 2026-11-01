import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'

afterEach(() => vi.unstubAllGlobals())

describe('contract-driven password and challenge transport', () => {
  it('uses a user-resolved PATCH password route and keeps the default POST control', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const client = createJWTAuthClient({
      baseURL: '/api',
      storage: 'memory',
      changePasswordEndpoint: (user) => `/v2/members/${encodeURIComponent(user.id)}/password`,
      changePasswordMethod: 'PATCH',
    })
    client.setSession({ accessToken: 'token', user: { id: 'reader/space ?' } })
    await client.changePassword('old', 'new')
    expect(calls[0]?.url).toBe('/api/v2/members/reader%2Fspace%20%3F/password')
    expect(calls[0]?.init?.method).toBe('PATCH')

    const control = createJWTAuthClient({ baseURL: '/api', storage: 'memory' })
    await control.changePassword('old', 'new')
    expect(calls.at(-1)?.init?.method).toBe('POST')
  })

  it('accepts a typed two-factor challenge without publishing an authenticated session', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify({ twoFactorRequired: true, challengeId: 'second-factor' }), {
          status: 206,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    const client = createJWTAuthClient({
      storage: 'memory',
      mapAuthResponse: (data) => data as { twoFactorRequired: true; challengeId: string },
    })
    const result = await client.login({ email: 'member@example.test', password: 'pw' })
    expect(result).toMatchObject({ twoFactorRequired: true, challengeId: 'second-factor' })
    expect(client.getState().authenticated).toBe(false)
  })
})
