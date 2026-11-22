/**
 * DOM routers with transitions turned off: the data-router provider and the
 * framework-mode hydrated router. The provider also gives the app its molecule router, built
 * from the data router it is given.
 *
 * Imported from `@molecule/app-routing-react-router/dom`, kept apart from the main
 * entry because `react-router/dom` needs `react-dom`, which the main entry does not.
 *
 * @module
 */

import type { ComponentProps, JSX } from 'react'
import {
  HydratedRouter as ReactRouterHydratedRouter,
  RouterProvider as ReactRouterDomProvider,
  type RouterProviderProps as ReactRouterDomProviderProps,
} from 'react-router/dom'

import { ProvideDataRouter } from './data-router.js'

/** Props for the DOM {@link RouterProvider}, with transitions permanently disabled. */
export type RouterProviderProps = Omit<ReactRouterDomProviderProps, 'useTransitions'>

/**
 * Props for {@link HydratedRouter}, with transitions permanently disabled. Read from the
 * component itself because `react-router/dom` 7.0.0 exports no `HydratedRouterProps`
 * type, and this package supports every 7.x release.
 */
export type HydratedRouterProps = Omit<
  ComponentProps<typeof ReactRouterHydratedRouter>,
  'useTransitions'
>

/**
 * DOM data-router provider (`react-router/dom`'s, which supplies `react-dom`'s
 * `flushSync`) that renders each navigation in the same commit as the URL change, with the
 * molecule router built from the data router (`@molecule/app-react`'s routing hooks and
 * `RoutedView` read it).
 *
 * @param props - The provider's props, without `useTransitions`.
 * @returns React Router's DOM provider with `useTransitions={false}`.
 *
 * @example
 * ```tsx
 * import { createBrowserRouter } from 'react-router'
 * import { RouterProvider } from '@molecule/app-routing-react-router/dom'
 *
 * const app = <RouterProvider router={createBrowserRouter(routes)} />
 * ```
 */
export function RouterProvider(props: RouterProviderProps): JSX.Element {
  return (
    <ProvideDataRouter dataRouter={props.router}>
      <ReactRouterDomProvider {...props} useTransitions={false} />
    </ProvideDataRouter>
  )
}

/**
 * Framework-mode hydrated router that commits the URL and rendered page together. It takes
 * no router to build the molecule router from: mount `MoleculeRouterProvider` in the root
 * route (`root.tsx`), around its `<Outlet />`, so `@molecule/app-react`'s routing hooks and
 * `RoutedView` work.
 *
 * @param props - The hydrated router's props, without `useTransitions`.
 * @returns React Router's `HydratedRouter` with `useTransitions={false}`.
 *
 * @example
 * ```tsx
 * import { HydratedRouter } from '@molecule/app-routing-react-router/dom'
 *
 * const app = <HydratedRouter />
 * ```
 */
export function HydratedRouter(props: HydratedRouterProps): JSX.Element {
  return <ReactRouterHydratedRouter {...props} useTransitions={false} />
}
