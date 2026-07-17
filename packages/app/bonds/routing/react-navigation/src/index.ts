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
 * import { useMoleculeRouter } from '@molecule/app-routing-react-navigation'
 *
 * const navigationRef = createNavigationContainerRef()
 * const linking = { screens: { Home: '/', Profile: '/users/:id' } }
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   // useMoleculeRouter bonds the adapter automatically (setRouter in an effect), so
 *   // @molecule/app-routing's navigate() drives THIS native navigator.
 *   useMoleculeRouter({ navigationRef, linking })
 *
 *   return (
 *     <NavigationContainer ref={navigationRef}>
 *       {children}
 *     </NavigationContainer>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **`useMoleculeRouter({ navigationRef, linking })` bonds the router for you.** It
 *   calls `@molecule/app-routing`'s `setRouter` in an effect, so molecule-driven
 *   `navigate()` reaches React Navigation. If you instead build the adapter yourself
 *   with `createReactNavigationRouter`, bond it on the container's `onReady`
 *   (`onReady={() => setRouter(router)}`) — otherwise `@molecule/app-routing`
 *   auto-creates a fallback router and molecule-driven navigation silently goes
 *   nowhere on device.
 * - **`navigationRef` is required for anything useful.** Without the ref wired to
 *   `<NavigationContainer>`, `getLocation()` always returns `/`, `subscribe()` never
 *   fires, and `navigate()` cannot dispatch. Create it with
 *   `createNavigationContainerRef()` and pass the SAME ref to both the container and
 *   `useMoleculeRouter`/`createReactNavigationRouter`.
 * - **The `linking.screens` map is the URL↔screen bridge** — molecule paths like
 *   `/users/:id` only resolve to screens listed there (and vice versa for
 *   `getLocation()`).
 * - Navigation guards (`addGuard`) intercept only molecule-initiated `navigate()` /
 *   `navigateTo()` calls — navigations dispatched directly through React Navigation
 *   (taps on native navigators) bypass them; route-change listeners still fire.
 *
 * @module
 */

export { useMoleculeRouter } from './hooks.js'
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
