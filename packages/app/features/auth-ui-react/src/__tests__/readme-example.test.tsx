// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real JWT auth client, i18n provider +
 * locale bonds, Tailwind ClassMap and react-router. Only the network edge
 * (`fetch`) is stubbed — the OAuth provider's callback is simulated by landing
 * on `/login?code&state` as the provider redirect would.
 *
 * @module
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { JSX } from 'react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'
import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as commonLocales from '@molecule/app-locales-common'
import * as oauthButtonLocales from '@molecule/app-locales-oauth-buttons'
import { MoleculeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { OAuthButtons } from '../index.js'

vi.stubEnv('VITE_API_URL', 'https://api.example.com')
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

setClassMap(classMap)
registerLocaleModule(commonLocales)
registerLocaleModule(oauthButtonLocales)
const authClient = createJWTAuthClient({ baseURL: import.meta.env.VITE_API_URL })
const oauthConfig = {
  baseURL: import.meta.env.VITE_API_URL,
  oauthProviders: ['github', 'google'],
}

/**
 * The example's login page.
 *
 * @returns The OAuth button row.
 */
function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  return (
    <OAuthButtons oauthConfig={oauthConfig} showLabels onSuccess={() => navigate('/dashboard')} />
  )
}

/**
 * The example's app.
 *
 * @returns The routed app.
 */
function App(): JSX.Element {
  return (
    <MoleculeProvider auth={authClient} i18n={getI18nProvider()}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Routes>
      </BrowserRouter>
    </MoleculeProvider>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
    window.sessionStorage.clear()
  })
  afterAll(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('renders the divider and labelled provider buttons on /login', () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    expect(screen.getByText('Or continue with')).toBeTruthy()
    expect(screen.getByText('GitHub')).toBeTruthy()
    expect(screen.getByText('Google')).toBeTruthy()
    expect(document.querySelector('[data-mol-id="oauth-button-github"]')).not.toBeNull()
  })

  it('exchanges the ?code callback, establishes the session and runs onSuccess', async () => {
    window.sessionStorage.setItem('oauth_provider', 'github')
    window.history.pushState({}, '', '/login?code=abc&state=xyz')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ props: { id: 'u1', email: 'ada@example.com' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      }),
    )

    render(<App />)

    await waitFor(() => expect(screen.getByRole('heading').textContent).toBe('Dashboard'))
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/users/log-in/oauth',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(authClient.getUser()).toEqual({ id: 'u1', email: 'ada@example.com' })
    expect(authClient.getAccessToken()).toBe('test-token')
    expect(window.location.pathname).toBe('/dashboard')
  })

  it('shows an inline alert when the exchange fails', async () => {
    window.sessionStorage.setItem('oauth_provider', 'github')
    window.history.pushState({}, '', '/login?code=bad&state=xyz')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid OAuth state' }), { status: 400 }),
    )

    render(<App />)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Invalid OAuth state'))
  })
})
