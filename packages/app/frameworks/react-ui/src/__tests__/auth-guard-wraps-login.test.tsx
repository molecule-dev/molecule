// @vitest-environment jsdom
/**
 * An AuthGuard that wraps the whole route tree, login page included, must
 * redirect once and then render the login page.
 *
 * Before the fix the guard stayed mounted on `/login` and kept rendering
 * `<Navigate state={{ from }}>`: a fresh `state` object on every render re-ran
 * the redirect on every render, so the tab hung (and a test worker ran out of
 * memory).
 *
 * @module
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-react', () => ({
  useAuth: () => ({ status: 'unauthenticated', isAuthenticated: false }),
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

import { AuthGuard } from '../components/AuthGuard.js'

let renders = 0

/** Counts renders of the routed content and shows the current path. */
function Where(): ReturnType<typeof createElement> {
  renders++
  return createElement('p', { 'data-testid': 'where' }, useLocation().pathname)
}

const renderWrapped = (initial: string, loginPath?: string): void => {
  render(
    createElement(
      MemoryRouter,
      { initialEntries: [initial] },
      createElement(
        AuthGuard,
        { loginPath },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/',
            element: createElement('div', null, 'protected page'),
          }),
          createElement(Route, {
            path: '/login',
            element: createElement('div', null, 'login page'),
          }),
          createElement(Route, {
            path: '/signin',
            element: createElement('div', null, 'signin page'),
          }),
        ),
        createElement(Where),
      ),
    ),
  )
}

describe('AuthGuard around the login route', () => {
  afterEach(() => {
    cleanup()
    renders = 0
  })

  it('redirects once to the login path and renders the login page', async () => {
    await act(async () => {
      renderWrapped('/')
    })

    expect(screen.getByText('login page')).toBeTruthy()
    expect(screen.queryByText('protected page')).toBeNull()
    expect(screen.getByTestId('where').textContent).toBe('/login')
    expect(renders).toBeLessThan(5)
  })

  it('compares only the pathname of a login path with a query', async () => {
    await act(async () => {
      renderWrapped('/', '/signin?next=%2F')
    })

    expect(screen.getByText('signin page')).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/signin')
    expect(renders).toBeLessThan(5)
  })
})
