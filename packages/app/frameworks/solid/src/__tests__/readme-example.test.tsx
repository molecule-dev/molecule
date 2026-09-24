// @vitest-environment jsdom
/* @jsxImportSource solid-js/h */
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works: real auth/i18n/state/theme providers are mounted through
 * `MoleculeProvider`, read back through the primitives, and rendered with
 * `solid-js/web`'s `render()`.
 *
 * This package's vitest config has no Solid JSX compiler, so this file's JSX
 * goes through Solid's hyperscript runtime (`solid-js/h`). The one difference
 * from compiled Solid: a reactive prop/child must be written as a function
 * (`data-theme={() => mode()}`) — the compiler wraps `{mode()}` like that automatically.
 *
 * @module
 */
import { type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Vitest resolves `solid-js` with Node conditions, i.e. Solid's non-reactive
// SSR build, where `render()` is unsupported. Resolve it with BROWSER
// conditions instead — the same build a real app runs — both for imports Vite
// resolves (this file + the package under test, via `vi.mock`) and for the
// ones Node resolves inside `solid-js/web` / `solid-js/h` (via a resolve hook),
// so everything shares ONE reactive runtime.
vi.hoisted(async () => {
  const { registerHooks } = await import('node:module')
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'solid-js' || specifier.startsWith('solid-js/')) {
        return nextResolve(specifier, { ...context, conditions: ['browser', 'import', 'default'] })
      }
      return nextResolve(specifier, context)
    },
  })
})
vi.mock('solid-js', () => import('solid-js/dist/solid.js'))
vi.mock('solid-js/web', () => import('solid-js/web/dist/web.js'))

import { createJWTAuthClient } from '@molecule/app-auth'
import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as commonLocales from '@molecule/app-locales-common'
import { provider as stateProvider } from '@molecule/app-state-zustand'
import { provider as themeProvider } from '@molecule/app-theme-css-variables'

import { createAuth, createI18n, createTheme, MoleculeProvider } from '../index.js'

interface User {
  id: string
  name: string
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('README @example', () => {
  it('renders through MoleculeProvider and reacts to a theme toggle', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    )
    document.body.innerHTML = '<div id="root"></div>'

    registerLocaleModule(commonLocales)
    const authClient = createJWTAuthClient<User>({ baseURL: '/api' })

    /**
     * The example's dashboard.
     *
     * @returns The dashboard element.
     */
    function Dashboard(): JSX.Element {
      const { user, isAuthenticated } = createAuth<User>()
      const { t } = createI18n()
      const { mode, toggleTheme } = createTheme()
      return (
        <main data-theme={() => mode()}>
          <Show
            when={isAuthenticated()}
            fallback={<h1>{t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}</h1>}
          >
            <h1>
              {t(
                'auth.modal.loggedInAs',
                { who: user()?.name ?? '' },
                { defaultValue: 'Logged in as {{who}}' },
              )}
            </h1>
          </Show>
          <button type="button" data-mol-id="toggle-theme" onClick={toggleTheme}>
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
          config={{
            state: stateProvider,
            auth: authClient,
            theme: themeProvider,
            i18n: getI18nProvider(),
          }}
        >
          <Dashboard />
        </MoleculeProvider>
      )
    }

    const root = document.getElementById('root') as HTMLElement
    const dispose = render(() => <App />, root)

    expect(root.querySelector('h1')?.textContent).toBe('Log in')
    const main = root.querySelector('main')
    const before = themeProvider.getTheme().mode
    expect(main?.getAttribute('data-theme')).toBe(before)

    root.querySelector('button')?.click()
    expect(main?.getAttribute('data-theme')).toBe(before === 'light' ? 'dark' : 'light')

    dispose()
  })
})
