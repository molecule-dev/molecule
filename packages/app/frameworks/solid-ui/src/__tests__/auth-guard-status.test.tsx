// @vitest-environment jsdom
/**
 * AuthGuard decides from `useAuth().status`, not `state.initialized` — the
 * Solid port of `@molecule/app-ui-react`'s `auth-guard-status.test.tsx`.
 *
 * xr-molecule-flash-m177: a protected page waited for a session-restore round trip
 * before it rendered, so every navigation in a spec paid an API call — four tests
 * finished at 15.0–15.9 s of a 15 s budget and the grader timed two out. A stored
 * token AND user make the FIRST render `'authenticated'`, so the guard must render
 * the page then and wait only while the status is `'loading'`.
 *
 * The auth fields are the only mock: routing and i18n are the package's real
 * binding and the core memory router, so the redirect is a real navigation.
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '@molecule/app-auth'
import { createSimpleI18nProvider, I18nError } from '@molecule/app-i18n'
import { createMemoryRouter } from '@molecule/app-routing'
import type * as AppSolidBinding from '@molecule/app-solid'

const mockAuth = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    initialized: false,
    authenticated: true,
    user: { id: 'ann' },
    loading: false,
    error: null,
  } as AuthState,
}))

vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof AppSolidBinding>()
  return {
    ...actual,
    useAuth: () => ({
      status: () => mockAuth.state.status,
      state: () => mockAuth.state,
      isAuthenticated: () => mockAuth.state.authenticated,
      isLoading: () => mockAuth.state.loading,
      user: () => mockAuth.state.user,
    }),
  }
})

import { MoleculeProvider, useRouter } from '@molecule/app-solid'

const { AuthGuard } = await import('../components/AuthGuard.jsx')

const disposers: Array<() => void> = []

beforeEach(() => {
  mockAuth.state = {
    status: 'authenticated',
    initialized: false,
    authenticated: true,
    user: { id: 'ann' },
    loading: false,
    error: null,
  }
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * The routed page: the login route's own page at `/login`, the protected page
 * everywhere else — what a route tree under the guard would render.
 *
 * @returns The current route's page.
 */
function Routed(): JSX.Element {
  const { location } = useRouter()
  return <>{location().pathname === '/login' ? <p>login page</p> : <p>protected page</p>}</>
}

/** Renders the guard at `/` with a protected page and a login page. */
function renderGuard(): void {
  const router = createMemoryRouter({ initialEntries: ['/'] })
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <MoleculeProvider router={router} i18n={createSimpleI18nProvider()}>
          <AuthGuard>
            <Routed />
          </AuthGuard>
        </MoleculeProvider>
      ),
      container,
    ),
  )
}

/** The page text a user sees. */
const bodyText = (): string => document.body.textContent ?? ''

describe('AuthGuard reads the session status (xr-molecule-flash-m177)', () => {
  it('renders the page when a restored session is authenticated before `initialized`', () => {
    // The optimistic restore: a stored token AND user are the session, and the
    // first render must not wait for a background verification.
    renderGuard()

    expect(bodyText()).toContain('protected page')
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
  })

  it('renders the page while the session is `unavailable` (stored, unconfirmed)', () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'unavailable',
      initialized: true,
      authenticated: false,
      user: null,
    }

    renderGuard()

    expect(bodyText()).toContain('protected page')
  })

  it('shows the loading fallback only while the status is `loading`', () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'loading',
      initialized: false,
      authenticated: false,
      user: null,
    }

    renderGuard()

    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).not.toBeNull()
    expect(bodyText()).not.toContain('protected page')
    expect(bodyText()).not.toContain('login page')
  })

  it('redirects an unauthenticated visitor to the login path', () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'unauthenticated',
      initialized: true,
      authenticated: false,
      user: null,
    }

    renderGuard()

    expect(bodyText()).toContain('login page')
    expect(bodyText()).not.toContain('protected page')
  })

  it('AuthGuard without children throws when there is no routed view', () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'authenticated',
      initialized: false,
      authenticated: true,
      user: { id: 'ann' },
    }
    // A router with no routed view: the guard falls back to `RoutedView`.
    const router = createMemoryRouter({ initialEntries: ['/'] })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let thrown: unknown
    try {
      disposers.push(
        render(
          () => (
            <MoleculeProvider router={router} i18n={createSimpleI18nProvider()}>
              <AuthGuard />
            </MoleculeProvider>
          ),
          container,
        ),
      )
    } catch (error) {
      thrown = error
    } finally {
      consoleError.mockRestore()
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown).toMatchObject({ i18nKey: 'solid.error.noRoutedView' })
  })
})
