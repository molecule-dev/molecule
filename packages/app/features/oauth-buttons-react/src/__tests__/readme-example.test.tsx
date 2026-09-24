// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { MoleculeProvider, useOAuth } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { OAuthButtons, OAuthDivider } from '../index.js'

// Module scope, so useOAuth's memoised callbacks stay stable across renders.
const oauthConfig = {
  baseURL: import.meta.env.VITE_API_URL,
  oauthEndpoint: '/users/oauth', // GET /users/oauth/:provider (`@molecule/api-resource-user`)
  oauthProviders: ['google', 'github', 'apple'],
  onSuccess: () => window.location.assign('/dashboard'),
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered login page.
 */
function LoginPage(): React.JSX.Element {
  // Also mount this on the page the provider returns to — useOAuth finishes the ?code exchange there.
  const { providers, loginViaPopup } = useOAuth(oauthConfig)
  return (
    <section>
      <OAuthDivider />
      <OAuthButtons
        providers={providers}
        onSelect={loginViaPopup} // or `redirect` for a full-page flow
        layout="vertical"
        showLabels
        brandButtons
      />
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders one labelled button per configured provider and opens the OAuth popup', () => {
    vi.useFakeTimers()
    // The browser popup is the outside world here.
    const popup = { closed: false, close: vi.fn(), focus: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    const view = render(
      <MoleculeProvider
        auth={createJWTAuthClient({ baseURL: import.meta.env.VITE_API_URL })}
        i18n={createSimpleI18nProvider('en')}
      >
        <LoginPage />
      </MoleculeProvider>,
    )
    expect(view.getByText('or continue with')).toBeTruthy()
    const buttons = view.getAllByRole('button')
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Continue with Google',
      'Continue with GitHub',
      'Continue with Apple',
    ])
    expect(view.getByText('GitHub')).toBeTruthy()
    expect(view.getByRole('group').getAttribute('data-layout')).toBe('vertical')

    fireEvent.click(view.getByRole('button', { name: 'Continue with GitHub' }))
    expect(open).toHaveBeenCalledTimes(1)
    const [url, name] = open.mock.calls[0] ?? []
    expect(url).toBe(`${import.meta.env.VITE_API_URL ?? ''}/users/oauth/github`)
    expect(name).toBe('molecule-oauth-popup')
    vi.clearAllTimers()
  })
})
