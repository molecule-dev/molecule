/**
 * React (Native) hook that builds a React Navigation-backed molecule Router and
 * bonds it as the active singleton.
 *
 * @module
 */

import { useEffect, useMemo } from 'react'

import { type Router, setRouter } from '@molecule/app-routing'

import { createReactNavigationRouter } from './provider.js'
import type { ReactNavigationConfig } from './types.js'

/**
 * Builds the molecule Router from a React Navigation config AND bonds it via
 * `@molecule/app-routing`'s `setRouter`, so `navigate()`/`getRouter()` drive the REAL
 * native navigator (not the core's auto-created fallback router).
 *
 * Call it once near the app root (inside the tree that owns the `navigationRef`). It
 * bonds in an effect on mount and re-bonds if the config identity changes; on unmount
 * (or re-create) it tears down the router's React Navigation state listener.
 *
 * Pass the SAME `navigationRef` (from `createNavigationContainerRef()`) that is wired
 * to `<NavigationContainer ref={navigationRef}>`.
 *
 * @param config - React Navigation configuration (`navigationRef`, `linking`, `routes`).
 * @returns The bonded molecule Router.
 *
 * @example
 * ```tsx
 * import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native'
 * import { useMoleculeRouter } from '@molecule/app-routing-react-navigation'
 *
 * const navigationRef = createNavigationContainerRef()
 * const linking = { screens: { Home: '/', Profile: '/users/:id' } }
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   // Bonds automatically — molecule packages' navigate() now drive React Navigation.
 *   useMoleculeRouter({ navigationRef, linking })
 *
 *   return (
 *     <NavigationContainer ref={navigationRef}>
 *       {children}
 *     </NavigationContainer>
 *   )
 * }
 * ```
 */
export function useMoleculeRouter(config: ReactNavigationConfig): Router {
  const { navigationRef, linking, routes } = config

  const router = useMemo(
    () => createReactNavigationRouter({ navigationRef, linking, routes }),
    [navigationRef, linking, routes],
  )

  useEffect(() => {
    // Bond THIS adapter so @molecule/app-routing's navigate()/getRouter() drive the
    // real React Navigation navigator instead of the core's fallback router.
    setRouter(router)
    return () => {
      router.destroy()
    }
  }, [router])

  return router
}
