// @vitest-environment jsdom
/**
 * AuthGuard decides from `useAuth().status`, not `state.initialized`.
 *
 * xr-molecule-flash-m177: a protected page waited for a session-restore round trip
 * before it rendered, so every navigation in a spec paid an API call — four tests
 * finished at 15.0–15.9 s of a 15 s budget and the grader timed two out. A stored
 * token AND user make the FIRST render `'authenticated'`, so the guard must render
 * the page then and wait only while the status is `'loading'`.
 *
 * @module
 */
import { cleanup, render, screen } from '@testing-library/react'
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '@molecule/app-auth'
import { I18nError } from '@molecule/app-i18n'
import { RouterProvider, useLocation } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'

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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({
    status: mockAuth.state.status,
    state: mockAuth.state,
    isAuthenticated: mockAuth.state.authenticated,
  }),
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

import { AuthGuard } from '../components/AuthGuard.js'

/** The page for the current path, replacing React Router's `<Routes>` tree. */
function Pages(): ReactElement | null {
  const { pathname } = useLocation()
  if (pathname === '/') return createElement('div', null, 'protected page')
  if (pathname === '/login') return createElement('div', null, 'login page')
  return null
}

/**
 * Renders the guard at `/` with a protected page and a login page.
 *
 * @returns The render result.
 */
const renderGuard = () =>
  render(
    createElement(RouterProvider, {
      router: createMemoryRouter({ initialEntries: ['/'] }),
      routedView: Pages,
      children: createElement(AuthGuard),
    }),
  )

describe('AuthGuard reads the session status (xr-molecule-flash-m177)', () => {
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
    cleanup()
  })

  it('renders the page when a restored session is authenticated before `initialized`', () => {
    // The optimistic restore: a stored token AND user are the session, and the
    // first render must not wait for a background verification.
    renderGuard()

    expect(screen.getByText('protected page')).toBeTruthy()
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

    expect(screen.getByText('protected page')).toBeTruthy()
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
    expect(screen.queryByText('protected page')).toBeNull()
    expect(screen.queryByText('login page')).toBeNull()
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

    expect(screen.getByText('login page')).toBeTruthy()
    expect(screen.queryByText('protected page')).toBeNull()
  })

  it('AuthGuard without children throws when there is no routed view', () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'authenticated',
      initialized: false,
      authenticated: true,
      user: { id: 'ann' },
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let thrown: unknown
    try {
      render(
        createElement(RouterProvider, {
          router: createMemoryRouter({ initialEntries: ['/'] }),
          children: createElement(AuthGuard),
        }),
      )
    } catch (error) {
      thrown = error
    } finally {
      consoleError.mockRestore()
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown).toMatchObject({ i18nKey: 'react.error.noRoutedView' })
  })
})
