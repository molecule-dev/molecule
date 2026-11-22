/**
 * React Router components with transitions turned off.
 *
 * Each wrapper renders React Router's own router with `useTransitions={false}`, so a
 * navigation renders the new route in the same commit that changes the URL instead of
 * keeping the previous route on screen while the next one prepares. Each also gives the app
 * its molecule router: the router components render `MoleculeRouterProvider` around their
 * children, and `RouterProvider` builds the molecule router from the data router it is given,
 * so `@molecule/app-react`'s routing hooks and `RoutedView` work under any of them. That alone does not
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

import type { AuthClient } from '@molecule/app-auth'
import { get } from '@molecule/app-bond'
import type { HttpClient } from '@molecule/app-http'
import {
  DEFAULT_SIGN_IN_PATH,
  type Router as MoleculeRouter,
  watchSignedOutRejection,
} from '@molecule/app-routing'

import { ProvideDataRouter } from './data-router.js'
import { MoleculeRouterProvider } from './hooks.js'

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
 * Handles anonymous 401 responses for the current route after the session is settled, by
 * `@molecule/app-routing`'s `watchSignedOutRejection` (the rule every routing bond shares).
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
    return watchSignedOutRejection({ http, session: auth }, () => {
      void navigate(signInPath, { replace: true, state: { from: location } })
    })
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
  signInPath = DEFAULT_SIGN_IN_PATH,
  ...props
}: BrowserRouterProps): JSX.Element {
  return (
    <ReactRouterBrowserRouter {...props} useTransitions={false}>
      <MoleculeRouterProvider>
        {signInPath !== false && <SignInRequired signInPath={signInPath} />}
        {children}
      </MoleculeRouterProvider>
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
  signInPath = DEFAULT_SIGN_IN_PATH,
  ...props
}: HashRouterProps): JSX.Element {
  return (
    <ReactRouterHashRouter {...props} useTransitions={false}>
      <MoleculeRouterProvider>
        {signInPath !== false && <SignInRequired signInPath={signInPath} />}
        {children}
      </MoleculeRouterProvider>
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
  signInPath = DEFAULT_SIGN_IN_PATH,
  ...props
}: MemoryRouterProps): JSX.Element {
  return (
    <ReactRouterMemoryRouter {...props} useTransitions={false}>
      <MoleculeRouterProvider>
        {signInPath !== false && <SignInRequired signInPath={signInPath} />}
        {children}
      </MoleculeRouterProvider>
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
export function Router({ children, ...props }: RouterProps): JSX.Element {
  return (
    <ReactRouter {...props} useTransitions={false}>
      <MoleculeRouterProvider>{children}</MoleculeRouterProvider>
    </ReactRouter>
  )
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
  return (
    <ProvideDataRouter dataRouter={props.router}>
      <ReactRouterProvider {...props} useTransitions={false} />
    </ProvideDataRouter>
  )
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
function HistoryRouter({ children, ...props }: HistoryRouterProps): JSX.Element {
  return (
    <ReactRouterHistoryRouter {...props} useTransitions={false}>
      <MoleculeRouterProvider>{children}</MoleculeRouterProvider>
    </ReactRouterHistoryRouter>
  )
}

export { HistoryRouter as unstable_HistoryRouter }
