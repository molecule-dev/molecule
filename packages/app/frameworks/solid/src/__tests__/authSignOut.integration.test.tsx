// @vitest-environment jsdom

/**
 * `useAuth` / `useAuthClient` local sign-out, over the real client: the
 * `setAccessToken(null)` + `setUser(null)` sequence every page's Sign out
 * button runs must leave the page signed out and must not persist a session a
 * reload would restore.
 *
 * Mirrors the React package's `authSignOut.integration.test.tsx`.
 *
 * @module
 */

import { type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type StorageAdapter, type UserProfile } from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useAuth, useAuthClient } from '../primitives/auth.js'

const user: UserProfile = { id: 'reader', name: 'Reader' }
const disposers: Array<() => void> = []

/**
 * An in-memory `StorageAdapter`.
 *
 * @returns The adapter.
 */
function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container it rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/** The signed-in header: a name and a Sign out button, or the Sign in link. */
function Header(): JSX.Element {
  const { isAuthenticated, status, setUser, user: currentUser } = useAuth<UserProfile>()
  const client = useAuthClient<UserProfile>()
  return (
    <Show
      when={isAuthenticated()}
      fallback={
        <>
          <a href="/login">Sign in</a>
          <output aria-label="Auth status">{status()}</output>
        </>
      }
    >
      <span>Signed in as {currentUser()?.name}</span>
      <button
        type="button"
        onClick={() => {
          client.setAccessToken(null)
          setUser(null)
        }}
      >
        Sign out
      </button>
      <output aria-label="Auth status">{status()}</output>
    </Show>
  )
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('useAuth local sign-out', () => {
  it('renders signed out after the setAccessToken(null) + setUser(null) sequence and stays signed out on reload', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    document.cookie = 'mol_auth=1; path=/'
    const storage = createStorage()
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    const container = mount(() => (
      <AuthContext.Provider value={client}>
        <Header />
      </AuthContext.Provider>
    ))
    expect(container.textContent).toContain('Signed in as Reader')
    expect(container.querySelector('output[aria-label="Auth status"]')?.textContent).toBe(
      'authenticated',
    )

    container.querySelector('button')?.click()

    const link = container.querySelector('a')
    expect(link?.textContent).toBe('Sign in')
    expect(link?.getAttribute('href')).toBe('/login')
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('output[aria-label="Auth status"]')?.textContent).toBe(
      'unauthenticated',
    )
    expect(client.isAuthenticated()).toBe(false)
    expect(client.getUser()).toBeNull()
    expect(client.getAccessToken()).toBeNull()
    expect(client.getRefreshToken()).toBeNull()
    expect(document.cookie).not.toContain('mol_auth=')

    const reloaded = createJWTAuthClient({ storage, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(reloaded.getAccessToken()).toBeNull()
    expect(reloaded.getRefreshToken()).toBeNull()
    expect(fetchBoundary).not.toHaveBeenCalled()
  })
})
