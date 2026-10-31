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

import type { JSX } from 'react'
import {
  BrowserRouter as ReactRouterBrowserRouter,
  type BrowserRouterProps as ReactRouterBrowserRouterProps,
  HashRouter as ReactRouterHashRouter,
  type HashRouterProps as ReactRouterHashRouterProps,
  type HistoryRouterProps as ReactRouterHistoryRouterProps,
  MemoryRouter as ReactRouterMemoryRouter,
  type MemoryRouterProps as ReactRouterMemoryRouterProps,
  Router as ReactRouter,
  type RouterProps as ReactRouterProps,
  RouterProvider as ReactRouterProvider,
  type RouterProviderProps as ReactRouterProviderProps,
  unstable_HistoryRouter as ReactRouterHistoryRouter,
} from 'react-router'

import type { Router as MoleculeRouter } from '@molecule/app-routing'

/** The molecule router interface, retained alongside the React Router component value. */
export type Router = MoleculeRouter

/** Props for {@link BrowserRouter}, with transitions permanently disabled. */
export type BrowserRouterProps = Omit<ReactRouterBrowserRouterProps, 'useTransitions'>

/** Props for {@link HashRouter}, with transitions permanently disabled. */
export type HashRouterProps = Omit<ReactRouterHashRouterProps, 'useTransitions'>

/** Props for {@link MemoryRouter}, with transitions permanently disabled. */
export type MemoryRouterProps = Omit<ReactRouterMemoryRouterProps, 'useTransitions'>

/** Props for {@link unstable_HistoryRouter}, with transitions permanently disabled. */
export type HistoryRouterProps = Omit<ReactRouterHistoryRouterProps, 'useTransitions'>

/** Props for {@link Router}, with transitions permanently disabled. */
export type RouterProps = Omit<ReactRouterProps, 'useTransitions'>

/** Props for {@link RouterProvider}, with transitions permanently disabled. */
export type RouterProviderProps = Omit<ReactRouterProviderProps, 'useTransitions'>

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
export function BrowserRouter(props: BrowserRouterProps): JSX.Element {
  return <ReactRouterBrowserRouter {...props} useTransitions={false} />
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
export function HashRouter(props: HashRouterProps): JSX.Element {
  return <ReactRouterHashRouter {...props} useTransitions={false} />
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
export function MemoryRouter(props: MemoryRouterProps): JSX.Element {
  return <ReactRouterMemoryRouter {...props} useTransitions={false} />
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
