// @vitest-environment jsdom

/**
 * `useAuth().setSession` — the Vue binding's action for a caller-issued
 * session (xr-molecule-flash-m244).
 *
 * The core client gained `setSession` so an OAuth redirect / custom sign-in
 * endpoint can adopt the token and profile in one update, and the composable
 * exposes it so a page can use the atomic API instead of the
 * `setAccessToken` + `setUser` workaround.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { useAuth } from '../composables/useAuth.js'
import { createAuthPlugin } from '../plugin.js'

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

const wrappers: VueWrapper[] = []

/**
 * Mounts `useAuth<AppUser>()` against a real client sharing `storage`.
 *
 * @param storage - The client's storage adapter.
 * @returns The composable result and the underlying client.
 */
const mountAuth = (
  storage: ReturnType<typeof createMockStorage>,
): {
  result: ReturnType<typeof useAuth<AppUser>>
  client: ReturnType<typeof createJWTAuthClient<AppUser>>
} => {
  const client = createJWTAuthClient<AppUser>({ storage })
  let result!: ReturnType<typeof useAuth<AppUser>>
  const Harness = defineComponent({
    setup() {
      result = useAuth<AppUser>()
      return () => h('div')
    },
  })
  wrappers.push(mount(Harness, { global: { plugins: [createAuthPlugin(client)] } }))
  return { result, client }
}

describe('useAuth().setSession', () => {
  it('adopts a caller-issued session: the subscriber sees authenticated state at once', () => {
    const storage = createMockStorage()
    const { result, client } = mountAuth(storage)
    const token = createMockJWT()
    const delegate = vi.spyOn(client, 'setSession')

    expect(result.isAuthenticated.value).toBe(false)
    expect(result.user.value).toBeNull()

    result.setSession({ accessToken: token, user: appUser })

    // The composable delegates to the core client's one-update adoption…
    expect(delegate).toHaveBeenCalledWith({ accessToken: token, user: appUser })
    // …and the subscriber (useAuth's onAuthChange) republishes it.
    expect(result.status.value).toBe('authenticated')
    expect(result.isAuthenticated.value).toBe(true)
    expect(result.user.value).toEqual(appUser)
    expect(result.state.value.initialized).toBe(true)
  })

  it('persists the token and the custom user fields the pages read', () => {
    const storage = createMockStorage()
    const { result, client } = mountAuth(storage)
    const token = createMockJWT()

    result.setSession({ accessToken: token, user: appUser })

    expect(client.getAccessToken()).toBe(token)
    expect(client.getUser()?.username).toBe('ann')
    expect(client.getUser()?.image).toBe('https://example.com/ann.png')
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(appUser)
    expect(result.user.value?.username).toBe('ann')
  })

  it('a stored session still survives a fresh hook read (restore path)', () => {
    const storage = createMockStorage()
    const first = mountAuth(storage)

    first.result.setSession({ accessToken: createMockJWT(), user: appUser })

    // A second client over the same storage is what a page reload builds.
    const second = mountAuth(storage)
    expect(second.result.user.value).toEqual(appUser)
    expect(second.result.isAuthenticated.value).toBe(true)
  })
})
