// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { AuthProvider, I18nProvider, useAuth } from '@molecule/app-react'

import { AuthGuard } from '../components/AuthGuard.js'

const clients: AuthClient<UserProfile>[] = []

/** A real client whose only credential is the cookie-session presence hint. */
function cookieClient(): AuthClient<UserProfile> {
  document.cookie = 'mol_auth=1; path=/'
  const client = createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
  clients.push(client)
  return client
}

/** A real client with a Bearer candidate but no cached profile. */
function bearerClient(): { client: AuthClient<UserProfile>; token: string } {
  const token = [
    btoa('{}'),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    'signature',
  ].join('.')
  const values = new Map([['molecule:auth:accessToken', token]])
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  clients.push(client)
  return { client, token }
}

/** Expose the real hook state beside the real route guard. */
function AuthStateReadout() {
  const { status, isAuthenticated, user } = useAuth<UserProfile>()
  return (
    <output data-testid="auth-state">{JSON.stringify({ status, isAuthenticated, user })}</output>
  )
}

/** Render the real providers, client and guard without auth mocks. */
function renderGuard(client: AuthClient<UserProfile>) {
  return render(
    <AuthProvider client={client}>
      <I18nProvider provider={createSimpleI18nProvider()}>
        <MemoryRouter initialEntries={['/private']}>
          <AuthStateReadout />
          <Routes>
            <Route element={<AuthGuard />}>
              <Route path="/private" element={<p>Protected section</p>} />
            </Route>
            <Route path="/login" element={<p>Login page</p>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </AuthProvider>,
  )
}

afterEach(() => {
  cleanup()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('AuthGuard with a real restoring client', () => {
  it('does not redirect a cookie-only candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = cookieClient()
    renderGuard(client)
    await act(async () => client.whenRestored!())

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(screen.getByText('Protected section')).toBeTruthy()
    expect(screen.queryByText('Login page')).toBeNull()
    expect(document.cookie).toContain('mol_auth=1')
  })

  it('does not redirect a Bearer candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const { client, token } = bearerClient()
    renderGuard(client)
    await act(async () => client.whenRestored!())

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(client.getAccessToken()).toBe(token)
    expect(screen.getByText('Protected section')).toBeTruthy()
    expect(screen.queryByText('Login page')).toBeNull()
    expect(JSON.parse(screen.getByTestId('auth-state').textContent ?? '{}')).toMatchObject({
      status: 'unavailable',
      isAuthenticated: false,
      user: null,
    })
  })
})
