// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type StorageAdapter, type UserProfile } from '@molecule/app-auth'

import { useAuth, useAuthClient } from '../hooks/useAuth.js'
import { AuthProvider } from '../providers.js'

const user: UserProfile = { id: 'reader', name: 'Reader' }

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

function Header(): React.ReactElement {
  const { isAuthenticated, status, setUser, user: currentUser } = useAuth<UserProfile>()
  const client = useAuthClient<UserProfile>()
  if (!isAuthenticated) {
    return (
      <>
        <a href="/login">Sign in</a>
        <output aria-label="Auth status">{status}</output>
      </>
    )
  }
  return (
    <>
      <span>Signed in as {currentUser?.name}</span>
      <button
        type="button"
        onClick={() => {
          client.setAccessToken(null)
          setUser(null)
        }}
      >
        Sign out
      </button>
      <output aria-label="Auth status">{status}</output>
    </>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useAuth local sign-out', () => {
  it('renders signed out after the setAccessToken(null) + setUser(null) sequence and stays signed out on reload', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    document.cookie = 'mol_auth=1; path=/'
    const storage = createStorage()
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    render(
      <AuthProvider client={client}>
        <Header />
      </AuthProvider>,
    )
    expect(screen.getByText('Signed in as Reader')).toBeTruthy()
    expect(screen.getByLabelText('Auth status').textContent).toBe('authenticated')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login')
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull()
    expect(screen.getByLabelText('Auth status').textContent).toBe('unauthenticated')
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
