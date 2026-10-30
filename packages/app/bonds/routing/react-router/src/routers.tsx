/**
 * React Router components with synchronous navigation commits.
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
  unstable_HistoryRouter as ReactRouterHistoryRouter,
} from 'react-router'
import {
  HydratedRouter as ReactRouterHydratedRouter,
  type HydratedRouterProps as ReactRouterHydratedRouterProps,
  RouterProvider as ReactRouterProvider,
  type RouterProviderProps as ReactRouterProviderProps,
} from 'react-router/dom'

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

/** Props for {@link HydratedRouter}, with transitions permanently disabled. */
export type HydratedRouterProps = Omit<ReactRouterHydratedRouterProps, 'useTransitions'>

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
 * DOM data-router provider that commits the URL and rendered page together.
 *
 * @example
 * ```tsx
 * import { RouterProvider } from '@molecule/app-routing-react-router'
 *
 * const app = <RouterProvider router={router} />
 * ```
 */
export function RouterProvider(props: RouterProviderProps): JSX.Element {
  return <ReactRouterProvider {...props} useTransitions={false} />
}

/**
 * Framework-mode hydrated router that commits the URL and rendered page together.
 *
 * @example
 * ```tsx
 * import { HydratedRouter } from '@molecule/app-routing-react-router'
 *
 * const app = <HydratedRouter />
 * ```
 */
export function HydratedRouter(props: HydratedRouterProps): JSX.Element {
  return <ReactRouterHydratedRouter {...props} useTransitions={false} />
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
