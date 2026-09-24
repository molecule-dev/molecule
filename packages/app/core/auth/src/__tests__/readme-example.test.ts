/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real JWT client with only
 * `fetch` (the API server) mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createJWTAuthClient,
  getUser,
  isAuthenticated,
  login,
  logout,
  setClient,
} from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the JWT client, logs in through the API, and logs out', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      const body = url.endsWith('/auth/login')
        ? { user: { id: 'u_1', email: 'ada@example.com' }, accessToken: 'access-token' }
        : {}
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
    setClient(client)
    await client.initialize()
    expect(client.getState().initialized).toBe(true)
    expect(isAuthenticated()).toBe(false)

    const form = { email: 'ada@example.com', password: 'correct horse battery staple' }
    const result = await login({ email: form.email, password: form.password })
    expect(result.twoFactorRequired).toBeFalsy()
    expect(isAuthenticated()).toBe(true)
    expect(getUser()?.email).toBe('ada@example.com')

    const [loginUrl, loginInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(loginUrl).toBe('https://api.example.com/auth/login')
    expect(loginInit.method).toBe('POST')
    expect(JSON.parse(loginInit.body as string)).toEqual(form)

    await logout()
    const [logoutUrl] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(logoutUrl).toBe('https://api.example.com/users/logout')
    expect(isAuthenticated()).toBe(false)
    expect(getUser()).toBeNull()
  })
})
