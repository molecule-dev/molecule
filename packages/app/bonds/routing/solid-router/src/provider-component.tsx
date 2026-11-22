/**
 * `MoleculeRouterProvider`: the Solid component that bonds ONE molecule Router over the
 * mounted Solid Router for its whole life, under React's component name.
 *
 * @module
 */

import { createEffect, type JSX, onCleanup, useContext } from 'solid-js'

import type { RouteDefinition, Router } from '@molecule/app-routing'
import { setRouter } from '@molecule/app-routing'
import { RouterProvider } from '@molecule/app-solid'

import { MoleculeRouterContext } from './context.js'
import { createSolidRouter } from './provider.js'
import type { SolidMemoryHistory } from './types.js'

/**
 * Props for {@link MoleculeRouterProvider}, the same as React's provider plus the memory
 * history a Solid memory router needs (React Router supplies it itself).
 */
export interface MoleculeRouterProviderProps {
  /**
   * Child components, rendered inside the router context the hooks read.
   */
  children: JSX.Element

  /**
   * Optional route definitions for named routes.
   */
  routes?: RouteDefinition[]

  /**
   * Callback when router is ready: called once with the bonded router.
   */
  onRouterReady?: (router: Router) => void

  /**
   * The memory history the `<MemoryRouter history={…}>` above this provider uses, from
   * `createSolidMemoryHistory`. Browser routers (`<Router>`, `<HashRouter>`) need none:
   * their entries live in `history.state`. It is required for a memory router to report
   * each entry's state and key.
   */
  history?: SolidMemoryHistory

  /**
   * Path to replace the current location with on a signed-out GET 401. Defaults to
   * `/login`; `false` turns the redirect off.
   */
  signInPath?: string | false
}

/**
 * Provider component that creates ONE molecule Router over the Solid Router the call sits
 * inside, for its whole mounted life, and bonds it as the active singleton via
 * `@molecule/app-routing`'s `setRouter`. Subscribers and guards registered on the router
 * survive navigation: `@molecule/app-routing`'s `getRouter()` keeps returning it,
 * `onRouterReady` fires once, and Solid Router's own links and the back button reach
 * `router.subscribe()`.
 *
 * Bonding happens while the component renders, before its children, so a page's first
 * render already reads this router — no manual `setRouter` wiring required. It also renders
 * `@molecule/app-solid`'s `RouterProvider` with the router, so that binding's routing
 * primitives read it. It provides no routed view: Solid Router gives a route's component its
 * nested route as `props.children`, so a layout or guard used as a route component gets its
 * page as children. Mount it as the router's `root` (as in the example). The bond's own
 * routing hooks work without it. A `MoleculeRouterProvider` inside another one uses the outer
 * one's router: it registers its `routes` there and calls `onRouterReady` with it.
 *
 * @param props - The provider props (see {@link MoleculeRouterProviderProps}): `children`
 *   (rendered inside the router context), `routes` (optional named-route definitions; pass
 *   a stable array — later identities register onto the same router), `onRouterReady`
 *   (optional callback invoked ONCE with the router after it is bonded, e.g. to register
 *   guards), `history` (the memory history the mounted `<MemoryRouter>` uses) and `signInPath`
 *   (the sign-in path a signed-out GET 401 sends the visitor to; `false` turns it off).
 * @returns The rendered provider wrapping children with the router context.
 * @example
 * ```tsx
 * import { MemoryRouter, Route } from '@solidjs/router'
 * import { createSolidMemoryHistory } from '@molecule/app-routing-solid-router'
 *
 * const memory = createSolidMemoryHistory(['/'])
 *
 * <MemoryRouter history={memory} root={(props) => (
 *   <MoleculeRouterProvider history={memory}>
 *     {props.children}
 *   </MoleculeRouterProvider>
 * )}>
 *   <Route path="/" component={Home} />
 *   <Route path="/users/:id" component={UserProfile} />
 * </MemoryRouter>
 * ```
 */
export function MoleculeRouterProvider(props: MoleculeRouterProviderProps): JSX.Element {
  // One router per Solid Router tree: a second provider would bond (setRouter) a second one
  // over the first, and the subscribers and guards registered on each would split.
  const outer = useContext(MoleculeRouterContext)
  if (outer) return <JoinedRouter {...props} router={outer} />

  const router = createSolidRouter({
    routes: props.routes,
    history: props.history,
    signInPath: props.signInPath,
  })

  // Bonded once per router while rendering, before children: `@molecule/app-routing`'s
  // navigate()/getRouter() drive THIS real Solid Router adapter for the provider's whole life.
  setRouter(router)

  // Once per router: a later callback identity is not a new router.
  props.onRouterReady?.(router)

  registerLaterRoutes(router, () => props.routes, props.routes)

  onCleanup(() => router.destroy())

  return (
    <MoleculeRouterContext.Provider value={router}>
      <RouterProvider router={router}>{props.children}</RouterProvider>
    </MoleculeRouterContext.Provider>
  )
}

/**
 * A provider inside another: registers its routes on the outer provider's router and calls
 * `onRouterReady` with it once.
 *
 * @param props - The provider props, with the outer provider's router.
 * @returns The children, under the outer provider's contexts.
 */
function JoinedRouter(props: MoleculeRouterProviderProps & { router: Router }): JSX.Element {
  const { router } = props
  if (props.routes) router.registerRoutes(props.routes)
  props.onRouterReady?.(router)
  registerLaterRoutes(router, () => props.routes, props.routes)
  return <>{props.children}</>
}

/**
 * Registers each later `routes` array onto `router`: the routes it started with are already
 * registered, and a later array adds to them instead of replacing them.
 *
 * @param router - The router.
 * @param routes - Reads the provider's current `routes` prop.
 * @param initial - The array already registered.
 */
function registerLaterRoutes(
  router: Router,
  routes: () => RouteDefinition[] | undefined,
  initial: RouteDefinition[] | undefined,
): void {
  let registered = initial
  createEffect(() => {
    const current = routes()
    if (current === undefined || current === registered) return
    registered = current
    router.registerRoutes(current)
  })
}
