/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the real JWT auth client, i18n
 * provider, locale bond and Tailwind ClassMap. Only the network edge
 * (`fetch`) and the browser's `window.open` are stubbed.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { JSX } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'
import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import * as commonLocales from '@molecule/app-locales-common'
import { MoleculeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AuthModalMount } from '../index.js'

setClassMap(classMap)
setIconSet(iconSet) // the modal's close/success icons throw without it
registerLocaleModule(commonLocales)
const authClient = createJWTAuthClient({ baseURL: '/api' })
const oauthConfig = { baseURL: '/api', oauthProviders: ['github', 'google'] }

const signedIn = vi.fn()

/**
 * The README example's app (its `console.log` swapped for a spy).
 *
 * @returns The app with the auth modal mounted.
 */
function App(): JSX.Element {
  return (
    <MoleculeProvider auth={authClient} i18n={getI18nProvider()}>
      <AuthModalMount
        oauthConfig={oauthConfig}
        onAuthenticated={() => signedIn(authClient.getUser()?.email)}
      />
      <nav>
        <a href="/login">Log in</a>
        <a href="/signup">Sign up</a>
        <a href="/pricing">Upgrade</a>
      </nav>
    </MoleculeProvider>
  )
}

const fetchMock = vi.fn()
const openMock = vi.fn()

describe('README @example', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'open').mockImplementation(openMock)
  })
  afterEach(() => {
    cleanup()
  })
  afterAll(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens the modal for /login, logs in without navigating, and opens /pricing in a new tab', async () => {
    render(<App />)
    expect(document.querySelector('[data-mol-id="auth-modal"]')).toBeNull()

    // A plain left-click on the /login link opens the modal in login mode.
    const loginLink = screen.getAllByText('Log in').find((el) => el.tagName === 'A')
    expect(loginLink).toBeDefined()
    fireEvent.click(loginLink as HTMLElement)
    expect(document.querySelector('[data-mol-id="auth-modal"]')).not.toBeNull()
    expect(screen.getByText('Log in to keep your work.')).toBeTruthy()
    // The OAuth buttons come from oauthConfig.oauthProviders.
    expect(document.querySelector('[data-mol-id="oauth-button-github"]')).not.toBeNull()
    expect(document.querySelector('[data-mol-id="oauth-button-google"]')).not.toBeNull()

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ accessToken: 'test-token', user: { id: 'u1', email: 'ada@example.com' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const email = document.querySelector('[data-mol-id="auth-modal-email"]') as HTMLInputElement
    const password = document.querySelector(
      '[data-mol-id="auth-modal-password"]',
    ) as HTMLInputElement
    fireEvent.change(email, { target: { value: 'ada@example.com' } })
    fireEvent.change(password, { target: { value: 'correct horse' } })
    await act(async () => {
      fireEvent.submit(email.closest('form') as HTMLFormElement)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
    await waitFor(() => expect(screen.getByText('Logged in!')).toBeTruthy())
    await waitFor(() => expect(signedIn).toHaveBeenCalledWith('ada@example.com'), {
      timeout: 3000,
    })
    await waitFor(() => expect(document.querySelector('[data-mol-id="auth-modal"]')).toBeNull())
    expect(authClient.isAuthenticated()).toBe(true)

    // Upgrade links open in a new tab instead of navigating this one.
    fireEvent.click(screen.getByText('Upgrade'))
    expect(openMock).toHaveBeenCalledWith('/pricing', '_blank', 'noopener,noreferrer')
  })
})
