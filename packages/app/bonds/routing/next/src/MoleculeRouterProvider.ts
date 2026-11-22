/**
 * `MoleculeRouterProvider` for the Next.js App Router: the component that gives
 * `@molecule/app-react` the router, as the React Router bond's does.
 *
 * @module
 */

import { createContext, createElement, type ReactNode, useContext, useEffect, useRef } from 'react'

import { RouterProvider } from '@molecule/app-react'
import type { RouteDefinition, Router } from '@molecule/app-routing'

import { useMoleculeRouter } from './hooks.js'
import type { NextRouterConfig } from './types.js'

/** The router of the outermost provider, so a provider inside it joins it. */
const NextMoleculeRouterContext = createContext<Router | null>(null)

/** The route arrays each router has registered, so a joined provider registers each once. */
const registeredRouteArrays = new WeakMap<Router, Set<RouteDefinition[]>>()

/**
 * Registers `routes` on `router` the first time this array is seen.
 *
 * @param router - The router.
 * @param routes - Route definitions.
 */
const registerRoutesOnce = (router: Router, routes: RouteDefinition[]): void => {
  const registered = registeredRouteArrays.get(router) ?? new Set<RouteDefinition[]>()
  registeredRouteArrays.set(router, registered)
  if (registered.has(routes)) return
  registered.add(routes)
  router.registerRoutes(routes)
}

/**
 * Props of {@link MoleculeRouterProvider}: the values of the `next/navigation` hooks, as
 * `useMoleculeRouter` takes them, plus the provider's own.
 */
export interface MoleculeRouterProviderProps extends NextRouterConfig {
  /** The app below the provider. */
  children?: ReactNode

  /**
   * Called once with the router, after it is bonded (to add guards, say). A provider inside
   * another passes it the outer provider's router.
   */
  onRouterReady?: (router: Router) => void
}

/**
 * Calls `onRouterReady` once per router, with the callback of the render that first saw it.
 *
 * @param router - The router.
 * @param onRouterReady - The provider's callback.
 */
function useRouterReady(
  router: Router,
  onRouterReady: ((router: Router) => void) | undefined,
): void {
  const readyRouter = useRef<Router | null>(null)
  useEffect(() => {
    // A later callback identity is not a new router.
    if (readyRouter.current === router) return
    readyRouter.current = router
    onRouterReady?.(router)
  }, [router, onRouterReady])
}

/**
 * A provider inside another: its routes go on the outer router, registered as it renders so
 * the children's first render can navigate by name, and `onRouterReady` gets the outer router.
 *
 * @param props - The provider props, with the outer provider's router.
 * @returns The children.
 */
function JoinedRouter(props: MoleculeRouterProviderProps & { router: Router }): ReactNode {
  const { router, routes, onRouterReady, children } = props
  if (routes && routes.length > 0) registerRoutesOnce(router, routes)
  useRouterReady(router, onRouterReady)
  return children
}

/**
 * The outermost provider: builds the router over the `next/navigation` values, bonds it and
 * provides it.
 *
 * @param props - The provider props.
 * @returns The providers around the children.
 */
function OwnedRouter(props: MoleculeRouterProviderProps): ReactNode {
  const { children, onRouterReady, ...config } = props
  const router = useMoleculeRouter(config)
  useRouterReady(router, onRouterReady)

  const createdWith = useRef(config.routes)
  useEffect(() => {
    // The routes the router was created with are already registered; a later array
    // registers onto THIS router instead of replacing it.
    if (!config.routes || createdWith.current === config.routes) return
    createdWith.current = config.routes
    registerRoutesOnce(router, config.routes)
  }, [config.routes, router])

  return createElement(
    NextMoleculeRouterContext.Provider,
    { value: router },
    // Next has no outlet: a layout gets its page as `children`, so there is no routed view,
    // and `RoutedView` throws an error saying so.
    createElement(RouterProvider, { router, children }),
  )
}

/**
 * Builds the molecule `Router` over the Next.js App Router, bonds it as `@molecule/app-routing`'s
 * router (as `useMoleculeRouter` does) and gives it to `@molecule/app-react`, whose routing
 * hooks (`useRouter`, `useLocation`, `useParams`, `useNavigate`, …) then read it. Render it in a
 * `'use client'` component near the root layout, with the values of the `next/navigation` hooks.
 *
 * Next has no outlet: a layout receives its page as `children`, so pass the page to the
 * molecule layouts and guards as children (`<AuthGuard>{children}</AuthGuard>`).
 * `<RoutedView />` throws under this bond instead of rendering a blank page.
 *
 * A provider inside another creates no second router: it registers its `routes` on the outer
 * one and calls `onRouterReady` with it, as the React Router bond's does.
 *
 * @param props - The `next/navigation` values, `routes`, `onRouterReady` and `children`.
 * @returns The providers around the children.
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
 * import { MoleculeRouterProvider } from '@molecule/app-routing-next'
 *
 * export function Providers({ children }: { children: React.ReactNode }) {
 *   return (
 *     <MoleculeRouterProvider
 *       navigation={useRouter()}
 *       pathname={usePathname()}
 *       searchParams={Object.fromEntries(useSearchParams())}
 *       params={useParams()}
 *     >
 *       {children}
 *     </MoleculeRouterProvider>
 *   )
 * }
 * ```
 */
export function MoleculeRouterProvider(props: MoleculeRouterProviderProps): ReactNode {
  const outer = useContext(NextMoleculeRouterContext)
  return outer
    ? createElement(JoinedRouter, { ...props, router: outer })
    : createElement(OwnedRouter, props)
}
