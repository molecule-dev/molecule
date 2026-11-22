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
import { createElement, type FunctionComponent, type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RouterProvider, useLocation } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ status: 'unauthenticated', isAuthenticated: false }),
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

import { AuthGuard, type AuthGuardProps } from '../components/AuthGuard.js'

/**
 * AuthGuard's props parameter is optional (it defaults to `{}`), so
 * `createElement` infers `{}` for it and rejects every real prop. Annotate the
 * component with its props type so the call sites are type-checked.
 */
const Guard: FunctionComponent<AuthGuardProps> = AuthGuard

let renders = 0

/** Counts renders of the routed content and shows the current path. */
function Where(): ReturnType<typeof createElement> {
  renders++
  return createElement('p', { 'data-testid': 'where' }, useLocation().pathname)
}

/** The page for the current path, replacing React Router's `<Routes>` tree. */
function Pages(): ReactElement | null {
  const { pathname } = useLocation()
  if (pathname === '/') return createElement('div', null, 'protected page')
  if (pathname === '/login') return createElement('div', null, 'login page')
  if (pathname === '/signin') return createElement('div', null, 'signin page')
  return null
}

const renderWrapped = (initial: string, loginPath?: string): void => {
  const router = createMemoryRouter({ initialEntries: [initial] })
  render(
    createElement(RouterProvider, {
      router,
      children: createElement(Guard, { loginPath }, createElement(Pages), createElement(Where)),
    }),
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
