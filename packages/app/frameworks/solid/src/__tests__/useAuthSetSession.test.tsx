// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useAuthSetSession.test.tsx`:
 * `useAuth().setSession` adopts a caller-issued session in one update and the
 * subscriber sees it at once.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AuthClient, createJWTAuthClient, type UserProfile } from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useAuth, type UseAuthResult } from '../primitives/auth.js'

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

const disposers: Array<() => void> = []

/**
 * Renders `useAuth<AppUser>()` against a real client sharing `storage`.
 *
 * @param storage - The client's storage adapter.
 * @returns The primitive result and the underlying client.
 */
const renderAuth = (
  storage: ReturnType<typeof createMockStorage>,
): {
  result: UseAuthResult<AppUser>
  client: AuthClient<AppUser>
} => {
  const client = createJWTAuthClient<AppUser>({ storage })
  let captured: UseAuthResult<AppUser> | undefined
  function Probe(): JSX.Element {
    captured = useAuth<AppUser>()
    return <></>
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <AuthContext.Provider value={client}>
        <Probe />
      </AuthContext.Provider>
    ),
    container,
  )
  disposers.push(() => {
    dispose()
    container.remove()
  })
  if (captured === undefined) throw new Error('the probe did not create useAuth')
  return { result: captured, client }
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('useAuth().setSession', () => {
  it('adopts a caller-issued session: the subscriber sees authenticated state at once', () => {
    const storage = createMockStorage()
    const { result, client } = renderAuth(storage)
    const token = createMockJWT()
    const delegate = vi.spyOn(client, 'setSession')

    expect(result.isAuthenticated()).toBe(false)
    expect(result.user()).toBeNull()

    result.setSession({ accessToken: token, user: appUser })

    // The primitive delegates to the core client's one-update adoption…
    expect(delegate).toHaveBeenCalledWith({ accessToken: token, user: appUser })
    // …and its subscription republishes it.
    expect(result.status()).toBe('authenticated')
    expect(result.isAuthenticated()).toBe(true)
    expect(result.user()).toEqual(appUser)
    expect(result.state().initialized).toBe(true)
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
    expect(result.user()?.username).toBe('ann')
  })

  it('a stored session still survives a fresh hook read (restore path)', () => {
    const storage = createMockStorage()
    const first = renderAuth(storage)

    first.result.setSession({ accessToken: createMockJWT(), user: appUser })

    // A second client over the same storage is what a page reload builds.
    const second = renderAuth(storage)
    expect(second.result.user()).toEqual(appUser)
    expect(second.result.isAuthenticated()).toBe(true)
  })
})
