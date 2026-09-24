// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real auth/i18n/state/theme providers
 * mounted through `MoleculeProvider`, read back through the hooks.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'
import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as commonLocales from '@molecule/app-locales-common'
import { provider as stateProvider } from '@molecule/app-state-zustand'
import { provider as themeProvider } from '@molecule/app-theme-css-variables'

import { MoleculeProvider, useAuth, useStore, useTheme, useTranslation } from '../index.js'

interface User {
  id: string
  name: string
}

registerLocaleModule(commonLocales)
const authClient = createJWTAuthClient<User>({ baseURL: '/api' })
const inbox = stateProvider.createStore({ initialState: { unread: 3 } })

/**
 * The example's dashboard.
 *
 * @returns The rendered dashboard.
 */
function Dashboard(): JSX.Element {
  const { user, isAuthenticated } = useAuth<User>()
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()
  const unread = useStore(inbox, { selector: (state) => state.unread })

  return (
    <main data-theme={mode}>
      <h1>
        {isAuthenticated
          ? t(
              'auth.modal.loggedInAs',
              { who: user?.name ?? '' },
              { defaultValue: 'Logged in as {{who}}' },
            )
          : t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}
      </h1>
      <p>{t('common.countUnread', { count: unread }, { defaultValue: '{{count}} unread' })}</p>
      <button onClick={() => inbox.setState({ unread: 0 })}>
        {t('common.markAllRead', undefined, { defaultValue: 'Mark all read' })}
      </button>
      <button onClick={toggleTheme}>
        {t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}
      </button>
    </main>
  )
}

/**
 * The example's root component.
 *
 * @returns The provider-wrapped dashboard.
 */
function App(): JSX.Element {
  return (
    <MoleculeProvider
      state={stateProvider}
      auth={authClient}
      theme={themeProvider}
      i18n={getI18nProvider()}
    >
      <Dashboard />
    </MoleculeProvider>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders through MoleculeProvider and reacts to store + theme changes', async () => {
    const { container } = render(<App />)

    expect(screen.getByRole('heading').textContent).toBe('Log in')
    expect(screen.getByText('3 unread')).toBeTruthy()

    fireEvent.click(screen.getByText('Mark all read'))
    expect(screen.getByText('0 unread')).toBeTruthy()

    const main = container.querySelector('main')
    const before = main?.getAttribute('data-theme')
    expect(before).toBe(themeProvider.getTheme().mode)
    fireEvent.click(screen.getByText('Toggle theme'))
    expect(main?.getAttribute('data-theme')).toBe(before === 'light' ? 'dark' : 'light')

    // The registered locale bond drives the text, not just the inline defaults.
    await act(async () => {
      await getI18nProvider().setLocale('de')
    })
    expect(screen.getByRole('heading').textContent).toBe(commonLocales.de['auth.login.logIn'])
    await act(async () => {
      await getI18nProvider().setLocale('en')
    })
  })
})
