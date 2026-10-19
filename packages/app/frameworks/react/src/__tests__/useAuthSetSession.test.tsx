// @vitest-environment jsdom

/**
 * `useAuth().setSession` — the React binding's action for a caller-issued
 * session (xr-molecule-flash-m244).
 *
 * The core client gained `setSession` so an OAuth redirect / custom sign-in
 * endpoint can adopt the token and profile in one update, but `UseAuthResult`
 * exposed only login/logout/register/refresh/setUser. An executor that chose
 * the new atomic API (`const { setSession } = useAuth()`) was rejected at
 * preflight with TS2339 on three pages and rewrote them to a workaround.
 */
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { useAuth } from '../hooks/useAuth.js'
import { AuthProvider } from '../providers.js'

/** The app's own profile — custom fields the pages render. */
interface AppUser extends UserProfile {
  username: string
  image: string
}

/** The profile a custom sign-in exchange already built in the app's shape. */
const appUser: AppUser = {
  id: 'ann',
  username: 'ann',
  name: 'ann',
  email: 'ann@example.com',
  image: 'https://example.com/ann.png',
  avatar: 'https://example.com/ann.png',
}

/**
 * A `StorageAdapter` over an object.
 *
 * @returns The adapter plus the backing store.
 */
const createMockStorage = (): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  store: Record<string, string>
} => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    store,
  }
}

/**
 * A JWT whose `exp` is far enough out that the client does not refresh it.
 *
 * @returns The token.
 */
const createMockJWT = (): string =>
  [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    btoa('mock-signature'),
  ].join('.')

/**
 * Renders `useAuth<AppUser>()` against a real client sharing `storage`.
 *
 * @param storage - The client's storage adapter.
 * @returns The hook result and the underlying client.
 */
const renderAuth = (
  storage: ReturnType<typeof createMockStorage>,
): {
  result: { current: ReturnType<typeof useAuth<AppUser>> }
  client: ReturnType<typeof createJWTAuthClient<AppUser>>
} => {
  const client = createJWTAuthClient<AppUser>({ storage })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider client={client}>{children}</AuthProvider>
  )
  const { result } = renderHook(() => useAuth<AppUser>(), { wrapper })
  return { result, client }
}

describe('useAuth().setSession', () => {
  it('adopts a caller-issued session: the subscriber sees authenticated state at once', () => {
    const storage = createMockStorage()
    const { result, client } = renderAuth(storage)
    const token = createMockJWT()
    const delegate = vi.spyOn(client, 'setSession')

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()

    act(() => {
      result.current.setSession({ accessToken: token, user: appUser })
    })

    // The hook delegates to the core client's one-update adoption…
    expect(delegate).toHaveBeenCalledWith({ accessToken: token, user: appUser })
    // …and the subscriber (useAuth's useSyncExternalStore) republishes it.
    expect(result.current.status).toBe('authenticated')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(appUser)
    expect(result.current.state.initialized).toBe(true)
  })

  it('persists the token and the custom user fields the pages read', () => {
    const storage = createMockStorage()
    const { result, client } = renderAuth(storage)
    const token = createMockJWT()

    act(() => {
      result.current.setSession({ accessToken: token, user: appUser })
    })

    expect(client.getAccessToken()).toBe(token)
    expect(client.getUser()?.username).toBe('ann')
    expect(client.getUser()?.image).toBe('https://example.com/ann.png')
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(appUser)
    expect(result.current.user?.username).toBe('ann')
  })

  it('a stored session still survives a fresh hook read (restore path)', () => {
    const storage = createMockStorage()
    const first = renderAuth(storage)

    act(() => {
      first.result.current.setSession({ accessToken: createMockJWT(), user: appUser })
    })

    // A second client over the same storage is what a page reload builds.
    const second = renderAuth(storage)
    expect(second.result.current.user).toEqual(appUser)
    expect(second.result.current.isAuthenticated).toBe(true)
  })
})
