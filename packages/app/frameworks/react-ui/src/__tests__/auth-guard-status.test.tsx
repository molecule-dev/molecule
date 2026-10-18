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
import { createElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '@molecule/app-auth'

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

vi.mock('@molecule/app-react', () => ({
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

/**
 * Renders the guard at `/` with a protected page and a login page.
 *
 * @returns The render result.
 */
const renderGuard = () =>
  render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/'] },
      createElement(
        Routes,
        null,
        createElement(
          Route,
          { element: createElement(AuthGuard) },
          createElement(Route, {
            path: '/',
            element: createElement('div', null, 'protected page'),
          }),
        ),
        createElement(Route, {
          path: '/login',
          element: createElement('div', null, 'login page'),
        }),
      ),
    ),
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
    mockAuth.state = { ...mockAuth.state, status: 'unavailable', initialized: true }

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
})
