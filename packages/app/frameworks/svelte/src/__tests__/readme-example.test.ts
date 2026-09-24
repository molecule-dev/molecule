/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real JWT auth client + real
 * CSS-variables theme provider, exposed as Svelte stores. Only `fetch` (the
 * API server) is stubbed.
 *
 * @module
 */
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Svelte's Node (SSR) entry points pull in `devalue`, which this workspace's
// install does not provide. Load the BROWSER builds instead — the same code a
// Svelte app runs client-side — for both `svelte` and `svelte/store`.
vi.mock('svelte', async () => {
  const { createRequire } = await import('node:module')
  const { dirname, join } = await import('node:path')
  const root = dirname(createRequire(import.meta.url).resolve('svelte/package.json'))
  return import(join(root, 'src/index-client.js'))
})
vi.mock('svelte/store', async () => {
  const { createRequire } = await import('node:module')
  const { dirname, join } = await import('node:path')
  const root = dirname(createRequire(import.meta.url).resolve('svelte/package.json'))
  return import(join(root, 'src/store/index-client.js'))
})

import { createJWTAuthClient } from '@molecule/app-auth'
import { provider as themeProvider } from '@molecule/app-theme-css-variables'

import { createAuthStoresFromClient, createThemeStoresFromProvider } from '../index.js'

interface User {
  id: string
  name: string
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('README @example', () => {
  it('exposes auth + theme as stores and updates them through the actions', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ accessToken: 'jwt-1', user: { id: 'u1', name: 'Ada' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const authClient = createJWTAuthClient<User>({ baseURL: '/api' })
    const { user, isAuthenticated, login } = createAuthStoresFromClient(authClient)
    const { mode, toggleTheme } = createThemeStoresFromProvider(themeProvider)

    /**
     * The example's submit handler.
     *
     * @param email - Login email.
     * @param password - Login password.
     * @returns Whether the user is now authenticated.
     */
    async function signIn(email: string, password: string): Promise<boolean> {
      await login({ email, password })
      return get(isAuthenticated)
    }

    expect(get(isAuthenticated)).toBe(false)
    expect(await signIn('ada@example.com', 'correct horse')).toBe(true)
    expect(get(user)?.name).toBe('Ada')
    expect(String(fetchMock.mock.calls[0]?.[0 as never])).toContain('/api/auth/login')

    const before = get(mode)
    toggleTheme()
    expect(get(mode)).toBe(before === 'light' ? 'dark' : 'light')
  })
})
