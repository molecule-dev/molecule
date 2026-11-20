/**
 * React Router components with transitions turned off.
 *
 * Each wrapper renders React Router's own router with `useTransitions={false}`, so a
 * navigation renders the new route in the same commit that changes the URL instead of
 * keeping the previous route on screen while the next one prepares. That alone does not
 * cover a page whose code loads on demand: under one shared `<Suspense>` React keeps
 * the previous page mounted (hidden) until the new page's code arrives. Declare such
 * pages with {@link lazyPage}, which gives each page a boundary of its own. React Router
 * versions without the `useTransitions` prop ignore it.
 *
 * @module
 */

import { type JSX, useEffect, useLayoutEffect } from 'react'
import {
  BrowserRouter as ReactRouterBrowserRouter,
  type BrowserRouterProps as ReactRouterBrowserRouterProps,
  HashRouter as ReactRouterHashRouter,
  type HashRouterProps as ReactRouterHashRouterProps,
  type HistoryRouterProps as ReactRouterHistoryRouterProps,
  matchPath,
  MemoryRouter as ReactRouterMemoryRouter,
  type MemoryRouterProps as ReactRouterMemoryRouterProps,
  Router as ReactRouter,
  type RouterProps as ReactRouterProps,
  RouterProvider as ReactRouterProvider,
  type RouterProviderProps as ReactRouterProviderProps,
  unstable_HistoryRouter as ReactRouterHistoryRouter,
  useLocation,
  useNavigate,
  useResolvedPath,
} from 'react-router'

import type { AuthClient, AuthStatus } from '@molecule/app-auth'
import { get } from '@molecule/app-bond'
import type { HttpClient } from '@molecule/app-http'
import type { Router as MoleculeRouter } from '@molecule/app-routing'

/** The molecule router interface, retained alongside the React Router component value. */
export type Router = MoleculeRouter

interface SignInPathProps {
  /** Path to replace the current location with on a signed-out GET 401. Defaults to `/login`. */
  signInPath?: string | false
}

/** Props for {@link BrowserRouter}, with transitions permanently disabled. */
export type BrowserRouterProps = Omit<ReactRouterBrowserRouterProps, 'useTransitions'> &
  SignInPathProps

/** Props for {@link HashRouter}, with transitions permanently disabled. */
export type HashRouterProps = Omit<ReactRouterHashRouterProps, 'useTransitions'> & SignInPathProps

/** Props for {@link MemoryRouter}, with transitions permanently disabled. */
export type MemoryRouterProps = Omit<ReactRouterMemoryRouterProps, 'useTransitions'> &
  SignInPathProps

/** Props for {@link unstable_HistoryRouter}, with transitions permanently disabled. */
export type HistoryRouterProps = Omit<ReactRouterHistoryRouterProps, 'useTransitions'>

/** Props for {@link Router}, with transitions permanently disabled. */
export type RouterProps = Omit<ReactRouterProps, 'useTransitions'>

/** Props for {@link RouterProvider}, with transitions permanently disabled. */
export type RouterProviderProps = Omit<ReactRouterProviderProps, 'useTransitions'>

// Observe requests before pages mount their effects and drop a pending redirect as the URL commits.
const useRouterEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Handles anonymous 401 responses for the current route after the session is settled.
 *
 * @param props - The router's configured sign-in path.
 * @returns No UI.
 */
function SignInRequired({ signInPath }: { signInPath: string }): null {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname: signInPathname } = useResolvedPath(signInPath)

  useRouterEffect(() => {
    if (matchPath(signInPathname, location.pathname)) return
    // Read the same slots as the client accessors, without loading optional packages or
    // asking HTTP for its unbonded fallback.
    const http = get<HttpClient>('http-client')
    const auth = get<AuthClient>('auth-client')
    if (!http || !auth) return

    let stopWaiting: (() => void) | undefined
    let redirected = false
    const settle = (status: AuthStatus): void => {
      if (status === 'loading') return
      stopWaiting?.()
      stopWaiting = undefined
      if (status !== 'unauthenticated' || redirected) return
      redirected = true
      void navigate(signInPath, { replace: true, state: { from: location } })
    }

    const unsubscribe = http.onAuthError((request) => {
      // Some older transports call the handler without request metadata.
      if (request?.method !== 'GET' || request.sentCredentials !== false || redirected) return
      const { status } = auth.getState()
      if (status !== 'loading') {
        settle(status)
      } else if (!stopWaiting) {
        stopWaiting = auth.subscribe(({ status }) => settle(status))
        settle(auth.getState().status)
      }
    })
    return () => {
      unsubscribe()
      stopWaiting?.()
    }
  }, [location, navigate, signInPath, signInPathname])

  return null
}

/**
 * Browser router that commits the URL and rendered page together.
 *
 * @example
 * ```tsx
 * import { BrowserRouter } from '@molecule/app-routing-react-router'
 *
 * const app = <BrowserRouter><Routes /></BrowserRouter>
 * ```
 */
export function BrowserRouter({
  children,
  signInPath = '/login',
  ...props
}: BrowserRouterProps): JSX.Element {
  return (
    <ReactRouterBrowserRouter {...props} useTransitions={false}>
      {signInPath !== false && <SignInRequired signInPath={signInPath} />}
      {children}
    </ReactRouterBrowserRouter>
  )
}

/**
 * Hash router that commits the URL and rendered page together.
 *
 * @example
 * ```tsx
 * import { HashRouter } from '@molecule/app-routing-react-router'
 *
 * const app = <HashRouter><Routes /></HashRouter>
 * ```
 */
export function HashRouter({
  children,
  signInPath = '/login',
  ...props
}: HashRouterProps): JSX.Element {
  return (
    <ReactRouterHashRouter {...props} useTransitions={false}>
      {signInPath !== false && <SignInRequired signInPath={signInPath} />}
      {children}
    </ReactRouterHashRouter>
  )
}

/**
 * In-memory router that commits its location and rendered page together.
 *
 * @example
 * ```tsx
 * import { MemoryRouter } from '@molecule/app-routing-react-router'
 *
 * const app = <MemoryRouter initialEntries={['/']}><Routes /></MemoryRouter>
 * ```
 */
export function MemoryRouter({
  children,
  signInPath = '/login',
  ...props
}: MemoryRouterProps): JSX.Element {
  return (
    <ReactRouterMemoryRouter {...props} useTransitions={false}>
      {signInPath !== false && <SignInRequired signInPath={signInPath} />}
      {children}
    </ReactRouterMemoryRouter>
  )
}

/**
 * Low-level router that commits its location and rendered page together.
 *
 * @example
 * ```tsx
 * import { Router } from '@molecule/app-routing-react-router'
 *
 * const app = <Router location={location} navigator={navigator}><Routes /></Router>
 * ```
 */
export function Router(props: RouterProps): JSX.Element {
  return <ReactRouter {...props} useTransitions={false} />
}

/**
 * Data-router provider that commits the URL and rendered page together.
 *
 * This is React Router's renderer-neutral provider. In a DOM app, import
 * `RouterProvider` from `@molecule/app-routing-react-router/dom` instead, which
 * supplies `react-dom`'s `flushSync` the way `react-router/dom` does.
 *
 * @example
 * ```tsx
 * import { RouterProvider } from '@molecule/app-routing-react-router'
 *
 * const app = <RouterProvider router={router} flushSync={flushSync} />
 * ```
 */
export function RouterProvider(props: RouterProviderProps): JSX.Element {
  return <ReactRouterProvider {...props} useTransitions={false} />
}

/**
 * History router that commits the URL and rendered page together.
 *
 * @example
 * ```tsx
 * import { unstable_HistoryRouter } from '@molecule/app-routing-react-router'
 *
 * const app = <unstable_HistoryRouter history={history}><Routes /></unstable_HistoryRouter>
 * ```
 */
function HistoryRouter(props: HistoryRouterProps): JSX.Element {
  return <ReactRouterHistoryRouter {...props} useTransitions={false} />
}

export { HistoryRouter as unstable_HistoryRouter }
