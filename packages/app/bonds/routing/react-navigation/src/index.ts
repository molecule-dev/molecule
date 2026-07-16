/**
 * React Navigation routing provider for molecule.dev.
 *
 * Adapts React Navigation (React Native) to the molecule `Router` interface from
 * `@molecule/app-routing` by translating between URL-style paths (molecule's model)
 * and screen names (React Navigation's model) via a linking configuration.
 *
 * @example
 * ```tsx
 * import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native'
 * import { setRouter } from '@molecule/app-routing'
 * import { createReactNavigationRouter } from '@molecule/app-routing-react-navigation'
 *
 * const navigationRef = createNavigationContainerRef()
 *
 * const router = createReactNavigationRouter({
 *   navigationRef,
 *   linking: {
 *     screens: {
 *       Home: '/',
 *       Profile: '/users/:id',
 *     },
 *   },
 * })
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   // onReady re-bonds once the container is live; children = your navigators/screens
 *   return (
 *     <NavigationContainer ref={navigationRef} onReady={() => setRouter(router)}>
 *       {children}
 *     </NavigationContainer>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **`navigationRef` is required for anything useful.** Without the ref wired to
 *   `<NavigationContainer>`, `getLocation()` always returns `/`, `subscribe()` never
 *   fires, and `navigate()` cannot dispatch. Create it with
 *   `createNavigationContainerRef()` and pass the SAME ref to both the container and
 *   `createReactNavigationRouter`.
 * - **The `linking.screens` map is the URL↔screen bridge** — molecule paths like
 *   `/users/:id` only resolve to screens listed there (and vice versa for
 *   `getLocation()`).
 * - Navigation guards (`addGuard`) intercept only molecule-initiated `navigate()` /
 *   `navigateTo()` calls — navigations dispatched directly through React Navigation
 *   (taps on native navigators) bypass them; route-change listeners still fire.
 * - **Forgotten wiring never errors**: `@molecule/app-routing` auto-creates a
 *   fallback router, so molecule-driven navigation silently goes nowhere on device —
 *   wire at startup (the `onReady` above re-bonds once the container is live).
 *
 * @module
 */

export { createReactNavigationRouter } from './provider.js'
export type { NavigationRef, NavigationState, ReactNavigationConfig } from './types.js'
export {
  generatePath,
  matchPath,
  parseSearchString,
  resolvePathFromScreen,
  resolveScreenFromPath,
  stringifyQuery,
} from './utilities.js'

// Re-export core types
export type {
  GuardResult,
  NavigateOptions,
  NavigationGuard,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
  RouterConfig,
} from '@molecule/app-routing'
