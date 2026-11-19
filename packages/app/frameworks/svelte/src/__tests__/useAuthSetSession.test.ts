// @vitest-environment jsdom

/**
 * `useAuth().setSession` — the Svelte binding's action for a caller-issued
 * session (xr-molecule-flash-m244), ported from React's
 * `useAuthSetSession.test.tsx`.
 *
 * The core client gained `setSession` so an OAuth redirect / custom sign-in
 * endpoint can adopt the token and profile in one update. The Svelte hook runs
 * once during component init and publishes through stores, so the mounting
 * surface here is the package's usual one: `svelte`'s context and lifecycle
 * functions are stubbed (there is no component tree), `renderAuth` runs the
 * hook the way a component's init does, and a store read is React's rendered
 * value.
 *
 * @module
 */

import { get } from 'svelte/store'
import { describe, expect, it, vi } from 'vitest'

import type { StorageAdapter, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { setMoleculeContext } from '../context.js'
import { useAuth } from '../hooks/useAuth.js'

const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  mountCallbacks: [] as Array<() => void>,
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onMount: (callback: () => void): void => {
    svelteLifecycle.mountCallbacks.push(callback)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

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
const createMockStorage = (): StorageAdapter & { store: Record<string, string> } => {
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
 * Runs `useAuth<AppUser>()` against a real client sharing `storage`, the way a
 * component's init does under `setMoleculeContext`.
 *
 * @param storage - The client's storage adapter.
 * @returns The hook result and the underlying client.
 */
const renderAuth = (
  storage: StorageAdapter,
): {
  result: ReturnType<typeof useAuth<AppUser>>
  client: ReturnType<typeof createJWTAuthClient<AppUser>>
} => {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.mountCallbacks.length = 0
  svelteLifecycle.destroyCallbacks.length = 0
  const client = createJWTAuthClient<AppUser>({ storage })
  setMoleculeContext({ auth: client })
  const result = useAuth<AppUser>()
  for (const callback of svelteLifecycle.mountCallbacks.splice(0)) callback()
  return { result, client }
}

describe('useAuth().setSession', () => {
  it('adopts a caller-issued session: the subscriber sees authenticated state at once', () => {
    const storage = createMockStorage()
    const { result, client } = renderAuth(storage)
    const token = createMockJWT()
    const delegate = vi.spyOn(client, 'setSession')

    expect(get(result.isAuthenticated)).toBe(false)
    expect(get(result.user)).toBeNull()

    result.setSession({ accessToken: token, user: appUser })

    // The hook delegates to the core client's one-update adoption…
    expect(delegate).toHaveBeenCalledWith({ accessToken: token, user: appUser })
    // …and the subscriber (useAuth's live store) republishes it.
    expect(get(result.status)).toBe('authenticated')
    expect(get(result.isAuthenticated)).toBe(true)
    expect(get(result.user)).toEqual(appUser)
    expect(get(result.state).initialized).toBe(true)
  })

  it('persists the token and the custom user fields the pages read', () => {
    const storage = createMockStorage()
    const { result, client } = renderAuth(storage)
    const token = createMockJWT()

    result.setSession({ accessToken: token, user: appUser })

    expect(client.getAccessToken()).toBe(token)
    expect(client.getUser()?.username).toBe('ann')
    expect(client.getUser()?.image).toBe('https://example.com/ann.png')
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(appUser)
    expect(get(result.user)?.username).toBe('ann')
  })

  it('a stored session still survives a fresh hook read (restore path)', () => {
    const storage = createMockStorage()
    const first = renderAuth(storage)

    first.result.setSession({ accessToken: createMockJWT(), user: appUser })

    // A second client over the same storage is what a page reload builds.
    const second = renderAuth(storage)
    expect(get(second.result.user)).toEqual(appUser)
    expect(get(second.result.isAuthenticated)).toBe(true)
  })
})
