<!--
  @component
  `MoleculeRouterProvider`: builds ONE molecule `Router` over the SvelteKit navigation the
  root layout hands in, bonds it as the active singleton (`@molecule/app-routing`'s
  `setRouter`), provides it to the components below — the bond's hooks and
  `@molecule/app-svelte`'s (`useRouterInstance`, `useLocation`, `useParams`, its guards and
  layouts) — and renders `children`.

  React's `MoleculeRouterProvider` in Svelte's idiom: mount it once in the root layout,
  around the rendered page. Core `navigate()` / `getRouter()` drive this router because of
  the bond. SvelteKit gives a layout its page as `children`, so the bond provides no routed
  view: `@molecule/app-svelte`'s `RoutedView` throws and says to render `children`.

  A provider inside another, given the same `navigation`, uses the outer one's router, as
  React's provider joins the router above it: it registers its `routes` there and calls
  `onRouterReady` once with that router; the outer provider's `signInPath` applies.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setRouter } from '@molecule/app-routing'
  import { setRouterContext } from '@molecule/app-svelte'

  import { createSvelteKitRouter } from './provider.js'
  import type { MoleculeRouterProviderProps } from './provider-props.js'
  import { provideMoleculeRouter, readMoleculeProvider } from './router-context.js'

  let { navigation, routes, onRouterReady, signInPath, children }: MoleculeRouterProviderProps =
    $props()

  // Initial props are read once, on purpose (`untrack`): the router is built once, during this
  // component's initialisation, the way React's provider builds it in a state initializer, so
  // its subscribers and guards survive for the provider's whole mounted life.
  const initial = untrack(() => ({ navigation, routes, signInPath }))
  const outer = readMoleculeProvider()
  const joined = outer !== undefined && outer.navigation === initial.navigation

  const router = joined
    ? outer.router
    : createSvelteKitRouter(initial.navigation, {
        routes: initial.routes,
        signInPath: initial.signInPath,
      })

  if (joined) {
    if (initial.routes) router.registerRoutes(initial.routes)
  } else {
    // Bonded first, so `onRouterReady` and the page below see a router `getRouter()` returns.
    setRouter(router)
    provideMoleculeRouter({ router, navigation: initial.navigation })
    setRouterContext(router, {})
  }
  untrack(() => onRouterReady?.(router))

  // A later routes array registers onto THIS router instead of replacing it, as React's
  // provider does.
  let registeredRoutes = initial.routes
  $effect(() => {
    if (routes === registeredRoutes) return
    registeredRoutes = routes
    router.registerRoutes(routes ?? [])
  })
</script>

{@render children()}
