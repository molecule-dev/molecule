// @vitest-environment jsdom
/**
 * An AuthGuard that wraps the whole route tree, login page included, must
 * redirect once and then render the login page — the Solid port of
 * `@molecule/app-ui-react`'s `auth-guard-wraps-login.test.tsx`.
 *
 * A guard that kept redirecting on every update would hang the page. React
 * counts renders to catch that; the observable equivalent here is the number of
 * navigations the guard asks the router for, so one redirect means one
 * `navigate` call.
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'
import type * as AppSolidBinding from '@molecule/app-solid'

vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof AppSolidBinding>()
  return {
    ...actual,
    useAuth: () => ({ status: () => 'unauthenticated', isAuthenticated: () => false }),
  }
})

import { MoleculeProvider, useRouter } from '@molecule/app-solid'

const { AuthGuard } = await import('../components/AuthGuard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** The routed page for the current path. */
function Routed(): JSX.Element {
  const { location } = useRouter()
  const pathname = (): string => location().pathname
  return (
    <>
      {pathname() === '/login' && <p>login page</p>}
      {pathname() === '/signin' && <p>signin page</p>}
      {pathname() !== '/login' && pathname() !== '/signin' && <p>protected page</p>}
    </>
  )
}

/** The current path, so the assertion sees where the guard left the router. */
function Where(): JSX.Element {
  const { location } = useRouter()
  return <p data-testid="where">{location().pathname}</p>
}

/**
 * Renders the guard around the whole route tree at `initial`.
 *
 * @param initial - The starting path.
 * @param loginPath - The guard's login path, when the case sets one.
 * @returns The navigation spy on the real memory router.
 */
function renderWrapped(initial: string, loginPath?: string): ReturnType<typeof vi.spyOn> {
  const router: Router = createMemoryRouter({ initialEntries: [initial] })
  const navigate = vi.spyOn(router, 'navigate')
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <MoleculeProvider config={{ router, i18n: createSimpleI18nProvider() }}>
          <AuthGuard loginPath={loginPath}>
            <>
              <Routed />
              <Where />
            </>
          </AuthGuard>
        </MoleculeProvider>
      ),
      container,
    ),
  )
  return navigate
}

/** The page text a user sees. */
const bodyText = (): string => document.body.textContent ?? ''

describe('AuthGuard around the login route', () => {
  it('redirects once to the login path and renders the login page', () => {
    const navigate = renderWrapped('/')

    expect(bodyText()).toContain('login page')
    expect(bodyText()).not.toContain('protected page')
    expect(document.querySelector('[data-testid="where"]')?.textContent).toBe('/login')
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenLastCalledWith('/login', expect.objectContaining({ replace: true }))
  })

  it('compares only the pathname of a login path with a query', () => {
    const navigate = renderWrapped('/', '/signin?next=%2F')

    expect(bodyText()).toContain('signin page')
    expect(document.querySelector('[data-testid="where"]')?.textContent).toBe('/signin')
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenLastCalledWith(
      '/signin?next=%2F',
      expect.objectContaining({ replace: true }),
    )
  })
})
