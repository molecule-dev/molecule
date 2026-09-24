// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider with
 * the companion locale bond, real react-router.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { BrowserRouter, Link } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as authShellLocales from '@molecule/app-locales-auth-shell'
import { MoleculeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AuthShell, useAuthFormStateContext } from '../index.js'

setClassMap(classMap)
registerLocaleModule(authShellLocales)

/**
 * The example's login form.
 *
 * @returns The form bound to the shared auth form state.
 */
function LoginForm(): JSX.Element {
  const { fields, setField, clear } = useAuthFormStateContext()
  const [password, setPassword] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        clear()
      }}
    >
      <input
        type="email"
        value={fields.email ?? ''}
        onChange={(e) => setField('email', e.target.value)}
      />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Sign in</button>
    </form>
  )
}

/**
 * The example's app.
 *
 * @returns The auth shell wrapping the login form.
 */
function App(): JSX.Element {
  return (
    <MoleculeProvider i18n={getI18nProvider()}>
      <BrowserRouter>
        <AuthShell
          heading="Sign in"
          subheading="Welcome back."
          brand={<strong>Acme</strong>}
          footer={<Link to="/signup">Create an account</Link>}
        >
          <LoginForm />
        </AuthShell>
      </BrowserRouter>
    </MoleculeProvider>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the shell with heading, brand, footer, back link and a stateful form', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sign in')
    expect(screen.getByText('Welcome back.')).toBeTruthy()
    expect(screen.getByText('Acme').tagName).toBe('STRONG')
    expect(screen.getByText('Create an account').getAttribute('href')).toBe('/signup')
    expect(screen.getByText('Create an account').closest('footer')).not.toBeNull()
    const back = screen.getByText('Back to home').closest('a')
    expect(back?.getAttribute('href')).toBe('/')

    const email = document.querySelector('input[type="email"]') as HTMLInputElement
    fireEvent.change(email, { target: { value: 'ada@example.com' } })
    expect(email.value).toBe('ada@example.com')

    fireEvent.submit(email.closest('form') as HTMLFormElement)
    expect(email.value).toBe('')

    // The back link is translated by the registered locale bond.
    await act(async () => {
      await getI18nProvider().setLocale('de')
    })
    expect(document.body.textContent).toContain(authShellLocales.de['auth.backHome'])
    await act(async () => {
      await getI18nProvider().setLocale('en')
    })
  })
})
