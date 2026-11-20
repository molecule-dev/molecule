/**
 * SvelteKit provider for the molecule `Router` (`@molecule/app-routing`).
 *
 * SvelteKit's client router is reachable only inside a SvelteKit app, through the
 * virtual modules `$app/navigation`, `$app/state` and `$app/paths`, which a package
 * cannot import. So the app passes those functions in — a {@link SvelteKitNavigation} —
 * and this bond never imports `$app/*`.
 *
 * Mount `MoleculeRouterProvider` ONCE in the root layout, around the rendered page. It
 * builds one molecule `Router` over the app's SvelteKit navigation, calls
 * `@molecule/app-routing`'s `setRouter` with it, and supplies it to the components below.
 * `useMoleculeRouter`, `useMoleculeQuery`, `useMoleculeNavigate` and `useIsActive` read
 * that router, and core `navigate()` / `getRouter()` drive the same one — kit links,
 * `goto` and the back button all notify the same subscribers.
 *
 * With HTTP and auth clients bonded, the router `MoleculeRouterProvider` builds
 * replaces the current URL with `/login` after a credential-free GET receives a 401 and
 * the session is confirmed signed out, as React's `BrowserRouter` does. `location.state.from`
 * holds the original location. Set `signInPath` to use a different sign-in route or pass
 * `signInPath={false}` to opt out.
 *
 * @example
 * ```svelte
 * <!-- src/routes/+layout.svelte -->
 * <script lang="ts">
 *   import { afterNavigate, goto } from '$app/navigation'
 *   import { resolve } from '$app/paths'
 *   import { page } from '$app/state'
 *   import { createSvelteKitNavigation, MoleculeRouterProvider } from '@molecule/app-routing-sveltekit'
 *
 *   // `afterNavigate` must be called during component initialisation, so build the
 *   // navigation here, in the root layout, once. `resolve('/')` gives the bond the base
 *   // path (or `#` under hash routing) kit's `goto` and links need.
 *   const navigation = createSvelteKitNavigation({ goto, page, afterNavigate, rootHref: resolve('/') })
 * </script>
 *
 * <MoleculeRouterProvider {navigation}>
 *   {@render children()}
 * </MoleculeRouterProvider>
 * ```
 *
 * @example
 * ```svelte
 * <!-- src/routes/orders/+page.svelte -->
 * <script lang="ts">
 *   import { useIsActive, useMoleculeNavigate, useMoleculeQuery } from '@molecule/app-routing-sveltekit'
 *
 *   const navigate = useMoleculeNavigate()
 *   const query = useMoleculeQuery()
 *   const isOpenActive = useIsActive('/orders', false)
 * </script>
 *
 * <p>Page: {$query.page}</p>
 * <button onclick={() => navigate('/orders', { replace: true })}>Reset</button>
 * <a href="/orders" class={$isOpenActive ? 'active' : ''}>All orders</a>
 * ```
 *
 * @remarks
 * - **The provider calls `setRouter`.** On initialisation it bonds the router it built, so
 *   other molecule packages' `navigate()`/`getRouter()` drive SvelteKit's client router
 *   instead of pushing `window.history` behind kit's back. `onRouterReady` receives that
 *   router once, after the bond exists; changing the callback later does not call it again.
 * - **Kit 3.** The bond drives kit 3's `goto` options (`replace`, `persistState`) and
 *   `$app/state`'s `page`; a kit 2 app uses `@molecule/app-routing-sveltekit` 1.x.
 * - **Read the location through the router, not `page`.** Molecule packages see
 *   `getLocation()`/`subscribe()`, with paths inside the app (no base, no `#`);
 *   `router.createHref(path)` is the href kit's links carry.
 * - **The exported `provider` constant is NOT for SvelteKit apps** — it is the core
 *   browser-history router, for molecule code outside SvelteKit. Wiring it in a SvelteKit
 *   app moves history behind kit's back.
 * - **The hooks are component-initialisation hooks**, as React's are render hooks: Svelte
 *   reads context then, so call them in a component's `<script>`, never in a module, an
 *   event handler or an async callback.
 * - **`@molecule/app-svelte`'s router hooks are a separate context.** That package's
 *   `useRouter`, `useListRoute` and `useConsumedSearchParam` read the router a
 *   `setMoleculeContext({ router })` call supplies, which this provider does not set; the
 *   hooks this bond exports read the provider's own context and need nothing extra. An app
 *   that uses those hooks too builds the router in the layout itself and supplies it there,
 *   as the bond's layout example did before the provider existed:
 *
 *   ```svelte
 *   <script lang="ts">
 *     import { afterNavigate, goto } from '$app/navigation'
 *     import { resolve } from '$app/paths'
 *     import { page } from '$app/state'
 *     import { setRouter } from '@molecule/app-routing'
 *     import { setMoleculeContext } from '@molecule/app-svelte'
 *     import { createSvelteKitNavigation, createSvelteKitRouter } from '@molecule/app-routing-sveltekit'
 *
 *     const navigation = createSvelteKitNavigation({ goto, page, afterNavigate, rootHref: resolve('/') })
 *     const router = createSvelteKitRouter(navigation)
 *     setRouter(router)
 *     setMoleculeContext({ router })
 *   </script>
 *   ```
 *
 *   The provider's `onRouterReady` runs during the provider's initialisation, so a context
 *   set from it would reach the provider's children; this bond does not depend on
 *   `@molecule/app-svelte` and its test app does not exercise that hand-off, so the snippet
 *   above supplies the context the way the bond's docs did before this provider existed.
 * - Navigation state is `page.state`, so it must be an object; kit's own `sveltekit:*`
 *   history keys are stripped from `getLocation().state`.
 *
 * @module
 */

export * from './list-route-nav.js'
export * from './list-types.js'
export { default as MoleculeRouterProvider } from './MoleculeRouterProvider.svelte'
export * from './provider.js'
export * from './provider-props.js'
export * from './types.js'
export * from './useConsumedSearchParam.js'
export * from './useIsActive.js'
export * from './useListRoute.js'
export * from './useMoleculeNavigate.js'
export * from './useMoleculeQuery.js'
export * from './useMoleculeRouter.js'
export * from './utilities.js'
